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
exports.BanksService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bank_entity_1 = require("../../entities/bank.entity");
const tenant_entity_1 = require("../../entities/tenant.entity");
const bank_reconciliation_engine_1 = require("../../shared/accounting/bank-reconciliation-engine");
let BanksService = class BanksService {
    ds;
    accounts;
    statements;
    movements;
    tenants;
    constructor(ds, accounts, statements, movements, tenants) {
        this.ds = ds;
        this.accounts = accounts;
        this.statements = statements;
        this.movements = movements;
        this.tenants = tenants;
    }
    listAccounts(tenantId) {
        return this.accounts.find({ where: { tenant_id: tenantId } });
    }
    createAccount(tenantId, dto) {
        return this.accounts.save(this.accounts.create({ ...dto, tenant_id: tenantId }));
    }
    listStatements(tenantId, status) {
        const where = { tenant_id: tenantId };
        if (status)
            where.status = status;
        return this.statements.find({ where, order: { transaction_date: 'DESC' }, take: 1000 });
    }
    addStatement(tenantId, dto) {
        if (!dto.transaction_date || !dto.reference_number || !dto.amount) {
            throw new common_1.BadRequestException('Fecha, referencia y monto son requeridos');
        }
        return this.statements.save(this.statements.create({ ...dto, tenant_id: tenantId }));
    }
    listMovements(tenantId, status) {
        const where = { tenant_id: tenantId };
        if (status)
            where.status = status;
        return this.movements.find({ where, order: { movement_date: 'DESC' }, take: 1000 });
    }
    addMovement(tenantId, dto) {
        if (!dto.movement_date || !dto.reference_number || !dto.amount) {
            throw new common_1.BadRequestException('Fecha, referencia y monto son requeridos');
        }
        return this.movements.save(this.movements.create({ ...dto, tenant_id: tenantId }));
    }
    async reconcile(tenantId, bankAccountId, bcvRate) {
        const tenant = await this.tenants.findOne({ where: { tenant_id: tenantId } });
        const rate = bcvRate ?? tenant?.tasa_bcv_manual ?? 0;
        if (!rate || rate <= 0) {
            throw new common_1.BadRequestException('Se requiere tasa BCV (parámetro bcv_rate o tasa manual)');
        }
        const stmtWhere = { tenant_id: tenantId };
        const movWhere = { tenant_id: tenantId };
        if (bankAccountId) {
            stmtWhere.bank_account_id = bankAccountId;
            movWhere.bank_account_id = bankAccountId;
        }
        const stmts = await this.statements.find({ where: stmtWhere });
        const movs = await this.movements.find({ where: movWhere });
        const stmtItems = stmts.map((s) => ({
            id: s.statement_id, date: s.transaction_date, reference: s.reference_number,
            description: s.description, movementType: s.movement_type, amount: s.amount,
            status: s.status, reconciledWithId: s.matched_movement_id ?? undefined,
            reconciliationType: s.reconciliation_type ?? undefined,
        }));
        const movItems = movs.map((m) => ({
            id: m.movement_id, date: m.movement_date, reference: m.reference_number,
            description: m.concept, movementType: m.movement_type, amount: m.amount,
            status: m.status, salesInvoiceNumber: m.sales_invoice_number ?? undefined,
        }));
        const result = bank_reconciliation_engine_1.BankReconciliationEngine.executeReconciliation(stmtItems, movItems, rate);
        await this.ds.transaction(async (m) => {
            for (const s of result.reconciledStatements) {
                await m.getRepository(bank_entity_1.BankStatement).update(s.id, {
                    status: s.status,
                    matched_movement_id: s.reconciledWithId ?? null,
                    reconciliation_type: s.reconciliationType ?? null,
                });
                if (s.status === 'CONCILIADO' && s.reconciledWithId) {
                    await m.getRepository(bank_entity_1.BankReconciliation).save(m.getRepository(bank_entity_1.BankReconciliation).create({
                        tenant_id: tenantId, statement_id: s.id, movement_id: s.reconciledWithId,
                        reconciliation_type: (s.reconciliationType ?? 'MANUAL'),
                    }));
                }
            }
            for (const mov of result.reconciledInternalMovements) {
                await m.getRepository(bank_entity_1.BankMovement).update(mov.id, { status: mov.status });
            }
        });
        return {
            summary: result.summary,
            fiscal_cross_checks: result.fiscalCrossChecks,
            auto_detected_expenses: result.detectedExpenses.map((e) => ({
                ...e, suggestedJournalEntry: undefined,
                suggested_entry: e.suggestedJournalEntry,
            })),
        };
    }
    async manualMatch(tenantId, statementId, movementId) {
        const stmt = await this.statements.findOne({ where: { statement_id: statementId, tenant_id: tenantId } });
        const mov = await this.movements.findOne({ where: { movement_id: movementId, tenant_id: tenantId } });
        if (!stmt || !mov)
            throw new common_1.NotFoundException('Partida o movimiento no encontrado');
        await this.ds.transaction(async (m) => {
            await m.getRepository(bank_entity_1.BankStatement).update(statementId, {
                status: 'CONCILIADO', matched_movement_id: movementId, reconciliation_type: 'MANUAL',
            });
            await m.getRepository(bank_entity_1.BankMovement).update(movementId, { status: 'CONCILIADO' });
            await m.getRepository(bank_entity_1.BankReconciliation).save(m.getRepository(bank_entity_1.BankReconciliation).create({
                tenant_id: tenantId, statement_id: statementId, movement_id: movementId,
                reconciliation_type: 'MANUAL',
            }));
        });
        return { matched: true };
    }
};
exports.BanksService = BanksService;
exports.BanksService = BanksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __param(1, (0, typeorm_1.InjectRepository)(bank_entity_1.BankAccount)),
    __param(2, (0, typeorm_1.InjectRepository)(bank_entity_1.BankStatement)),
    __param(3, (0, typeorm_1.InjectRepository)(bank_entity_1.BankMovement)),
    __param(4, (0, typeorm_1.InjectRepository)(tenant_entity_1.Tenant)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], BanksService);
//# sourceMappingURL=banks.service.js.map