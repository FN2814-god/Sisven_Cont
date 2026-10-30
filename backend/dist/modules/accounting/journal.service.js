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
exports.JournalService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const accounting_entity_1 = require("../../entities/accounting.entity");
const automatic_journal_generator_1 = require("../../shared/accounting/automatic-journal-generator");
const bcv_service_1 = require("../../shared/seniat/bcv-service");
let JournalService = class JournalService {
    ds;
    entries;
    lines;
    periods;
    chart;
    constructor(ds, entries, lines, periods, chart) {
        this.ds = ds;
        this.entries = entries;
        this.lines = lines;
        this.periods = periods;
        this.chart = chart;
    }
    async assertPeriodOpen(tenantId, dateStr, manager) {
        const year = parseInt(dateStr.substring(0, 4), 10);
        const month = parseInt(dateStr.substring(5, 7), 10);
        const repo = (manager ?? this.ds.manager).getRepository(accounting_entity_1.FiscalPeriod);
        let period = await repo.findOne({
            where: { tenant_id: tenantId, fiscal_year: year, fiscal_month: month },
        });
        if (!period) {
            period = await repo.save(repo.create({
                tenant_id: tenantId, fiscal_year: year, fiscal_month: month, status: 'ABIERTO',
            }));
        }
        if (period.status === 'CERRADO') {
            throw new common_1.BadRequestException(`El período fiscal ${year}-${String(month).padStart(2, '0')} está CERRADO.`);
        }
        return period;
    }
    async nextEntryNumber(tenantId, year, manager) {
        const repo = (manager ?? this.ds.manager).getRepository(accounting_entity_1.JournalEntry);
        const row = await repo
            .createQueryBuilder('e')
            .select('COALESCE(MAX(e.entry_number), 0) + 1', 'next')
            .where('e.tenant_id = :tenantId AND e.fiscal_year = :year', { tenantId, year })
            .getRawOne();
        return parseInt(row.next, 10);
    }
    async persistDto(dto, userId, manager) {
        const codes = dto.lines.map((l) => l.accountCode);
        const accounts = await manager.getRepository(accounting_entity_1.ChartOfAccount).find({
            where: codes.map((code) => ({ tenant_id: dto.tenantId, code })),
        });
        const idByCode = new Map(accounts.map((a) => [a.code, a.account_id]));
        const entry = manager.getRepository(accounting_entity_1.JournalEntry).create({
            tenant_id: dto.tenantId,
            fiscal_year: dto.fiscalYear,
            fiscal_period: dto.fiscalPeriod,
            entry_number: dto.entryNumber,
            entry_date: dto.entryDate,
            concept: dto.concept,
            source_module: dto.sourceModule,
            source_document_id: dto.sourceDocumentId ?? null,
            status: dto.status,
            bcv_exchange_rate: dto.bcvExchangeRate,
            total_debit_ves: dto.totalDebitVes,
            total_credit_ves: dto.totalCreditVes,
            total_debit_usd: dto.totalDebitUsd,
            total_credit_usd: dto.totalCreditUsd,
            created_by: userId,
            lines: dto.lines
                .filter((l) => l.debitVes !== 0 || l.creditVes !== 0)
                .map((l) => ({
                tenant_id: dto.tenantId,
                account_id: idByCode.get(l.accountCode) ?? null,
                account_code: l.accountCode,
                account_name: l.accountName,
                description: l.description ?? null,
                debit_ves: l.debitVes,
                credit_ves: l.creditVes,
                debit_usd: l.debitUsd,
                credit_usd: l.creditUsd,
                bcv_rate: l.bcvRate,
                third_party_rif: l.thirdPartyRif ?? null,
                cost_center: l.costCenter ?? null,
            })),
        });
        return manager.getRepository(accounting_entity_1.JournalEntry).save(entry);
    }
    async list(tenantId, q) {
        const where = { tenant_id: tenantId };
        if (q.year)
            where.fiscal_year = q.year;
        if (q.period)
            where.fiscal_period = q.period;
        if (q.status)
            where.status = q.status;
        return this.entries.find({
            where, order: { entry_number: 'DESC' }, relations: ['lines'], take: 500,
        });
    }
    async get(tenantId, entryId) {
        const entry = await this.entries.findOne({
            where: { entry_id: entryId, tenant_id: tenantId }, relations: ['lines'],
        });
        if (!entry)
            throw new common_1.NotFoundException('Comprobante no encontrado');
        return entry;
    }
    async createManual(tenantId, userId, dto) {
        if (!dto.lines || dto.lines.length < 2) {
            throw new common_1.BadRequestException('El comprobante requiere al menos 2 líneas');
        }
        const rate = dto.bcv_exchange_rate;
        if (!rate || rate <= 0)
            throw new common_1.BadRequestException('Tasa BCV inválida');
        return this.ds.transaction(async (m) => {
            await this.assertPeriodOpen(tenantId, dto.entry_date, m);
            const accounts = await m.getRepository(accounting_entity_1.ChartOfAccount).find({
                where: [
                    ...dto.lines.filter((l) => l.account_id)
                        .map((l) => ({ account_id: l.account_id, tenant_id: tenantId })),
                    ...dto.lines.filter((l) => l.account_code)
                        .map((l) => ({ code: l.account_code, tenant_id: tenantId })),
                ],
            });
            const byId = new Map(accounts.map((a) => [a.account_id, a]));
            const byCode = new Map(accounts.map((a) => [a.code, a]));
            const lines = dto.lines.map((l, i) => {
                const acc = (l.account_id ? byId.get(l.account_id) : undefined)
                    ?? (l.account_code ? byCode.get(l.account_code) : undefined);
                if (!acc)
                    throw new common_1.BadRequestException(`Línea ${i + 1}: cuenta inexistente`);
                if (!acc.is_selectable) {
                    throw new common_1.BadRequestException(`Línea ${i + 1}: la cuenta ${acc.code} no es seleccionable`);
                }
                const debit = bcv_service_1.BcvExchangeService.round(l.debit_ves ?? 0, 2);
                const credit = bcv_service_1.BcvExchangeService.round(l.credit_ves ?? 0, 2);
                return {
                    accountCode: acc.code, accountName: acc.name,
                    description: l.description ?? '', debitVes: debit, creditVes: credit,
                    debitUsd: bcv_service_1.BcvExchangeService.convertVesToUsd(debit, rate),
                    creditUsd: bcv_service_1.BcvExchangeService.convertVesToUsd(credit, rate),
                    bcvRate: rate, thirdPartyRif: l.third_party_rif, costCenter: l.cost_center,
                };
            });
            try {
                automatic_journal_generator_1.AutomaticJournalGenerator.assertDoubleEntryBalance(lines);
            }
            catch (e) {
                throw new common_1.BadRequestException(e.message);
            }
            const year = parseInt(dto.entry_date.substring(0, 4), 10);
            const dtoEntry = {
                tenantId,
                fiscalYear: year,
                fiscalPeriod: parseInt(dto.entry_date.substring(5, 7), 10),
                entryNumber: await this.nextEntryNumber(tenantId, year, m),
                entryDate: dto.entry_date,
                concept: dto.concept,
                sourceModule: 'MANUAL',
                status: 'ASENTADO',
                bcvExchangeRate: rate,
                lines,
                totalDebitVes: bcv_service_1.BcvExchangeService.round(lines.reduce((s, l) => s + l.debitVes, 0), 2),
                totalCreditVes: bcv_service_1.BcvExchangeService.round(lines.reduce((s, l) => s + l.creditVes, 0), 2),
                totalDebitUsd: bcv_service_1.BcvExchangeService.round(lines.reduce((s, l) => s + l.debitUsd, 0), 2),
                totalCreditUsd: bcv_service_1.BcvExchangeService.round(lines.reduce((s, l) => s + l.creditUsd, 0), 2),
            };
            return this.persistDto(dtoEntry, userId, m);
        });
    }
    async void(tenantId, entryId) {
        const entry = await this.get(tenantId, entryId);
        if (entry.status === 'ANULADO') {
            throw new common_1.BadRequestException('El comprobante ya está anulado');
        }
        if (entry.source_module !== 'MANUAL') {
            throw new common_1.BadRequestException('Sólo los asientos manuales pueden anularse directamente. Anule el documento origen.');
        }
        await this.assertPeriodOpen(tenantId, entry.entry_date);
        entry.status = 'ANULADO';
        return this.entries.save(entry);
    }
};
exports.JournalService = JournalService;
exports.JournalService = JournalService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __param(1, (0, typeorm_1.InjectRepository)(accounting_entity_1.JournalEntry)),
    __param(2, (0, typeorm_1.InjectRepository)(accounting_entity_1.JournalEntryLine)),
    __param(3, (0, typeorm_1.InjectRepository)(accounting_entity_1.FiscalPeriod)),
    __param(4, (0, typeorm_1.InjectRepository)(accounting_entity_1.ChartOfAccount)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], JournalService);
//# sourceMappingURL=journal.service.js.map