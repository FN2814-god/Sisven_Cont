"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchasesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fiscal_entity_1 = require("../../entities/fiscal.entity");
const tenant_entity_1 = require("../../entities/tenant.entity");
const journal_service_1 = require("../accounting/journal.service");
const automatic_journal_generator_1 = require("../../shared/accounting/automatic-journal-generator");
const islr_retention_engine_1 = require("../../shared/seniat/islr-retention-engine");
const iva_retention_engine_1 = require("../../shared/seniat/iva-retention-engine");
const bcv_service_1 = require("../../shared/seniat/bcv-service");
const rif_validator_1 = require("../../shared/seniat/rif-validator");
let PurchasesService = class PurchasesService {
    ds;
    purchases;
    tenants;
    journal;
    constructor(ds, purchases, tenants, journal) {
        this.ds = ds;
        this.purchases = purchases;
        this.tenants = tenants;
        this.journal = journal;
    }
    list(tenantId, year, period) {
        const where = { tenant_id: tenantId };
        if (year)
            where.fiscal_year = year;
        if (period)
            where.fiscal_period = period;
        return this.purchases.find({ where, order: { numero_operacion: 'DESC' }, take: 500 });
    }
    async create(tenantId, userId, dto) {
        if (!rif_validator_1.RifValidator.isValid(dto.rif_proveedor)) {
            throw new common_1.BadRequestException(`RIF del proveedor inválido: ${dto.rif_proveedor}`);
        }
        const rate = dto.bcv_exchange_rate;
        if (!rate || rate <= 0)
            throw new common_1.BadRequestException('Tasa BCV inválida');
        const tenant = await this.tenants.findOne({ where: { tenant_id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Empresa no encontrada');
        const dateStr = dto.fecha_factura || new Date().toISOString().substring(0, 10);
        const year = parseInt(dateStr.substring(0, 4), 10);
        const period = parseInt(dateStr.substring(5, 7), 10);
        const periodoAnomes = `${year}${String(period).padStart(2, '0')}`;
        const baseVes = dto.amounts_in === 'USD'
            ? bcv_service_1.BcvExchangeService.convertUsdToVes(dto.base_imponible, rate)
            : bcv_service_1.BcvExchangeService.round(dto.base_imponible, 2);
        const baseUsd = bcv_service_1.BcvExchangeService.convertVesToUsd(baseVes, rate);
        const ivaVes = bcv_service_1.BcvExchangeService.round(baseVes * 0.16, 2);
        const ivaUsd = bcv_service_1.BcvExchangeService.convertVesToUsd(ivaVes, rate);
        const exentaVes = bcv_service_1.BcvExchangeService.round(dto.compras_exentas ?? 0, 2);
        const totalVes = bcv_service_1.BcvExchangeService.round(baseVes + ivaVes + exentaVes, 2);
        const pctIva = tenant.es_contribuyente_especial
            ? (dto.porcentaje_retencion_iva ?? tenant.porcentaje_retencion_iva ?? 75.0)
            : 0;
        const ivaRetVes = bcv_service_1.BcvExchangeService.round(ivaVes * (pctIva / 100), 2);
        const ivaRetUsd = bcv_service_1.BcvExchangeService.convertVesToUsd(ivaRetVes, rate);
        let islrRetVes = 0;
        let islrSustraendo = 0;
        let islrPct = 0;
        if (dto.islr_concepto_codigo) {
            const result = islr_retention_engine_1.IslrRetentionEngine.calculateRetention({
                conceptCode: dto.islr_concepto_codigo,
                amount: baseVes,
                currentUtValue: dto.valor_ut ?? 0,
                beneficiaryType: dto.islr_beneficiary_type ?? 'PJ_DOM',
            });
            islrRetVes = result.netTaxRetained;
            islrSustraendo = result.sustraendo;
            islrPct = result.taxRatePercentage;
        }
        const islrRetUsd = bcv_service_1.BcvExchangeService.convertVesToUsd(islrRetVes, rate);
        const rifAgente = rif_validator_1.RifValidator.clean(tenant.rif);
        return this.ds.transaction(async (m) => {
            await this.journal.assertPeriodOpen(tenantId, dateStr, m);
            const [opRow] = await m.query('SELECT COALESCE(MAX(numero_operacion),0)+1 AS next_op FROM purchases_book WHERE tenant_id = ?', [tenantId]);
            const numeroOperacion = parseInt(opRow.next_op, 10);
            let numComprobante = null;
            if (ivaRetVes > 0) {
                const [cRow] = await m.query('SELECT COUNT(*)+1 AS n FROM tax_retentions_iva WHERE tenant_id = ? AND periodo_impositivo = ?', [tenantId, periodoAnomes]);
                numComprobante = iva_retention_engine_1.IvaRetentionEngine.generateVatVoucherNumber(periodoAnomes, parseInt(cRow.n, 10));
            }
            const purchaseId = crypto.randomUUID();
            const entryNumber = await this.journal.nextEntryNumber(tenantId, year, m);
            const dtoEntry = new automatic_journal_generator_1.AutomaticJournalGenerator().generateSupplierPurchaseEntry({
                tenantId, purchaseId, invoiceNumber: dto.numero_factura,
                controlNumber: dto.numero_control, date: dateStr,
                supplierRif: dto.rif_proveedor, supplierName: dto.nombre_proveedor,
                expenseAccountCode: dto.expense_account_code ?? '',
                expenseDescription: dto.expense_description ?? '',
                baseImponibleVes: baseVes + exentaVes,
                baseImponibleUsd: bcv_service_1.BcvExchangeService.convertVesToUsd(baseVes + exentaVes, rate),
                vatAmountVes: ivaVes, vatAmountUsd: ivaUsd,
                ivaRetentionVes: ivaRetVes, ivaRetentionUsd: ivaRetUsd,
                islrRetentionVes: islrRetVes, islrRetentionUsd: islrRetUsd,
                islrConceptCode: dto.islr_concepto_codigo ?? '',
                bcvExchangeRate: rate,
            }, entryNumber);
            dtoEntry.sourceDocumentId = purchaseId;
            const entry = await this.journal.persistDto(dtoEntry, userId, m);
            const purchase = await m.getRepository(fiscal_entity_1.PurchasesBook).save(m.getRepository(fiscal_entity_1.PurchasesBook).create({
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
                await m.getRepository(fiscal_entity_1.TaxRetentionIva).save(m.getRepository(fiscal_entity_1.TaxRetentionIva).create({
                    tenant_id: tenantId, rif_agente: rifAgente, periodo_impositivo: periodoAnomes,
                    fecha_factura: dateStr, rif_retenido: rif_validator_1.RifValidator.clean(dto.rif_proveedor),
                    numero_factura: dto.numero_factura, numero_control: dto.numero_control,
                    monto_total_con_iva: totalVes, base_imponible: baseVes,
                    monto_iva_retenido: ivaRetVes, numero_comprobante: numComprobante,
                }));
            }
            if (islrRetVes > 0) {
                await m.getRepository(fiscal_entity_1.TaxRetentionIslr).save(m.getRepository(fiscal_entity_1.TaxRetentionIslr).create({
                    tenant_id: tenantId, rif_agente: rifAgente, periodo_anomes: periodoAnomes,
                    rif_retenido: rif_validator_1.RifValidator.clean(dto.rif_proveedor),
                    numero_factura: dto.numero_factura, numero_control: dto.numero_control,
                    fecha_operacion: dateStr, codigo_concepto: dto.islr_concepto_codigo,
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
};
exports.PurchasesService = PurchasesService;
exports.PurchasesService = PurchasesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __param(1, (0, typeorm_1.InjectRepository)(fiscal_entity_1.PurchasesBook)),
    __param(2, (0, typeorm_1.InjectRepository)(tenant_entity_1.Tenant)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository,
        journal_service_1.JournalService])
], PurchasesService);
//# sourceMappingURL=purchases.service.js.map