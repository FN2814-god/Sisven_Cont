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
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fiscal_entity_1 = require("../../entities/fiscal.entity");
const journal_service_1 = require("../accounting/journal.service");
const automatic_journal_generator_1 = require("../../shared/accounting/automatic-journal-generator");
const bcv_service_1 = require("../../shared/seniat/bcv-service");
const rif_validator_1 = require("../../shared/seniat/rif-validator");
let SalesService = class SalesService {
    ds;
    sales;
    journal;
    constructor(ds, sales, journal) {
        this.ds = ds;
        this.sales = sales;
        this.journal = journal;
    }
    list(tenantId, year, period) {
        const where = { tenant_id: tenantId };
        if (year)
            where.fiscal_year = year;
        if (period)
            where.fiscal_period = period;
        return this.sales.find({ where, order: { numero_operacion: 'DESC' }, take: 500 });
    }
    async create(tenantId, userId, dto) {
        if (!rif_validator_1.RifValidator.isValid(dto.rif_comprador)) {
            throw new common_1.BadRequestException(`RIF del comprador inválido: ${dto.rif_comprador}`);
        }
        const rate = dto.bcv_exchange_rate;
        if (!rate || rate <= 0)
            throw new common_1.BadRequestException('Tasa BCV inválida');
        const dateStr = dto.fecha_factura || new Date().toISOString().substring(0, 10);
        const condicion = dto.condicion ?? 'CONTADO';
        const cobroEn = dto.cobro_en ?? 'USD';
        const baseVes = dto.amounts_in === 'USD'
            ? bcv_service_1.BcvExchangeService.convertUsdToVes(dto.base_imponible, rate)
            : bcv_service_1.BcvExchangeService.round(dto.base_imponible, 2);
        const baseUsd = dto.amounts_in === 'USD'
            ? bcv_service_1.BcvExchangeService.round(dto.base_imponible, 2)
            : bcv_service_1.BcvExchangeService.convertVesToUsd(baseVes, rate);
        const exentaVes = bcv_service_1.BcvExchangeService.round(dto.ventas_exentas ?? 0, 2);
        const exentaUsd = bcv_service_1.BcvExchangeService.convertVesToUsd(exentaVes, rate);
        const ivaVes = bcv_service_1.BcvExchangeService.round(baseVes * 0.16, 2);
        const ivaUsd = bcv_service_1.BcvExchangeService.convertVesToUsd(ivaVes, rate);
        const igtfVes = bcv_service_1.BcvExchangeService.round(dto.igtf_percibido_3 ?? 0, 2);
        const igtfUsd = bcv_service_1.BcvExchangeService.convertVesToUsd(igtfVes, rate);
        const totalVes = bcv_service_1.BcvExchangeService.round(baseVes + ivaVes + exentaVes + igtfVes, 2);
        const totalUsd = bcv_service_1.BcvExchangeService.round(baseUsd + ivaUsd + exentaUsd + igtfUsd, 2);
        const year = parseInt(dateStr.substring(0, 4), 10);
        const period = parseInt(dateStr.substring(5, 7), 10);
        return this.ds.transaction(async (m) => {
            await this.journal.assertPeriodOpen(tenantId, dateStr, m);
            const [opRow] = await m.query('SELECT COALESCE(MAX(numero_operacion),0)+1 AS next_op FROM sales_book WHERE tenant_id = ?', [tenantId]);
            const numeroOperacion = parseInt(opRow.next_op, 10);
            let numeroFactura = dto.numero_factura;
            let numeroControl = dto.numero_control;
            if (!numeroFactura) {
                const [fRow] = await m.query("SELECT COALESCE(MAX(CAST(numero_factura AS INTEGER)),0)+1 AS n FROM sales_book WHERE tenant_id = ?", [tenantId]);
                numeroFactura = String(parseInt(fRow.n, 10)).padStart(6, '0');
            }
            if (!numeroControl)
                numeroControl = `00-${numeroFactura}`;
            const entryNumber = await this.journal.nextEntryNumber(tenantId, year, m);
            const generator = new automatic_journal_generator_1.AutomaticJournalGenerator();
            const saleId = crypto.randomUUID();
            let lines;
            if (condicion === 'CREDITO' && exentaVes === 0 && igtfVes === 0) {
                const dtoEntry = generator.generateSaleInvoiceEntry({
                    tenantId, invoiceId: saleId, invoiceNumber: numeroFactura,
                    controlNumber: numeroControl, date: dateStr,
                    customerRif: dto.rif_comprador, customerName: dto.nombre_comprador,
                    amountUsd: totalUsd, baseImponibleUsd: baseUsd, vatAmountUsd: ivaUsd,
                    bcvExchangeRate: rate, isCredit: true,
                }, entryNumber);
                dtoEntry.sourceDocumentId = saleId;
                const entry = await this.journal.persistDto(dtoEntry, userId, m);
                const sale = await m.getRepository(fiscal_entity_1.SalesBook).save(m.getRepository(fiscal_entity_1.SalesBook).create({
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
            const cashAcc = condicion === 'CONTADO'
                ? (cobroEn === 'USD' ? automatic_journal_generator_1.STANDARD_ACCOUNTS.CAJA_CUSTODIA_DIVISAS : automatic_journal_generator_1.STANDARD_ACCOUNTS.BANCOS_NACIONALES_VES)
                : automatic_journal_generator_1.STANDARD_ACCOUNTS.CXC_COMERCIALES_NACIONALES;
            lines = [
                {
                    accountCode: cashAcc.code, accountName: cashAcc.name,
                    description: `${condicion === 'CONTADO' ? 'Cobro' : 'CxC'} Factura N° ${numeroFactura} - ${dto.nombre_comprador}`,
                    debitVes: totalVes, creditVes: 0, debitUsd: totalUsd, creditUsd: 0,
                    bcvRate: rate, thirdPartyRif: dto.rif_comprador,
                },
                {
                    accountCode: automatic_journal_generator_1.STANDARD_ACCOUNTS.VENTAS_GRAVADAS_16.code,
                    accountName: automatic_journal_generator_1.STANDARD_ACCOUNTS.VENTAS_GRAVADAS_16.name,
                    description: `Venta según Factura N° ${numeroFactura}`,
                    debitVes: 0, creditVes: baseVes, debitUsd: 0, creditUsd: baseUsd,
                    bcvRate: rate, thirdPartyRif: dto.rif_comprador,
                },
            ];
            if (ivaVes > 0) {
                lines.push({
                    accountCode: automatic_journal_generator_1.STANDARD_ACCOUNTS.DEBITO_FISCAL_IVA_16.code,
                    accountName: automatic_journal_generator_1.STANDARD_ACCOUNTS.DEBITO_FISCAL_IVA_16.name,
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
                    accountCode: automatic_journal_generator_1.STANDARD_ACCOUNTS.IGTF_POR_PAGAR_ENTERAR_3.code,
                    accountName: automatic_journal_generator_1.STANDARD_ACCOUNTS.IGTF_POR_PAGAR_ENTERAR_3.name,
                    description: `IGTF 3% percibido Factura N° ${numeroFactura}`,
                    debitVes: 0, creditVes: igtfVes, debitUsd: 0, creditUsd: igtfUsd,
                    bcvRate: rate, thirdPartyRif: dto.rif_comprador,
                });
            }
            try {
                automatic_journal_generator_1.AutomaticJournalGenerator.assertDoubleEntryBalance(lines);
            }
            catch (e) {
                throw new common_1.BadRequestException(e.message);
            }
            const dtoEntry = {
                tenantId, fiscalYear: year, fiscalPeriod: period, entryNumber,
                entryDate: dateStr,
                concept: `Factura de Venta N° ${numeroFactura} (${condicion}) a ${dto.nombre_comprador}`,
                sourceModule: 'VENTAS', sourceDocumentId: saleId, status: 'ASENTADO',
                bcvExchangeRate: rate, lines,
                totalDebitVes: totalVes, totalCreditVes: totalVes,
                totalDebitUsd: totalUsd, totalCreditUsd: totalUsd,
            };
            const entry = await this.journal.persistDto(dtoEntry, userId, m);
            const sale = await m.getRepository(fiscal_entity_1.SalesBook).save(m.getRepository(fiscal_entity_1.SalesBook).create({
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
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __param(1, (0, typeorm_1.InjectRepository)(fiscal_entity_1.SalesBook)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        journal_service_1.JournalService])
], SalesService);
//# sourceMappingURL=sales.service.js.map