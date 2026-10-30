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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankReconciliation = exports.BankMovement = exports.BankStatement = exports.BankAccount = void 0;
const typeorm_1 = require("typeorm");
const numeric_transformer_1 = require("../common/numeric.transformer");
let BankAccount = class BankAccount {
    account_id;
    tenant_id;
    bank_name;
    account_number;
    currency;
    description;
    is_active;
    created_at;
};
exports.BankAccount = BankAccount;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BankAccount.prototype, "account_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BankAccount.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BankAccount.prototype, "bank_name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BankAccount.prototype, "account_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, default: 'VES' }),
    __metadata("design:type", String)
], BankAccount.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], BankAccount.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], BankAccount.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BankAccount.prototype, "created_at", void 0);
exports.BankAccount = BankAccount = __decorate([
    (0, typeorm_1.Entity)('bank_accounts')
], BankAccount);
let BankStatement = class BankStatement {
    statement_id;
    tenant_id;
    bank_account_id;
    transaction_date;
    reference_number;
    description;
    movement_type;
    amount;
    status;
    matched_movement_id;
    reconciliation_type;
    created_at;
};
exports.BankStatement = BankStatement;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BankStatement.prototype, "statement_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BankStatement.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], BankStatement.prototype, "bank_account_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], BankStatement.prototype, "transaction_date", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BankStatement.prototype, "reference_number", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BankStatement.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10 }),
    __metadata("design:type", String)
], BankStatement.prototype, "movement_type", void 0);
__decorate([
    (0, typeorm_1.Column)((0, numeric_transformer_1.decimalColumn)()),
    __metadata("design:type", Number)
], BankStatement.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, default: 'PENDIENTE' }),
    __metadata("design:type", String)
], BankStatement.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], BankStatement.prototype, "matched_movement_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], BankStatement.prototype, "reconciliation_type", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BankStatement.prototype, "created_at", void 0);
exports.BankStatement = BankStatement = __decorate([
    (0, typeorm_1.Entity)('bank_statements'),
    (0, typeorm_1.Index)(['tenant_id', 'transaction_date'])
], BankStatement);
let BankMovement = class BankMovement {
    movement_id;
    tenant_id;
    bank_account_id;
    movement_date;
    reference_number;
    concept;
    movement_type;
    amount;
    sales_invoice_number;
    status;
    created_at;
};
exports.BankMovement = BankMovement;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BankMovement.prototype, "movement_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BankMovement.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], BankMovement.prototype, "bank_account_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], BankMovement.prototype, "movement_date", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BankMovement.prototype, "reference_number", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BankMovement.prototype, "concept", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10 }),
    __metadata("design:type", String)
], BankMovement.prototype, "movement_type", void 0);
__decorate([
    (0, typeorm_1.Column)((0, numeric_transformer_1.decimalColumn)()),
    __metadata("design:type", Number)
], BankMovement.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], BankMovement.prototype, "sales_invoice_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, default: 'PENDIENTE' }),
    __metadata("design:type", String)
], BankMovement.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BankMovement.prototype, "created_at", void 0);
exports.BankMovement = BankMovement = __decorate([
    (0, typeorm_1.Entity)('bank_movements'),
    (0, typeorm_1.Index)(['tenant_id', 'movement_date'])
], BankMovement);
let BankReconciliation = class BankReconciliation {
    reconciliation_id;
    tenant_id;
    statement_id;
    movement_id;
    reconciliation_type;
    notes;
    matched_at;
};
exports.BankReconciliation = BankReconciliation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BankReconciliation.prototype, "reconciliation_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BankReconciliation.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BankReconciliation.prototype, "statement_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], BankReconciliation.prototype, "movement_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30 }),
    __metadata("design:type", String)
], BankReconciliation.prototype, "reconciliation_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], BankReconciliation.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BankReconciliation.prototype, "matched_at", void 0);
exports.BankReconciliation = BankReconciliation = __decorate([
    (0, typeorm_1.Entity)('bank_reconciliations')
], BankReconciliation);
//# sourceMappingURL=bank.entity.js.map