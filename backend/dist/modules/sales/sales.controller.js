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
exports.SalesController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const decorators_1 = require("../../common/decorators");
const sales_service_1 = require("./sales.service");
class SaleDto {
    fecha_factura;
    rif_comprador;
    nombre_comprador;
    numero_factura;
    numero_control;
    amounts_in;
    base_imponible;
    ventas_exentas;
    condicion;
    cobro_en;
    igtf_percibido_3;
    iva_retenido_terceros;
    bcv_exchange_rate;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaleDto.prototype, "fecha_factura", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaleDto.prototype, "rif_comprador", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaleDto.prototype, "nombre_comprador", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaleDto.prototype, "numero_factura", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaleDto.prototype, "numero_control", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['USD', 'VES']),
    __metadata("design:type", String)
], SaleDto.prototype, "amounts_in", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SaleDto.prototype, "base_imponible", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SaleDto.prototype, "ventas_exentas", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['CONTADO', 'CREDITO']),
    __metadata("design:type", String)
], SaleDto.prototype, "condicion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['USD', 'VES']),
    __metadata("design:type", String)
], SaleDto.prototype, "cobro_en", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SaleDto.prototype, "igtf_percibido_3", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SaleDto.prototype, "iva_retenido_terceros", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SaleDto.prototype, "bcv_exchange_rate", void 0);
function requireTenant(t) {
    if (!t)
        throw new common_1.BadRequestException('Seleccione una empresa (X-Tenant-Id)');
    return t;
}
let SalesController = class SalesController {
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
exports.SalesController = SalesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, decorators_1.Roles)('ADMIN', 'CONTADOR'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, decorators_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, SaleDto]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "create", null);
exports.SalesController = SalesController = __decorate([
    (0, common_1.Controller)('sales'),
    __metadata("design:paramtypes", [sales_service_1.SalesService])
], SalesController);
//# sourceMappingURL=sales.controller.js.map