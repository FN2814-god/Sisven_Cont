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
exports.PurchasesController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const decorators_1 = require("../../common/decorators");
const purchases_service_1 = require("./purchases.service");
class PurchaseDto {
    fecha_factura;
    rif_proveedor;
    nombre_proveedor;
    numero_factura;
    numero_control;
    expense_account_code;
    expense_description;
    amounts_in;
    base_imponible;
    compras_exentas;
    bcv_exchange_rate;
    porcentaje_retencion_iva;
    islr_concepto_codigo;
    islr_beneficiary_type;
    valor_ut;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PurchaseDto.prototype, "fecha_factura", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PurchaseDto.prototype, "rif_proveedor", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PurchaseDto.prototype, "nombre_proveedor", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PurchaseDto.prototype, "numero_factura", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PurchaseDto.prototype, "numero_control", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PurchaseDto.prototype, "expense_account_code", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PurchaseDto.prototype, "expense_description", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['USD', 'VES']),
    __metadata("design:type", String)
], PurchaseDto.prototype, "amounts_in", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PurchaseDto.prototype, "base_imponible", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PurchaseDto.prototype, "compras_exentas", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PurchaseDto.prototype, "bcv_exchange_rate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PurchaseDto.prototype, "porcentaje_retencion_iva", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(3, 3),
    __metadata("design:type", String)
], PurchaseDto.prototype, "islr_concepto_codigo", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['PNR', 'PNNR', 'PJ_DOM', 'PJ_NODOM']),
    __metadata("design:type", String)
], PurchaseDto.prototype, "islr_beneficiary_type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PurchaseDto.prototype, "valor_ut", void 0);
function requireTenant(t) {
    if (!t)
        throw new common_1.BadRequestException('Seleccione una empresa (X-Tenant-Id)');
    return t;
}
let PurchasesController = class PurchasesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    list(t, year, period) {
        return this.svc.list(requireTenant(t), year ? parseInt(year, 10) : undefined, period ? parseInt(period, 10) : undefined);
    }
    create(t, u, dto) {
        return this.svc.create(requireTenant(t), u.sub, dto);
    }
};
exports.PurchasesController = PurchasesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PurchasesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, decorators_1.Roles)('ADMIN', 'CONTADOR'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, decorators_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, PurchaseDto]),
    __metadata("design:returntype", void 0)
], PurchasesController.prototype, "create", null);
exports.PurchasesController = PurchasesController = __decorate([
    (0, common_1.Controller)('purchases'),
    __metadata("design:paramtypes", [purchases_service_1.PurchasesService])
], PurchasesController);
//# sourceMappingURL=purchases.controller.js.map