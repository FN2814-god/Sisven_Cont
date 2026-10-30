import { IvaTxtRecord, IslrXmlDetailNode } from './types';
import { RifValidator } from './rif-validator';
import { BcvExchangeService } from './bcv-service';

/**
 * Generador de Archivos Oficiales para la Plataforma Fiscal del SENIAT.
 * Exporta el archivo TXT para declaración quincenal de retenciones de IVA
 * y el archivo XML bajo esquema XSD para retenciones de ISLR.
 */
export class SeniatFileGenerator {
  /**
   * Genera el contenido del archivo TXT de Retenciones de IVA Quincenal.
   * Reglas:
   * - 16 campos estrictos separados por tabuladores (\t).
   * - Sin encabezados de columna.
   * - Codificación UTF-8 / ASCII.
   * - RIFs sin guiones ni espacios (10 caracteres).
   * - Números decimales formateados con punto y 2 decimales (0.00).
   */
  public static generateVatTxt(records: IvaTxtRecord[]): string {
    const lines: string[] = [];

    for (const record of records) {
      const rifAgenteClean = RifValidator.clean(record.rifAgente);
      const rifProveedorClean = RifValidator.clean(record.rifProveedor);

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
        throw new Error(
          `Número de comprobante debe tener exactamente 14 dígitos (AAAAMM+8 correlativos): ${record.numeroComprobante}`
        );
      }

      // 16 campos exactos
      const fields = [
        rifAgenteClean,                                          // 1. RIF Agente (10 chars)
        record.periodoImpositivo,                                // 2. Período AAAAMM
        record.fechaFactura,                                     // 3. Fecha Factura AAAA-MM-DD
        record.tipoOperacion || 'C',                             // 4. Tipo Operación ('C')
        record.tipoDocumento,                                    // 5. Tipo Documento ('01', '02', '03')
        rifProveedorClean,                                       // 6. RIF Proveedor Retenido (10 chars)
        record.numeroFactura.trim(),                             // 7. Número Factura
        record.numeroControl.trim(),                             // 8. Número Control
        BcvExchangeService.formatSeniatDecimal(record.montoTotalConIva), // 9. Total con IVA
        BcvExchangeService.formatSeniatDecimal(record.baseImponible),    // 10. Base Imponible
        BcvExchangeService.formatSeniatDecimal(record.montoIvaRetenido), // 11. Monto Retenido
        record.numeroFacturaAfectada?.trim() || '0',             // 12. Factura Afectada ('0' si directa)
        record.numeroComprobante,                                // 13. Comprobante (14 dígitos)
        BcvExchangeService.formatSeniatDecimal(record.montoExento),      // 14. Monto Exento
        BcvExchangeService.formatSeniatDecimal(record.alicuotaAplicada), // 15. Alícuota
        record.numeroExpedienteImportacion?.trim() || '0',       // 16. Expediente Import ('0' si nac.)
      ];

      lines.push(fields.join('\t'));
    }

    return lines.join('\r\n');
  }

  /**
   * Genera el contenido del archivo XML para la declaración de retenciones de ISLR.
   * Reglas:
   * - Encabezado XML con codificación UTF-8.
   * - Tag raíz <RelacionRetencionesISLR RifAgente="..." Periodo="...">
   * - Nodos <DetalleRetencion>
   * - Fecha en formato estricto DD/MM/AAAA.
   * - Decimales con punto y sin separadores de miles.
   */
  public static generateIslrXml(
    rifAgente: string,
    periodoAnomes: string,
    detalles: IslrXmlDetailNode[]
  ): string {
    const cleanAgenteRif = RifValidator.clean(rifAgente);

    if (!/^[VEJPGC]\d{9}$/.test(cleanAgenteRif)) {
      throw new Error(`RIF del Agente inválido para XML ISLR: ${rifAgente}`);
    }

    if (!/^\d{6}$/.test(periodoAnomes)) {
      throw new Error(`El período debe tener formato AAAAMM (ej. 202603): ${periodoAnomes}`);
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<RelacionRetencionesISLR RifAgente="${cleanAgenteRif}" Periodo="${periodoAnomes}">\n`;

    for (const d of detalles) {
      const cleanRetenidoRif = RifValidator.clean(d.rifRetenido);

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
      xml += `    <MontoOperacion>${BcvExchangeService.formatSeniatDecimal(d.montoOperacion)}</MontoOperacion>\n`;
      xml += `    <PorcentajeRetencion>${BcvExchangeService.formatSeniatDecimal(d.porcentajeRetencion)}</PorcentajeRetencion>\n`;
      xml += `    <MontoSustraendo>${BcvExchangeService.formatSeniatDecimal(d.montoSustraendo)}</MontoSustraendo>\n`;
      xml += `    <MontoRetenido>${BcvExchangeService.formatSeniatDecimal(d.montoRetenido)}</MontoRetenido>\n`;
      xml += `  </DetalleRetencion>\n`;
    }

    xml += `</RelacionRetencionesISLR>`;
    return xml;
  }

  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
