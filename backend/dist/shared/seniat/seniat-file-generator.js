"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeniatFileGenerator = void 0;
const rif_validator_1 = require("./rif-validator");
const bcv_service_1 = require("./bcv-service");
class SeniatFileGenerator {
    static generateVatTxt(records) {
        const lines = [];
        for (const record of records) {
            const rifAgenteClean = rif_validator_1.RifValidator.clean(record.rifAgente);
            const rifProveedorClean = rif_validator_1.RifValidator.clean(record.rifProveedor);
            if (!/^[VEJPGC]\d{9}$/.test(rifAgenteClean)) {
                throw new Error(`RIF del Agente inválido para TXT SENIAT: ${record.rifAgente}`);
            }
            if (!/^[VEJPGC]\d{9}$/.test(rifProveedorClean)) {
                throw new Error(`RIF del Proveedor inválido para TXT SENIAT: ${record.rifProveedor}`);
            }
            if (!/^\d{6}$/.test(record.periodoImpositivo)) {
                throw new Error(`Período impositivo debe ser AAAAMM: ${record.periodoImpositivo}`);
            }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(record.fechaFactura)) {
                throw new Error(`Fecha de factura debe ser AAAA-MM-DD: ${record.fechaFactura}`);
            }
            if (!/^\d{14}$/.test(record.numeroComprobante)) {
                throw new Error(`Número de comprobante debe tener exactamente 14 dígitos (AAAAMM+8 correlativos): ${record.numeroComprobante}`);
            }
            const fields = [
                rifAgenteClean,
                record.periodoImpositivo,
                record.fechaFactura,
                record.tipoOperacion || 'C',
                record.tipoDocumento,
                rifProveedorClean,
                record.numeroFactura.trim(),
                record.numeroControl.trim(),
                bcv_service_1.BcvExchangeService.formatSeniatDecimal(record.montoTotalConIva),
                bcv_service_1.BcvExchangeService.formatSeniatDecimal(record.baseImponible),
                bcv_service_1.BcvExchangeService.formatSeniatDecimal(record.montoIvaRetenido),
                record.numeroFacturaAfectada?.trim() || '0',
                record.numeroComprobante,
                bcv_service_1.BcvExchangeService.formatSeniatDecimal(record.montoExento),
                bcv_service_1.BcvExchangeService.formatSeniatDecimal(record.alicuotaAplicada),
                record.numeroExpedienteImportacion?.trim() || '0',
            ];
            lines.push(fields.join('\t'));
        }
        return lines.join('\r\n');
    }
    static generateIslrXml(rifAgente, periodoAnomes, detalles) {
        const cleanAgenteRif = rif_validator_1.RifValidator.clean(rifAgente);
        if (!/^[VEJPGC]\d{9}$/.test(cleanAgenteRif)) {
            throw new Error(`RIF del Agente inválido para XML ISLR: ${rifAgente}`);
        }
        if (!/^\d{6}$/.test(periodoAnomes)) {
            throw new Error(`El período debe tener formato AAAAMM (ej. 202603): ${periodoAnomes}`);
        }
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<RelacionRetencionesISLR RifAgente="${cleanAgenteRif}" Periodo="${periodoAnomes}">\n`;
        for (const d of detalles) {
            const cleanRetenidoRif = rif_validator_1.RifValidator.clean(d.rifRetenido);
            if (!/^[VEJPGC]\d{9}$/.test(cleanRetenidoRif)) {
                throw new Error(`RIF Retenido inválido en detalle XML: ${d.rifRetenido}`);
            }
            if (!/^\d{2}\/\d{2}\/\d{4}$/.test(d.fechaOperacion)) {
                throw new Error(`Fecha de operación debe tener formato DD/MM/AAAA: ${d.fechaOperacion}`);
            }
            if (!/^\d{3}$/.test(d.codigoConcepto)) {
                throw new Error(`El código de concepto debe tener exactamente 3 dígitos: ${d.codigoConcepto}`);
            }
            xml += `  <DetalleRetencion>\n`;
            xml += `    <RifRetenido>${cleanRetenidoRif}</RifRetenido>\n`;
            xml += `    <NumeroFactura>${this.escapeXml(d.numeroFactura)}</NumeroFactura>\n`;
            xml += `    <NumeroControl>${this.escapeXml(d.numeroControl)}</NumeroControl>\n`;
            xml += `    <FechaOperacion>${d.fechaOperacion}</FechaOperacion>\n`;
            xml += `    <CodigoConcepto>${d.codigoConcepto}</CodigoConcepto>\n`;
            xml += `    <MontoOperacion>${bcv_service_1.BcvExchangeService.formatSeniatDecimal(d.montoOperacion)}</MontoOperacion>\n`;
            xml += `    <PorcentajeRetencion>${bcv_service_1.BcvExchangeService.formatSeniatDecimal(d.porcentajeRetencion)}</PorcentajeRetencion>\n`;
            xml += `    <MontoSustraendo>${bcv_service_1.BcvExchangeService.formatSeniatDecimal(d.montoSustraendo)}</MontoSustraendo>\n`;
            xml += `    <MontoRetenido>${bcv_service_1.BcvExchangeService.formatSeniatDecimal(d.montoRetenido)}</MontoRetenido>\n`;
            xml += `  </DetalleRetencion>\n`;
        }
        xml += `</RelacionRetencionesISLR>`;
        return xml;
    }
    static escapeXml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}
exports.SeniatFileGenerator = SeniatFileGenerator;
//# sourceMappingURL=seniat-file-generator.js.map