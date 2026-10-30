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
exports.RetentionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fiscal_entity_1 = require("../../entities/fiscal.entity");
const seniat_file_generator_1 = require("../../shared/seniat/seniat-file-generator");
const rif_validator_1 = require("../../shared/seniat/rif-validator");
const PERIOD_RE = /^\d{6}$/;
let RetentionsService = class RetentionsService {
    iva;
    islr;
    constructor(iva, islr) {
        this.iva = iva;
        this.islr = islr;
    }
    listIva(tenantId, periodo) {
        const where = { tenant_id: tenantId };
        if (periodo)
            where.periodo_impositivo = periodo;
        return this.iva.find({ where, order: { fecha_factura: 'DESC' } });
    }
    listIslr(tenantId, periodo) {
        const where = { tenant_id: tenantId };
        if (periodo)
            where.periodo_anomes = periodo;
        return this.islr.find({ where, order: { fecha_operacion: 'DESC' } });
    }
    async generateVatTxt(tenantId, periodo) {
        if (!PERIOD_RE.test(periodo)) {
            throw new common_1.BadRequestException('El período debe tener formato AAAAMM');
        }
        const rows = await this.iva.find({
            where: { tenant_id: tenantId, periodo_impositivo: periodo },
            order: { numero_comprobante: 'ASC' },
        });
        const records = rows.map((r) => ({
            rifAgente: r.rif_agente,
            periodoImpositivo: r.periodo_impositivo,
            fechaFactura: r.fecha_factura,
            tipoOperacion: 'C',
            tipoDocumento: r.tipo_documento,
            rifProveedor: r.rif_retenido,
            numeroFactura: r.numero_factura,
            numeroControl: r.numero_control,
            montoTotalConIva: r.monto_total_con_iva,
            baseImponible: r.base_imponible,
            montoIvaRetenido: r.monto_iva_retenido,
            numeroFacturaAfectada: r.numero_factura_afectada,
            numeroComprobante: r.numero_comprobante,
            montoExento: r.monto_exento,
            alicuotaAplicada: r.alicuota_aplicada,
            numeroExpedienteImportacion: r.numero_expediente,
        }));
        return { filename: `retenciones_iva_${periodo}.txt`, content: seniat_file_generator_1.SeniatFileGenerator.generateVatTxt(records) };
    }
    async generateIslrXml(tenantId, periodo) {
        if (!PERIOD_RE.test(periodo)) {
            throw new common_1.BadRequestException('El período debe tener formato AAAAMM');
        }
        const rows = await this.islr.find({
            where: { tenant_id: tenantId, periodo_anomes: periodo },
            order: { fecha_operacion: 'ASC' },
        });
        if (!rows.length)
            throw new common_1.BadRequestException('No hay retenciones de ISLR en el período');
        const fmt = (d) => `${d.substring(8, 10)}/${d.substring(5, 7)}/${d.substring(0, 4)}`;
        const detalles = rows.map((r) => ({
            rifRetenido: r.rif_retenido,
            numeroFactura: r.numero_factura,
            numeroControl: r.numero_control,
            fechaOperacion: fmt(r.fecha_operacion),
            codigoConcepto: r.codigo_concepto,
            montoOperacion: r.monto_operacion,
            porcentajeRetencion: r.porcentaje_retencion,
            montoSustraendo: r.monto_sustraendo,
            montoRetenido: r.monto_retenido,
        }));
        const rifAgente = rif_validator_1.RifValidator.clean(rows[0].rif_agente);
        return {
            filename: `retenciones_islr_${periodo}.xml`,
            content: seniat_file_generator_1.SeniatFileGenerator.generateIslrXml(rifAgente, periodo, detalles),
        };
    }
};
exports.RetentionsService = RetentionsService;
exports.RetentionsService = RetentionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(fiscal_entity_1.TaxRetentionIva)),
    __param(1, (0, typeorm_1.InjectRepository)(fiscal_entity_1.TaxRetentionIslr)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], RetentionsService);
//# sourceMappingURL=retentions.service.js.map