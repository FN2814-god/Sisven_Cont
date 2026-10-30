import {
  BadRequestException, Injectable,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SalesBook } from '../../entities/fiscal.entity';
import { JournalService } from '../accounting/journal.service';
import { AutomaticJournalGenerator, STANDARD_ACCOUNTS } from '../../shared/accounting/automatic-journal-generator';
import { JournalEntryDto, JournalEntryLineDto } from '../../shared/accounting/types';
import { BcvExchangeService } from '../../shared/seniat/bcv-service';
import { RifValidator } from '../../shared/seniat/rif-validator';

export interface CreateSaleDto {
  fecha_factura?: string;
  rif_comprador: string;
  nombre_comprador: string;
  numero_factura?: string;
  numero_control?: string;
  /** Moneda en que se expresan los montos de entrada */
  amounts_in: 'USD' | 'VES';
  base_imponible: number;
  ventas_exentas?: number;
  /** CONTADO: cobro inmediato (caja/banco) | CREDITO: cuenta por cobrar */
  condicion: 'CONTADO' | 'CREDITO';
  /** En contado: moneda del cobro (USD aplica IGTF 3%) */
  cobro_en?: 'USD' | 'VES';
  igtf_percibido_3?: number;
  iva_retenido_terceros?: number;
  bcv_exchange_rate: number;
}

@Injectable()
export class SalesService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(SalesBook) private readonly sales: Repository<SalesBook>,
    private readonly journal: JournalService,
  ) {}

  list(tenantId: string, year?: number, period?: number) {
    const where: any = { tenant_id: tenantId };
    if (year) where.fiscal_year = year;
    if (period) where.fiscal_period = period;
    return this.sales.find({ where, order: { numero_operacion: 'DESC' }, take: 500 });
  }

  async create(tenantId: string, userId: string, dto: CreateSaleDto) {
    if (!RifValidator.isValid(dto.rif_comprador)) {
      throw new BadRequestException(`RIF del comprador inválido: ${dto.rif_comprador}`);
    }
    const rate = dto.bcv_exchange_rate;
    if (!rate || rate <= 0) throw new BadRequestException('Tasa BCV inválida');
    const dateStr = dto.fecha_factura || new Date().toISOString().substring(0, 10);
    const condicion = dto.condicion ?? 'CONTADO';
    const cobroEn = dto.cobro_en ?? 'USD';

    // Normalización bimoneda (los libros fiscales se llevan en VES, PA 00093)
    const baseVes = dto.amounts_in === 'USD'
      ? BcvExchangeService.convertUsdToVes(dto.base_imponible, rate)
      : BcvExchangeService.round(dto.base_imponible, 2);
    const baseUsd = dto.amounts_in === 'USD'
      ? BcvExchangeService.round(dto.base_imponible, 2)
      : BcvExchangeService.convertVesToUsd(baseVes, rate);
    const exentaVes = BcvExchangeService.round(dto.ventas_exentas ?? 0, 2);
    const exentaUsd = BcvExchangeService.convertVesToUsd(exentaVes, rate);
    const ivaVes = BcvExchangeService.round(baseVes * 0.16, 2);
    const ivaUsd = BcvExchangeService.convertVesToUsd(ivaVes, rate);
    const igtfVes = BcvExchangeService.round(dto.igtf_percibido_3 ?? 0, 2);
    const igtfUsd = BcvExchangeService.convertVesToUsd(igtfVes, rate);
    const totalVes = BcvExchangeService.round(baseVes + ivaVes + exentaVes + igtfVes, 2);
    // USD total = suma de las partes ya convertidas (evita deriva de 1 céntimo por redondeo)
    const totalUsd = BcvExchangeService.round(baseUsd + ivaUsd + exentaUsd + igtfUsd, 2);
    const year = parseInt(dateStr.substring(0, 4), 10);
    const period = parseInt(dateStr.substring(5, 7), 10);

    return this.ds.transaction(async (m) => {
      await this.journal.assertPeriodOpen(tenantId, dateStr, m);

      const [opRow] = await m.query(
        'SELECT COALESCE(MAX(numero_operacion),0)+1 AS next_op FROM sales_book WHERE tenant_id = ?',
        [tenantId],
      );
      const numeroOperacion = parseInt(opRow.next_op, 10);

      let numeroFactura = dto.numero_factura;
      let numeroControl = dto.numero_control;
      if (!numeroFactura) {
        const [fRow] = await m.query(
          "SELECT COALESCE(MAX(CAST(numero_factura AS INTEGER)),0)+1 AS n FROM sales_book WHERE tenant_id = ?",
          [tenantId],
        );
        numeroFactura = String(parseInt(fRow.n, 10)).padStart(6, '0');
      }
      if (!numeroControl) numeroControl = `00-${numeroFactura}`;

      const entryNumber = await this.journal.nextEntryNumber(tenantId, year, m);
      const generator = new AutomaticJournalGenerator();
      const saleId = crypto.randomUUID();

      // Composición del asiento según condición de venta
      let lines: JournalEntryLineDto[];
      if (condicion === 'CREDITO' && exentaVes === 0 && igtfVes === 0) {
        // Caso canónico: venta a crédito gravada → motor de asientos
        const dtoEntry = generator.generateSaleInvoiceEntry({
          tenantId, invoiceId: saleId, invoiceNumber: numeroFactura,
          controlNumber: numeroControl, date: dateStr,
          customerRif: dto.rif_comprador, customerName: dto.nombre_comprador,
          amountUsd: totalUsd, baseImponibleUsd: baseUsd, vatAmountUsd: ivaUsd,
          bcvExchangeRate: rate, isCredit: true,
        }, entryNumber);
        dtoEntry.sourceDocumentId = saleId;
        const entry = await this.journal.persistDto(dtoEntry, userId, m);
        const sale = await m.getRepository(SalesBook).save(m.getRepository(SalesBook).create({
          sale_id: saleId, tenant_id: tenantId, fiscal_year: year, fiscal_period: period,
          numero_operacion: numeroOperacion, fecha_factura: dateStr,
          rif_comprador: dto.rif_comprador, nombre_comprador: dto.nombre_comprador,
          numero_factura: numeroFactura, numero_control: numeroControl,
          total_ventas_con_iva: totalVes, ventas_exentas: exentaVes,
          base_imponible_16: baseVes, debito_fiscal_16: ivaVes,
          iva_retenido_terceros: dto.iva_retenido_terceros ?? 0,
          igtf_percibido_3: igtfVes, bcv_exchange_rate: rate,
          journal_entry_id: entry.entry_id,
        }));
        return { sale, journal_entry_id: entry.entry_id, numero_factura: numeroFactura };
      }

      // Venta de contado y/o con exentas/IGTF: composición de líneas directa
      const cashAcc = condicion === 'CONTADO'
        ? (cobroEn === 'USD' ? STANDARD_ACCOUNTS.CAJA_CUSTODIA_DIVISAS : STANDARD_ACCOUNTS.BANCOS_NACIONALES_VES)
        : STANDARD_ACCOUNTS.CXC_COMERCIALES_NACIONALES;

      lines = [
        {
          accountCode: cashAcc.code, accountName: cashAcc.name,
          description: `${condicion === 'CONTADO' ? 'Cobro' : 'CxC'} Factura N° ${numeroFactura} - ${dto.nombre_comprador}`,
          debitVes: totalVes, creditVes: 0, debitUsd: totalUsd, creditUsd: 0,
          bcvRate: rate, thirdPartyRif: dto.rif_comprador,
        },
        {
          accountCode: STANDARD_ACCOUNTS.VENTAS_GRAVADAS_16.code,
          accountName: STANDARD_ACCOUNTS.VENTAS_GRAVADAS_16.name,
          description: `Venta según Factura N° ${numeroFactura}`,
          debitVes: 0, creditVes: baseVes, debitUsd: 0, creditUsd: baseUsd,
          bcvRate: rate, thirdPartyRif: dto.rif_comprador,
        },
      ];
      if (ivaVes > 0) {
        lines.push({
          accountCode: STANDARD_ACCOUNTS.DEBITO_FISCAL_IVA_16.code,
          accountName: STANDARD_ACCOUNTS.DEBITO_FISCAL_IVA_16.name,
          description: `Débito Fiscal IVA 16% Factura N° ${numeroFactura}`,
          debitVes: 0, creditVes: ivaVes, debitUsd: 0, creditUsd: ivaUsd,
          bcvRate: rate, thirdPartyRif: dto.rif_comprador,
        });
      }
      if (exentaVes > 0) {
        lines.push({
          accountCode: '4.1.01.01.02.000', accountName: 'Ventas de Mercancías Exentas',
          description: `Venta exenta Factura N° ${numeroFactura}`,
          debitVes: 0, creditVes: exentaVes, debitUsd: 0, creditUsd: exentaUsd,
          bcvRate: rate, thirdPartyRif: dto.rif_comprador,
        });
      }
      if (igtfVes > 0) {
        lines.push({
          accountCode: STANDARD_ACCOUNTS.IGTF_POR_PAGAR_ENTERAR_3.code,
          accountName: STANDARD_ACCOUNTS.IGTF_POR_PAGAR_ENTERAR_3.name,
          description: `IGTF 3% percibido Factura N° ${numeroFactura}`,
          debitVes: 0, creditVes: igtfVes, debitUsd: 0, creditUsd: igtfUsd,
          bcvRate: rate, thirdPartyRif: dto.rif_comprador,
        });
      }
      try {
        AutomaticJournalGenerator.assertDoubleEntryBalance(lines);
      } catch (e: any) {
        throw new BadRequestException(e.message);
      }

      const dtoEntry: JournalEntryDto = {
        tenantId, fiscalYear: year, fiscalPeriod: period, entryNumber,
        entryDate: dateStr,
        concept: `Factura de Venta N° ${numeroFactura} (${condicion}) a ${dto.nombre_comprador}`,
        sourceModule: 'VENTAS', sourceDocumentId: saleId, status: 'ASENTADO',
        bcvExchangeRate: rate, lines,
        totalDebitVes: totalVes, totalCreditVes: totalVes,
        totalDebitUsd: totalUsd, totalCreditUsd: totalUsd,
      };
      const entry = await this.journal.persistDto(dtoEntry, userId, m);
      const sale = await m.getRepository(SalesBook).save(m.getRepository(SalesBook).create({
        sale_id: saleId, tenant_id: tenantId, fiscal_year: year, fiscal_period: period,
        numero_operacion: numeroOperacion, fecha_factura: dateStr,
        rif_comprador: dto.rif_comprador, nombre_comprador: dto.nombre_comprador,
        numero_factura: numeroFactura, numero_control: numeroControl,
        total_ventas_con_iva: totalVes, ventas_exentas: exentaVes,
        base_imponible_16: baseVes, debito_fiscal_16: ivaVes,
        iva_retenido_terceros: dto.iva_retenido_terceros ?? 0,
        igtf_percibido_3: igtfVes, bcv_exchange_rate: rate,
        journal_entry_id: entry.entry_id,
      }));
      return { sale, journal_entry_id: entry.entry_id, numero_factura: numeroFactura };
    });
  }
}
