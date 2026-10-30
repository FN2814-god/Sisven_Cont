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
exports.JournalEntryLine = exports.JournalEntry = exports.FiscalPeriod = exports.ChartOfAccount = void 0;
const typeorm_1 = require("typeorm");
const numeric_transformer_1 = require("../common/numeric.transformer");
let ChartOfAccount = class ChartOfAccount {
    account_id;
    tenant_id;
    code;
    name;
    level;
    parent_id;
    nature;
    is_selectable;
    niif_classification;
};
exports.ChartOfAccount = ChartOfAccount;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ChartOfAccount.prototype, "account_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ChartOfAccount.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], ChartOfAccount.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ChartOfAccount.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], ChartOfAccount.prototype, "level", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], ChartOfAccount.prototype, "parent_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10 }),
    __metadata("design:type", String)
], ChartOfAccount.prototype, "nature", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ChartOfAccount.prototype, "is_selectable", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], ChartOfAccount.prototype, "niif_classification", void 0);
exports.ChartOfAccount = ChartOfAccount = __decorate([
    (0, typeorm_1.Entity)('chart_of_accounts'),
    (0, typeorm_1.Unique)(['tenant_id', 'code']),
    (0, typeorm_1.Index)(['tenant_id', 'parent_id'])
], ChartOfAccount);
let FiscalPeriod = class FiscalPeriod {
    period_id;
    tenant_id;
    fiscal_year;
    fiscal_month;
    status;
};
exports.FiscalPeriod = FiscalPeriod;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FiscalPeriod.prototype, "period_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], FiscalPeriod.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], FiscalPeriod.prototype, "fiscal_year", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], FiscalPeriod.prototype, "fiscal_month", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, default: 'ABIERTO' }),
    __metadata("design:type", String)
], FiscalPeriod.prototype, "status", void 0);
exports.FiscalPeriod = FiscalPeriod = __decorate([
    (0, typeorm_1.Entity)('fiscal_periods'),
    (0, typeorm_1.Unique)(['tenant_id', 'fiscal_year', 'fiscal_month'])
], FiscalPeriod);
let JournalEntry = class JournalEntry {
    entry_id;
    tenant_id;
    fiscal_year;
    fiscal_period;
    entry_number;
    entry_date;
    concept;
    source_module;
    source_document_id;
    status;
    bcv_exchange_rate;
    total_debit_ves;
    total_credit_ves;
    total_debit_usd;
    total_credit_usd;
    created_by;
    lines;
    created_at;
};
exports.JournalEntry = JournalEntry;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], JournalEntry.prototype, "entry_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], JournalEntry.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], JournalEntry.prototype, "fiscal_year", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], JournalEntry.prototype, "fiscal_period", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], JournalEntry.prototype, "entry_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], JournalEntry.prototype, "entry_date", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], JournalEntry.prototype, "concept", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10 }),
    __metadata("design:type", String)
], JournalEntry.prototype, "source_module", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], JournalEntry.prototype, "source_document_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, default: 'ASENTADO' }),
    __metadata("design:type", String)
], JournalEntry.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(18, 6) }),
    __metadata("design:type", Number)
], JournalEntry.prototype, "bcv_exchange_rate", void 0);
__decorate([
    (0, typeorm_1.Column)((0, numeric_transformer_1.decimalColumn)()),
    __metadata("design:type", Number)
], JournalEntry.prototype, "total_debit_ves", void 0);
__decorate([
    (0, typeorm_1.Column)((0, numeric_transformer_1.decimalColumn)()),
    __metadata("design:type", Number)
], JournalEntry.prototype, "total_credit_ves", void 0);
__decorate([
    (0, typeorm_1.Column)((0, numeric_transformer_1.decimalColumn)()),
    __metadata("design:type", Number)
], JournalEntry.prototype, "total_debit_usd", void 0);
__decorate([
    (0, typeorm_1.Column)((0, numeric_transformer_1.decimalColumn)()),
    __metadata("design:type", Number)
], JournalEntry.prototype, "total_credit_usd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], JournalEntry.prototype, "created_by", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => JournalEntryLine, (l) => l.entry, { cascade: true }),
    __metadata("design:type", Array)
], JournalEntry.prototype, "lines", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], JournalEntry.prototype, "created_at", void 0);
exports.JournalEntry = JournalEntry = __decorate([
    (0, typeorm_1.Entity)('journal_entries'),
    (0, typeorm_1.Index)(['tenant_id', 'fiscal_year', 'fiscal_period']),
    (0, typeorm_1.Index)(['tenant_id', 'status'])
], JournalEntry);
let JournalEntryLine = class JournalEntryLine {
    line_id;
    tenant_id;
    entry_id;
    entry;
    account_id;
    account_code;
    account_name;
    description;
    debit_ves;
    credit_ves;
    debit_usd;
    credit_usd;
    bcv_rate;
    third_party_rif;
    cost_center;
};
exports.JournalEntryLine = JournalEntryLine;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], JournalEntryLine.prototype, "line_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], JournalEntryLine.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], JournalEntryLine.prototype, "entry_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => JournalEntry, (e) => e.lines, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'entry_id' }),
    __metadata("design:type", JournalEntry)
], JournalEntryLine.prototype, "entry", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], JournalEntryLine.prototype, "account_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], JournalEntryLine.prototype, "account_code", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], JournalEntryLine.prototype, "account_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], JournalEntryLine.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(), default: 0 }),
    __metadata("design:type", Number)
], JournalEntryLine.prototype, "debit_ves", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(), default: 0 }),
    __metadata("design:type", Number)
], JournalEntryLine.prototype, "credit_ves", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(), default: 0 }),
    __metadata("design:type", Number)
], JournalEntryLine.prototype, "debit_usd", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(), default: 0 }),
    __metadata("design:type", Number)
], JournalEntryLine.prototype, "credit_usd", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(18, 6) }),
    __metadata("design:type", Number)
], JournalEntryLine.prototype, "bcv_rate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], JournalEntryLine.prototype, "third_party_rif", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], JournalEntryLine.prototype, "cost_center", void 0);
exports.JournalEntryLine = JournalEntryLine = __decorate([
    (0, typeorm_1.Entity)('journal_entry_lines'),
    (0, typeorm_1.Index)(['tenant_id', 'account_id']),
    (0, typeorm_1.Index)(['entry_id'])
], JournalEntryLine);
//# sourceMappingURL=accounting.entity.js.map