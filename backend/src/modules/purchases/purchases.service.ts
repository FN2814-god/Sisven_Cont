import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  PurchasesBook, TaxRetentionIva, TaxRetentionIslr,
} from '../../entities/fiscal.entity';
import { Tenant } from '../../entities/tenant.entity';
import { JournalService } from '../accounting/journal.service';
import { AutomaticJournalGenerator } from '../../shared/accounting/automatic-journal-generator';
import { IslrRetentionEngine } from '../../shared/seniat/islr-retention-engine';
import { IvaRetentionEngine } from '../../shared/seniat/iva-retention-engine';
import { BcvExchangeService } from '../../shared/seniat/bcv-service';
import { RifValidator } from '../../shared/seniat/rif-validator';
import { FiscalPersonType } from '../../shared/seniat/types';

export interface CreatePurchaseDto {
  fecha_factura?: string;
  rif_proveedor: string;
  nombre_proveedor: string;
  numero_factura: string;
  numero_control: string;
  /** Cuenta de gasto/costo del plan (ej. 6.1.03.01.01.000) */
  expense_account_code?: string;
  expense_description?: string;
  amounts_in: 'USD' | 'VES';
  base_imponible: number;
  compras_exentas?: number;
  bcv_exchange_rate: number;
  /** Si el tenant es SPE, % de retención IVA (75 | 100). 0/undefined = según tenant */
  porcentaje_retencion_iva?: number;
  /** ISLR: concepto Decreto 1808 (3 dígitos) o null para no retener */
  islr_concepto_codigo?: string;
  islr_beneficiary_type?: FiscalPersonType;
  /** Valor actual de la Unidad Tributaria en VES (para sustraendo) */
  valor_ut?: number;
}

@Injectable()
export class PurchasesService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(PurchasesBook) private readonly purchases: Repository<PurchasesBook>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    private readonly journal: JournalService,
  ) {}

  list(tenantId: string, year?: number, period?: number) {
    const where: any = { tenant_id: tenantId };
    if (year) where.fiscal_year = year;
    if (period) where.fiscal_period = period;
    return this.purchases.find({ where, order: { numero_operacion: 'DESC' }, take: 500 });
  }

  async create(tenantId: string, userId: string, dto: CreatePurchaseDto) {
    if (!RifValidator.isValid(dto.rif_proveedor)) {
      throw new BadRequestException(`RIF del proveedor inválido: ${dto.rif_proveedor}`);
    }
    const rate = dto.bcv_exchange_rate;
    if (!rate || rate <= 0) throw new BadRequestException('Tasa BCV inválida');

    const tenant = await this.tenants.findOne({ where: { tenant_id: tenantId } });
    if (!tenant) throw new NotFoundException('Empresa no encontrada');

    const dateStr = dto.fecha_factura || new Date().toISOString().substring(0, 10);
    const year = parseInt(dateStr.substring(0, 4), 10);
    const period = parseInt(dateStr.substring(5, 7), 10);
    const periodoAnomes = `${year}${String(period).padStart(2, '0')}`;

    const baseVes = dto.amounts_in === 'USD'
      ? BcvExchangeService.convertUsdToVes(dto.base_imponible, rate)
      : BcvExchangeService.round(dto.base_imponible, 2);
    const baseUsd = BcvExchangeService.convertVesToUsd(baseVes, rate);
    const ivaVes = BcvExchangeService.round(baseVes * 0.16, 2);
    const ivaUsd = BcvExchangeService.convertVesToUsd(ivaVes, rate);
    const exentaVes = BcvExchangeService.round(dto.compras_exentas ?? 0, 2);
    const totalVes = BcvExchangeService.round(baseVes + ivaVes + exentaVes, 2);

    // Retención IVA: sólo si el tenant es SPE (agente de retención)
    const pctIva = tenant.es_contribuyente_especial
      ? (dto.porcentaje_retencion_iva ?? tenant.porcentaje_retencion_iva ?? 75.0)
      : 0;
    const ivaRetVes = BcvExchangeService.round(ivaVes * (pctIva / 100), 2);
    const ivaRetUsd = BcvExchangeService.convertVesToUsd(ivaRetVes, rate);

    // Retención ISLR: motor Decreto 1808 (base %, alícuota y sustraendo en UT)
    let islrRetVes = 0;
    let islrSustraendo = 0;
    let islrPct = 0;
    if (dto.islr_concepto_codigo) {
      const result = IslrRetentionEngine.calculateRetention({
        conceptCode: dto.islr_concepto_codigo,
        amount: baseVes,
        currentUtValue: dto.valor_ut ?? 0,
        beneficiaryType: dto.islr_beneficiary_type ?? 'PJ_DOM',
      });
      islrRetVes = result.netTaxRetained;
      islrSustraendo = result.sustraendo;
      islrPct = result.taxRatePercentage;
    }
    const islrRetUsd = BcvExchangeService.convertVesToUsd(islrRetVes, rate);
    const rifAgente = RifValidator.clean(tenant.rif);

    return this.ds.transaction(async (m) => {
      await this.journal.assertPeriodOpen(tenantId, dateStr, m);

      const [opRow] = await m.query(
        'SELECT COALESCE(MAX(numero_operacion),0)+1 AS next_op FROM purchases_book WHERE tenant_id = ?',
        [tenantId],
      );
      const numeroOperacion = parseInt(opRow.next_op, 10);

      // Comprobante de retención IVA (14 dígitos: AAAAMM + 8 correlativos por período)
      let numComprobante: string | null = null;
      if (ivaRetVes > 0) {
        const [cRow] = await m.query(
          'SELECT COUNT(*)+1 AS n FROM tax_retentions_iva WHERE tenant_id = ? AND periodo_impositivo = ?',
          [tenantId, periodoAnomes],
        );
        numComprobante = IvaRetentionEngine.generateVatVoucherNumber(periodoAnomes, parseInt(cRow.n, 10));
      }

      // Asiento de compra vía motor (CxP neto = total − retenciones)
      const purchaseId = crypto.randomUUID();
      const entryNumber = await this.journal.nextEntryNumber(tenantId, year, m);
      const dtoEntry = new AutomaticJournalGenerator().generateSupplierPurchaseEntry({
        tenantId, purchaseId, invoiceNumber: dto.numero_factura,
        controlNumber: dto.numero_control, date: dateStr,
        supplierRif: dto.rif_proveedor, supplierName: dto.nombre_proveedor,
        expenseAccountCode: dto.expense_account_code ?? '',
        expenseDescription: dto.expense_description ?? '',
        baseImponibleVes: baseVes + exentaVes,
        baseImponibleUsd: BcvExchangeService.convertVesToUsd(baseVes + exentaVes, rate),
        vatAmountVes: ivaVes, vatAmountUsd: ivaUsd,
        ivaRetentionVes: ivaRetVes, ivaRetentionUsd: ivaRetUsd,
        islrRetentionVes: islrRetVes, islrRetentionUsd: islrRetUsd,
        islrConceptCode: dto.islr_concepto_codigo ?? '',
        bcvExchangeRate: rate,
      }, entryNumber);
      dtoEntry.sourceDocumentId = purchaseId;
      const entry = await this.journal.persistDto(dtoEntry, userId, m);

      const purchase = await m.getRepository(PurchasesBook).save(m.getRepository(PurchasesBook).create({
        purchase_id: purchaseId, tenant_id: tenantId,
        fiscal_year: year, fiscal_period: period, numero_operacion: numeroOperacion,
        fecha_factura: dateStr, rif_proveedor: dto.rif_proveedor,
        nombre_proveedor: dto.nombre_proveedor,
        numero_factura: dto.numero_factura, numero_control: dto.numero_control,
        total_compras_con_iva: totalVes, compras_exentas: exentaVes,
        base_imponible_16: baseVes, credito_fiscal_16: ivaVes,
        iva_retenido: ivaRetVes, numero_comprobante_ret_iva: numComprobante,
        islr_retenido: islrRetVes, islr_concepto_codigo: dto.islr_concepto_codigo ?? null,
        bcv_exchange_rate: rate, journal_entry_id: entry.entry_id,
      }));

      if (ivaRetVes > 0 && numComprobante) {
        await m.getRepository(TaxRetentionIva).save(m.getRepository(TaxRetentionIva).create({
          tenant_id: tenantId, rif_agente: rifAgente, periodo_impositivo: periodoAnomes,
          fecha_factura: dateStr, rif_retenido: RifValidator.clean(dto.rif_proveedor),
          numero_factura: dto.numero_factura, numero_control: dto.numero_control,
          monto_total_con_iva: totalVes, base_imponible: baseVes,
          monto_iva_retenido: ivaRetVes, numero_comprobante: numComprobante,
        }));
      }
      if (islrRetVes > 0) {
        await m.getRepository(TaxRetentionIslr).save(m.getRepository(TaxRetentionIslr).create({
          tenant_id: tenantId, rif_agente: rifAgente, periodo_anomes: periodoAnomes,
          rif_retenido: RifValidator.clean(dto.rif_proveedor),
          numero_factura: dto.numero_factura, numero_control: dto.numero_control,
          fecha_operacion: dateStr, codigo_concepto: dto.islr_concepto_codigo!,
          monto_operacion: baseVes, porcentaje_retencion: islrPct,
          monto_sustraendo: islrSustraendo, monto_retenido: islrRetVes,
        }));
      }

      return {
        purchase, journal_entry_id: entry.entry_id,
        iva_retenido: ivaRetVes, islr_retenido: islrRetVes,
        comprobante_iva: numComprobante,
      };
    });
  }
}
