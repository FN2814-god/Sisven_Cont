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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const decorators_1 = require("../../common/decorators");
const reports_service_1 = require("./reports.service");
function requireTenant(t) {
    if (!t)
        throw new common_1.BadRequestException('Seleccione una empresa (X-Tenant-Id)');
    return t;
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function requireDate(v, name) {
    if (!v || !DATE_RE.test(v))
        throw new common_1.BadRequestException(`${name} debe ser YYYY-MM-DD`);
    return v;
}
let ReportsController = class ReportsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    journalBook(t, year, period) {
        if (!year)
            throw new common_1.BadRequestException('year es requerido');
        return this.svc.journalBook(requireTenant(t), parseInt(year, 10), period ? parseInt(period, 10) : undefined);
    }
    ledger(t, accountId, from, to) {
        if (!accountId)
            throw new common_1.BadRequestException('account_id es requerido');
        return this.svc.ledger(requireTenant(t), accountId, requireDate(from, 'from'), requireDate(to, 'to'));
    }
    trialBalance(t, year, period) {
        if (!year || !period)
            throw new common_1.BadRequestException('year y period son requeridos');
        return this.svc.trialBalance(requireTenant(t), parseInt(year, 10), parseInt(period, 10));
    }
    balanceSheet(t, asOf) {
        return this.svc.balanceSheet(requireTenant(t), requireDate(asOf, 'as_of'));
    }
    incomeStatement(t, from, to) {
        return this.svc.incomeStatement(requireTenant(t), requireDate(from, 'from'), requireDate(to, 'to'));
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('journal-book'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "journalBook", null);
__decorate([
    (0, common_1.Get)('ledger'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Query)('account_id')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "ledger", null);
__decorate([
    (0, common_1.Get)('trial-balance'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "trialBalance", null);
__decorate([
    (0, common_1.Get)('balance-sheet'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Query)('as_of')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "balanceSheet", null);
__decorate([
    (0, common_1.Get)('income-statement'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "incomeStatement", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map