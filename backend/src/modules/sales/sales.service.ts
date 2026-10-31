import {
  BadRequestException, Injectable,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SalesBook } from '../../entities/fiscal.entity';
import { Tenant } from '../../entities/tenant.entity';
import { ChartOfAccount } from '../../entities/accounting.entity';
import { JournalService } from '../accounting/journal.service';
import { AutomaticJournalGenerator, STANDARD_ACCOUNTS } from '../../shared/accounting/automatic-journal-generator';
import { JournalEntryDto, JournalEntryLineDto } from '../../shared/accounting/types';
import { BcvExchangeService } from '../../shared/seniat/bcv-service';
import { RifValidator } from '../../shared/seniat/rif-validator';

export interface CreateSaleDto {
  /** FACTURA: documento por cliente | REPORTE_Z: venta consolidada de máquina fiscal */
  tipo_documento?: 'FACTURA' | 'REPORTE_Z';
  /** Serial de la máquina fiscal (solo Reporte Z) */
  serial_maquina?: string;
  fecha_factura?: string;
  /** Requerido salvo en REPORTE_Z */
  rif_comprador?: string;
  nombre_comprador?: string;
  /** En REPORTE_Z es el número del reporte Z — requerido */
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
  /** Cuenta 4.x de ingreso a acreditar (default: ventas de mercancías gravadas) */
  income_account_code?: string;
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
    const isReporteZ = dto.tipo_documento === 'REPORTE_Z';
    let rifComprador = dto.rif_comprador;
    let nombreComprador = dto.nombre_comprador;

    if (isReporteZ) {
      if (!dto.numero_factura) {
        throw new BadRequestException('Indique el número del Reporte Z emitido por la máquina fiscal');
      }
      // Venta consolidada: el comprador se asienta como "venta a contado" con el RIF propio
      const tenant = await this.ds.getRepository(Tenant).findOne({ where: { tenant_id: tenantId } });
      rifComprador = tenant?.rif ?? 'VENTA A CONTADO';
      nombreComprador = dto.nombre_comprador || 'VENTA A CONTADO (MÁQUINA FISCAL)';
    } else {
      if (!rifComprador || !nombreComprador) {
        throw new BadRequestException('RIF y nombre del comprador son requeridos');
      }
      if (!RifValidator.isValid(rifComprador)) {
        throw new BadRequestException(`RIF del comprador inválido: ${rifComprador}`);
      }
    }

    // Cuenta de ingreso configurable (empresas de servicios, etc.)
    let incomeAcc = {
      code: STANDARD_ACCOUNTS.VENTAS_GRAVADAS_16.code,
      name: STANDARD_ACCOUNTS.VENTAS_GRAVADAS_16.name,
    };
    if (dto.income_account_code) {
      const acc = await this.ds.getRepository(ChartOfAccount).findOne({
        where: { tenant_id: tenantId, code: dto.income_account_code },
      });
      if (!acc || !acc.is_selectable || !acc.code.startsWith('4.')) {
        throw new BadRequestException('La cuenta de ingreso debe ser una cuenta 4.x seleccionable del plan');
      }
      incomeAcc = { code: acc.code, name: acc.name };
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
      if (!numeroControl) {
        numeroControl = isReporteZ
          ? (dto.serial_maquina || `Z-${numeroFactura}`)
          : `00-${numeroFactura}`;
      }
      const docLabel = isReporteZ
        ? `Reporte Z N° ${numeroFactura}${dto.serial_maquina ? ` · Máq. ${dto.serial_maquina}` : ''}`
        : `Factura N° ${numeroFactura}`;

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
          customerRif: rifComprador!, customerName: nombreComprador!,
          amountUsd: totalUsd, baseImponibleUsd: baseUsd, vatAmountUsd: ivaUsd,
          bcvExchangeRate: rate, isCredit: true,
        }, entryNumber);
        dtoEntry.sourceDocumentId = saleId;
        if (dto.income_account_code) {
          for (const l of dtoEntry.lines) {
            if (l.accountCode === STANDARD_ACCOUNTS.VENTAS_GRAVADAS_16.code) {
              l.accountCode = incomeAcc.code;
              l.accountName = incomeAcc.name;
            }
          }
        }
        const entry = await this.journal.persistDto(dtoEntry, userId, m);
        const sale = await m.getRepository(SalesBook).save(m.getRepository(SalesBook).create({
          sale_id: saleId, tenant_id: tenantId, fiscal_year: year, fiscal_period: period,
          numero_operacion: numeroOperacion, fecha_factura: dateStr,
          rif_comprador: rifComprador, nombre_comprador: nombreComprador,
          numero_factura: numeroFactura, numero_control: numeroControl,
          tipo_documento: isReporteZ ? 'REPORTE_Z' : 'FACTURA',
          serial_maquina: isReporteZ ? (dto.serial_maquina ?? null) : null,
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
          description: `${condicion === 'CONTADO' ? 'Cobro' : 'CxC'} ${docLabel} - ${nombreComprador}`,
          debitVes: totalVes, creditVes: 0, debitUsd: totalUsd, creditUsd: 0,
          bcvRate: rate, thirdPartyRif: rifComprador,
        },
        {
          accountCode: incomeAcc.code,
          accountName: incomeAcc.name,
          description: `Venta según ${docLabel}`,
          debitVes: 0, creditVes: baseVes, debitUsd: 0, creditUsd: baseUsd,
          bcvRate: rate, thirdPartyRif: rifComprador,
        },
      ];
      if (ivaVes > 0) {
        lines.push({
          accountCode: STANDARD_ACCOUNTS.DEBITO_FISCAL_IVA_16.code,
          accountName: STANDARD_ACCOUNTS.DEBITO_FISCAL_IVA_16.name,
          description: `Débito Fiscal IVA 16% ${docLabel}`,
          debitVes: 0, creditVes: ivaVes, debitUsd: 0, creditUsd: ivaUsd,
          bcvRate: rate, thirdPartyRif: rifComprador,
        });
      }
      if (exentaVes > 0) {
        lines.push({
          accountCode: '4.1.01.01.02.000', accountName: 'Ventas de Mercancías Exentas',
          description: `Venta exenta ${docLabel}`,
          debitVes: 0, creditVes: exentaVes, debitUsd: 0, creditUsd: exentaUsd,
          bcvRate: rate, thirdPartyRif: rifComprador,
        });
      }
      if (igtfVes > 0) {
        lines.push({
          accountCode: STANDARD_ACCOUNTS.IGTF_POR_PAGAR_ENTERAR_3.code,
          accountName: STANDARD_ACCOUNTS.IGTF_POR_PAGAR_ENTERAR_3.name,
          description: `IGTF 3% percibido ${docLabel}`,
          debitVes: 0, creditVes: igtfVes, debitUsd: 0, creditUsd: igtfUsd,
          bcvRate: rate, thirdPartyRif: rifComprador,
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
        concept: `${docLabel} (${condicion}) a ${nombreComprador}`,
        sourceModule: 'VENTAS', sourceDocumentId: saleId, status: 'ASENTADO',
        bcvExchangeRate: rate, lines,
        totalDebitVes: totalVes, totalCreditVes: totalVes,
        totalDebitUsd: totalUsd, totalCreditUsd: totalUsd,
      };
      const entry = await this.journal.persistDto(dtoEntry, userId, m);
      const sale = await m.getRepository(SalesBook).save(m.getRepository(SalesBook).create({
        sale_id: saleId, tenant_id: tenantId, fiscal_year: year, fiscal_period: period,
        numero_operacion: numeroOperacion, fecha_factura: dateStr,
        rif_comprador: rifComprador, nombre_comprador: nombreComprador,
        numero_factura: numeroFactura, numero_control: numeroControl,
        tipo_documento: isReporteZ ? 'REPORTE_Z' : 'FACTURA',
        serial_maquina: isReporteZ ? (dto.serial_maquina ?? null) : null,
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
