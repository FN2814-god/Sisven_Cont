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
exports.TaxRetentionIslr = exports.TaxRetentionIva = exports.PurchasesBook = exports.SalesBook = void 0;
const typeorm_1 = require("typeorm");
const numeric_transformer_1 = require("../common/numeric.transformer");
let SalesBook = class SalesBook {
    sale_id;
    tenant_id;
    fiscal_year;
    fiscal_period;
    numero_operacion;
    fecha_factura;
    rif_comprador;
    nombre_comprador;
    numero_factura;
    numero_control;
    total_ventas_con_iva;
    ventas_exentas;
    base_imponible_16;
    debito_fiscal_16;
    iva_retenido_terceros;
    igtf_percibido_3;
    bcv_exchange_rate;
    journal_entry_id;
    created_at;
};
exports.SalesBook = SalesBook;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SalesBook.prototype, "sale_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SalesBook.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], SalesBook.prototype, "fiscal_year", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], SalesBook.prototype, "fiscal_period", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], SalesBook.prototype, "numero_operacion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], SalesBook.prototype, "fecha_factura", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SalesBook.prototype, "rif_comprador", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SalesBook.prototype, "nombre_comprador", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SalesBook.prototype, "numero_factura", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SalesBook.prototype, "numero_control", void 0);
__decorate([
    (0, typeorm_1.Column)((0, numeric_transformer_1.decimalColumn)()),
    __metadata("design:type", Number)
], SalesBook.prototype, "total_ventas_con_iva", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(), default: 0 }),
    __metadata("design:type", Number)
], SalesBook.prototype, "ventas_exentas", void 0);
__decorate([
    (0, typeorm_1.Column)((0, numeric_transformer_1.decimalColumn)()),
    __metadata("design:type", Number)
], SalesBook.prototype, "base_imponible_16", void 0);
__decorate([
    (0, typeorm_1.Column)((0, numeric_transformer_1.decimalColumn)()),
    __metadata("design:type", Number)
], SalesBook.prototype, "debito_fiscal_16", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(), default: 0 }),
    __metadata("design:type", Number)
], SalesBook.prototype, "iva_retenido_terceros", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(), default: 0 }),
    __metadata("design:type", Number)
], SalesBook.prototype, "igtf_percibido_3", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(18, 6) }),
    __metadata("design:type", Number)
], SalesBook.prototype, "bcv_exchange_rate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], SalesBook.prototype, "journal_entry_id", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SalesBook.prototype, "created_at", void 0);
exports.SalesBook = SalesBook = __decorate([
    (0, typeorm_1.Entity)('sales_book'),
    (0, typeorm_1.Unique)(['tenant_id', 'numero_factura', 'numero_control']),
    (0, typeorm_1.Index)(['tenant_id', 'fiscal_year', 'fiscal_period'])
], SalesBook);
let PurchasesBook = class PurchasesBook {
    purchase_id;
    tenant_id;
    fiscal_year;
    fiscal_period;
    numero_operacion;
    fecha_factura;
    rif_proveedor;
    nombre_proveedor;
    numero_factura;
    numero_control;
    total_compras_con_iva;
    compras_exentas;
    base_imponible_16;
    credito_fiscal_16;
    iva_retenido;
    numero_comprobante_ret_iva;
    islr_retenido;
    islr_concepto_codigo;
    bcv_exchange_rate;
    journal_entry_id;
    created_at;
};
exports.PurchasesBook = PurchasesBook;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PurchasesBook.prototype, "purchase_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PurchasesBook.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], PurchasesBook.prototype, "fiscal_year", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], PurchasesBook.prototype, "fiscal_period", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], PurchasesBook.prototype, "numero_operacion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], PurchasesBook.prototype, "fecha_factura", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PurchasesBook.prototype, "rif_proveedor", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PurchasesBook.prototype, "nombre_proveedor", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PurchasesBook.prototype, "numero_factura", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PurchasesBook.prototype, "numero_control", void 0);
__decorate([
    (0, typeorm_1.Column)((0, numeric_transformer_1.decimalColumn)()),
    __metadata("design:type", Number)
], PurchasesBook.prototype, "total_compras_con_iva", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(), default: 0 }),
    __metadata("design:type", Number)
], PurchasesBook.prototype, "compras_exentas", void 0);
__decorate([
    (0, typeorm_1.Column)((0, numeric_transformer_1.decimalColumn)()),
    __metadata("design:type", Number)
], PurchasesBook.prototype, "base_imponible_16", void 0);
__decorate([
    (0, typeorm_1.Column)((0, numeric_transformer_1.decimalColumn)()),
    __metadata("design:type", Number)
], PurchasesBook.prototype, "credito_fiscal_16", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(), default: 0 }),
    __metadata("design:type", Number)
], PurchasesBook.prototype, "iva_retenido", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], PurchasesBook.prototype, "numero_comprobante_ret_iva", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(), default: 0 }),
    __metadata("design:type", Number)
], PurchasesBook.prototype, "islr_retenido", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], PurchasesBook.prototype, "islr_concepto_codigo", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(18, 6) }),
    __metadata("design:type", Number)
], PurchasesBook.prototype, "bcv_exchange_rate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], PurchasesBook.prototype, "journal_entry_id", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PurchasesBook.prototype, "created_at", void 0);
exports.PurchasesBook = PurchasesBook = __decorate([
    (0, typeorm_1.Entity)('purchases_book'),
    (0, typeorm_1.Index)(['tenant_id', 'fiscal_year', 'fiscal_period'])
], PurchasesBook);
let TaxRetentionIva = class TaxRetentionIva {
    retention_id;
    tenant_id;
    rif_agente;
    periodo_impositivo;
    fecha_factura;
    tipo_operacion;
    tipo_documento;
    rif_retenido;
    numero_factura;
    numero_control;
    monto_total_con_iva;
    base_imponible;
    monto_iva_retenido;
    numero_factura_afectada;
    numero_comprobante;
    monto_exento;
    alicuota_aplicada;
    numero_expediente;
    created_at;
};
exports.TaxRetentionIva = TaxRetentionIva;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TaxRetentionIva.prototype, "retention_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaxRetentionIva.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaxRetentionIva.prototype, "rif_agente", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 6 }),
    __metadata("design:type", String)
], TaxRetentionIva.prototype, "periodo_impositivo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], TaxRetentionIva.prototype, "fecha_factura", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 1, default: 'C' }),
    __metadata("design:type", String)
], TaxRetentionIva.prototype, "tipo_operacion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 2, default: '01' }),
    __metadata("design:type", String)
], TaxRetentionIva.prototype, "tipo_documento", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaxRetentionIva.prototype, "rif_retenido", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaxRetentionIva.prototype, "numero_factura", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaxRetentionIva.prototype, "numero_control", void 0);
__decorate([
    (0, typeorm_1.Column)((0, numeric_transformer_1.decimalColumn)()),
    __metadata("design:type", Number)
], TaxRetentionIva.prototype, "monto_total_con_iva", void 0);
__decorate([
    (0, typeorm_1.Column)((0, numeric_transformer_1.decimalColumn)()),
    __metadata("design:type", Number)
], TaxRetentionIva.prototype, "base_imponible", void 0);
__decorate([
    (0, typeorm_1.Column)((0, numeric_transformer_1.decimalColumn)()),
    __metadata("design:type", Number)
], TaxRetentionIva.prototype, "monto_iva_retenido", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '0' }),
    __metadata("design:type", String)
], TaxRetentionIva.prototype, "numero_factura_afectada", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 14 }),
    __metadata("design:type", String)
], TaxRetentionIva.prototype, "numero_comprobante", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(), default: 0 }),
    __metadata("design:type", Number)
], TaxRetentionIva.prototype, "monto_exento", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(5, 2), default: 16.0 }),
    __metadata("design:type", Number)
], TaxRetentionIva.prototype, "alicuota_aplicada", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '0' }),
    __metadata("design:type", String)
], TaxRetentionIva.prototype, "numero_expediente", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TaxRetentionIva.prototype, "created_at", void 0);
exports.TaxRetentionIva = TaxRetentionIva = __decorate([
    (0, typeorm_1.Entity)('tax_retentions_iva'),
    (0, typeorm_1.Unique)(['tenant_id', 'numero_comprobante'])
], TaxRetentionIva);
let TaxRetentionIslr = class TaxRetentionIslr {
    retention_id;
    tenant_id;
    rif_agente;
    periodo_anomes;
    rif_retenido;
    numero_factura;
    numero_control;
    fecha_operacion;
    codigo_concepto;
    monto_operacion;
    porcentaje_retencion;
    monto_sustraendo;
    monto_retenido;
    created_at;
};
exports.TaxRetentionIslr = TaxRetentionIslr;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TaxRetentionIslr.prototype, "retention_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaxRetentionIslr.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaxRetentionIslr.prototype, "rif_agente", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 6 }),
    __metadata("design:type", String)
], TaxRetentionIslr.prototype, "periodo_anomes", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaxRetentionIslr.prototype, "rif_retenido", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaxRetentionIslr.prototype, "numero_factura", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaxRetentionIslr.prototype, "numero_control", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], TaxRetentionIslr.prototype, "fecha_operacion", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3 }),
    __metadata("design:type", String)
], TaxRetentionIslr.prototype, "codigo_concepto", void 0);
__decorate([
    (0, typeorm_1.Column)((0, numeric_transformer_1.decimalColumn)()),
    __metadata("design:type", Number)
], TaxRetentionIslr.prototype, "monto_operacion", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(6, 2) }),
    __metadata("design:type", Number)
], TaxRetentionIslr.prototype, "porcentaje_retencion", void 0);
__decorate([
    (0, typeorm_1.Column)({ ...(0, numeric_transformer_1.decimalColumn)(), default: 0 }),
    __metadata("design:type", Number)
], TaxRetentionIslr.prototype, "monto_sustraendo", void 0);
__decorate([
    (0, typeorm_1.Column)((0, numeric_transformer_1.decimalColumn)()),
    __metadata("design:type", Number)
], TaxRetentionIslr.prototype, "monto_retenido", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TaxRetentionIslr.prototype, "created_at", void 0);
exports.TaxRetentionIslr = TaxRetentionIslr = __decorate([
    (0, typeorm_1.Entity)('tax_retentions_islr')
], TaxRetentionIslr);
//# sourceMappingURL=fiscal.entity.js.map