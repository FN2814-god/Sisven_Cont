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
exports.BanksController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const decorators_1 = require("../../common/decorators");
const banks_service_1 = require("./banks.service");
function requireTenant(t) {
    if (!t)
        throw new common_1.BadRequestException('Seleccione una empresa (X-Tenant-Id)');
    return t;
}
class BankAccountDto {
    bank_name;
    account_number;
    currency;
    description;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BankAccountDto.prototype, "bank_name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BankAccountDto.prototype, "account_number", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['VES', 'USD']),
    __metadata("design:type", String)
], BankAccountDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BankAccountDto.prototype, "description", void 0);
class StatementDto {
    bank_account_id;
    transaction_date;
    reference_number;
    description;
    movement_type;
    amount;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StatementDto.prototype, "bank_account_id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StatementDto.prototype, "transaction_date", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StatementDto.prototype, "reference_number", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StatementDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['DEBITO', 'CREDITO']),
    __metadata("design:type", String)
], StatementDto.prototype, "movement_type", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], StatementDto.prototype, "amount", void 0);
class MovementDto {
    bank_account_id;
    movement_date;
    reference_number;
    concept;
    movement_type;
    amount;
    sales_invoice_number;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MovementDto.prototype, "bank_account_id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MovementDto.prototype, "movement_date", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MovementDto.prototype, "reference_number", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MovementDto.prototype, "concept", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['DEBITO', 'CREDITO']),
    __metadata("design:type", String)
], MovementDto.prototype, "movement_type", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], MovementDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MovementDto.prototype, "sales_invoice_number", void 0);
class ReconcileDto {
    bank_account_id;
    bcv_rate;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReconcileDto.prototype, "bank_account_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ReconcileDto.prototype, "bcv_rate", void 0);
let BanksController = class BanksController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    accounts(t) { return this.svc.listAccounts(requireTenant(t)); }
    createAccount(t, dto) {
        return this.svc.createAccount(requireTenant(t), dto);
    }
    statements(t, status) {
        return this.svc.listStatements(requireTenant(t), status);
    }
    addStatement(t, dto) {
        return this.svc.addStatement(requireTenant(t), dto);
    }
    movements(t, status) {
        return this.svc.listMovements(requireTenant(t), status);
    }
    addMovement(t, dto) {
        return this.svc.addMovement(requireTenant(t), dto);
    }
    reconcile(t, dto) {
        return this.svc.reconcile(requireTenant(t), dto.bank_account_id, dto.bcv_rate);
    }
    match(t, id, movId) {
        return this.svc.manualMatch(requireTenant(t), id, movId);
    }
};
exports.BanksController = BanksController;
__decorate([
    (0, common_1.Get)('accounts'),
    __param(0, (0, decorators_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BanksController.prototype, "accounts", null);
__decorate([
    (0, common_1.Post)('accounts'),
    (0, decorators_1.Roles)('ADMIN', 'CONTADOR'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, BankAccountDto]),
    __metadata("design:returntype", void 0)
], BanksController.prototype, "createAccount", null);
__decorate([
    (0, common_1.Get)('statements'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BanksController.prototype, "statements", null);
__decorate([
    (0, common_1.Post)('statements'),
    (0, decorators_1.Roles)('ADMIN', 'CONTADOR'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, StatementDto]),
    __metadata("design:returntype", void 0)
], BanksController.prototype, "addStatement", null);
__decorate([
    (0, common_1.Get)('movements'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BanksController.prototype, "movements", null);
__decorate([
    (0, common_1.Post)('movements'),
    (0, decorators_1.Roles)('ADMIN', 'CONTADOR'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, MovementDto]),
    __metadata("design:returntype", void 0)
], BanksController.prototype, "addMovement", null);
__decorate([
    (0, common_1.Post)('reconcile'),
    (0, decorators_1.Roles)('ADMIN', 'CONTADOR'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ReconcileDto]),
    __metadata("design:returntype", void 0)
], BanksController.prototype, "reconcile", null);
__decorate([
    (0, common_1.Post)('statements/:id/match/:movementId'),
    (0, decorators_1.Roles)('ADMIN', 'CONTADOR'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('movementId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], BanksController.prototype, "match", null);
exports.BanksController = BanksController = __decorate([
    (0, common_1.Controller)('banks'),
    __metadata("design:paramtypes", [banks_service_1.BanksService])
], BanksController);
//# sourceMappingURL=banks.controller.js.map