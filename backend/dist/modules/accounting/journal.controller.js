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
exports.JournalController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const decorators_1 = require("../../common/decorators");
const journal_service_1 = require("./journal.service");
class ManualLineDto {
    account_code;
    account_id;
    description;
    debit_ves;
    credit_ves;
    third_party_rif;
    cost_center;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ManualLineDto.prototype, "account_code", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ManualLineDto.prototype, "account_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ManualLineDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ManualLineDto.prototype, "debit_ves", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ManualLineDto.prototype, "credit_ves", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ManualLineDto.prototype, "third_party_rif", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ManualLineDto.prototype, "cost_center", void 0);
class CreateEntryDto {
    entry_date;
    concept;
    bcv_exchange_rate;
    lines;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEntryDto.prototype, "entry_date", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEntryDto.prototype, "concept", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateEntryDto.prototype, "bcv_exchange_rate", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(2),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ManualLineDto),
    __metadata("design:type", Array)
], CreateEntryDto.prototype, "lines", void 0);
function requireTenant(t) {
    if (!t)
        throw new common_1.BadRequestException('Seleccione una empresa (X-Tenant-Id)');
    return t;
}
let JournalController = class JournalController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    list(t, year, period, status) {
        return this.svc.list(requireTenant(t), {
            year: year ? parseInt(year, 10) : undefined,
            period: period ? parseInt(period, 10) : undefined,
            status,
        });
    }
    get(t, id) {
        return this.svc.get(requireTenant(t), id);
    }
    create(t, u, dto) {
        return this.svc.createManual(requireTenant(t), u.sub, dto);
    }
    void(t, id) {
        return this.svc.void(requireTenant(t), id);
    }
};
exports.JournalController = JournalController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('period')),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], JournalController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], JournalController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(),
    (0, decorators_1.Roles)('ADMIN', 'CONTADOR'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, decorators_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, CreateEntryDto]),
    __metadata("design:returntype", void 0)
], JournalController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/void'),
    (0, decorators_1.Roles)('ADMIN', 'CONTADOR'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], JournalController.prototype, "void", null);
exports.JournalController = JournalController = __decorate([
    (0, common_1.Controller)('journal-entries'),
    __metadata("design:paramtypes", [journal_service_1.JournalService])
], JournalController);
//# sourceMappingURL=journal.controller.js.map