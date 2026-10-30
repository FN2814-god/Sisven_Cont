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
exports.PeriodsController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const decorators_1 = require("../../common/decorators");
const periods_service_1 = require("./periods.service");
class EnsureYearDto {
    year;
}
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(2000),
    (0, class_validator_1.Max)(2100),
    __metadata("design:type", Number)
], EnsureYearDto.prototype, "year", void 0);
function requireTenant(t) {
    if (!t)
        throw new common_1.BadRequestException('Seleccione una empresa (X-Tenant-Id)');
    return t;
}
let PeriodsController = class PeriodsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    list(t, year) {
        return this.svc.list(requireTenant(t), year ? parseInt(year, 10) : undefined);
    }
    ensure(t, dto) {
        return this.svc.ensureYear(requireTenant(t), dto.year);
    }
    close(t, id) {
        return this.svc.setStatus(requireTenant(t), id, 'CERRADO');
    }
    reopen(t, id) {
        return this.svc.setStatus(requireTenant(t), id, 'ABIERTO');
    }
};
exports.PeriodsController = PeriodsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PeriodsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('ensure'),
    (0, decorators_1.Roles)('ADMIN', 'CONTADOR'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, EnsureYearDto]),
    __metadata("design:returntype", void 0)
], PeriodsController.prototype, "ensure", null);
__decorate([
    (0, common_1.Post)(':id/close'),
    (0, decorators_1.Roles)('ADMIN', 'CONTADOR'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PeriodsController.prototype, "close", null);
__decorate([
    (0, common_1.Post)(':id/reopen'),
    (0, decorators_1.Roles)('ADMIN'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PeriodsController.prototype, "reopen", null);
exports.PeriodsController = PeriodsController = __decorate([
    (0, common_1.Controller)('fiscal-periods'),
    __metadata("design:paramtypes", [periods_service_1.PeriodsService])
], PeriodsController);
//# sourceMappingURL=periods.controller.js.map