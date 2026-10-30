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
exports.Tenant = void 0;
const typeorm_1 = require("typeorm");
const numeric_transformer_1 = require("../common/numeric.transformer");
let Tenant = class Tenant {
    tenant_id;
    rif;
    razon_social;
    nombre_comercial;
    es_contribuyente_especial;
    porcentaje_retencion_iva;
    moneda_funcional;
    moneda_presentacion;
    tasa_bcv_manual;
    is_active;
    created_at;
};
exports.Tenant = Tenant;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Tenant.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Tenant.prototype, "rif", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Tenant.prototype, "razon_social", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], Tenant.prototype, "nombre_comercial", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Tenant.prototype, "es_contribuyente_especial", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(5, 2), default: 75.0 }),
    __metadata("design:type", Number)
], Tenant.prototype, "porcentaje_retencion_iva", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, default: 'VES' }),
    __metadata("design:type", String)
], Tenant.prototype, "moneda_funcional", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, default: 'USD' }),
    __metadata("design:type", String)
], Tenant.prototype, "moneda_presentacion", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(18, 6), nullable: true }),
    __metadata("design:type", Object)
], Tenant.prototype, "tasa_bcv_manual", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Tenant.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Tenant.prototype, "created_at", void 0);
exports.Tenant = Tenant = __decorate([
    (0, typeorm_1.Entity)('tenants')
], Tenant);
//# sourceMappingURL=tenant.entity.js.map