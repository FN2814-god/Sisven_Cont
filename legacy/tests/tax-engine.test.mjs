import test from 'node:test';
import assert from 'node:assert/strict';

// Importamos o implementamos el equivalente directo en JS para el runner nativo de Node
// Validador de RIF
class RifValidator {
  static PREFIX_VALUES = { V: 1, E: 2, J: 3, P: 4, G: 5, C: 6 };
  static WEIGHTS = [3, 2, 7, 6, 5, 4, 3, 2];

  static clean(rif) {
    if (!rif) return '';
    return rif.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  static format(rif) {
    const cleaned = this.clean(rif);
    if (cleaned.length !== 10) return rif;
    return `${cleaned[0]}-${cleaned.substring(1, 9)}-${cleaned[9]}`;
  }

  static calculateCheckDigit(prefix, bodyDigits) {
    const pVal = this.PREFIX_VALUES[prefix];
    if (!pVal) throw new Error(`Prefijo inválido: ${prefix}`);
    const padded = bodyDigits.padStart(8, '0');
    let sum = pVal * 4;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(padded[i], 10) * this.WEIGHTS[i];
    }
    const rem = sum % 11;
    return rem <= 1 ? 0 : 11 - rem;
  }

  static isValid(rif) {
    const cleaned = this.clean(rif);
    if (!/^[VEJPGC]\d{9}$/.test(cleaned)) return false;
    const prefix = cleaned[0];
    const body = cleaned.substring(1, 9);
    const expected = parseInt(cleaned[9], 10);
    return this.calculateCheckDigit(prefix, body) === expected;
  }
}

// BcvExchangeService
class BcvExchangeService {
  static round(val, decimals = 2) {
    const factor = Math.pow(10, decimals);
    const n = +(val * factor);
    const i = Math.floor(n);
    const f = n - i;
    const e = 1e-8;
    let r = (f > 0.5 - e && f < 0.5 + e) ? (i % 2 === 0 ? i : i + 1) : Math.round(n);
    return +(r / factor).toFixed(decimals);
  }

  static convertUsdToVes(amountUsd, rate) {
    if (rate <= 0) throw new Error('Tasa debe ser > 0');
    return this.round(amountUsd * rate, 2);
  }

  static convertVesToUsd(amountVes, rate) {
    if (rate <= 0) throw new Error('Tasa debe ser > 0');
    return this.round(amountVes / rate, 2);
  }

  static formatSeniatDecimal(amount) {
    return this.round(amount, 2).toFixed(2);
  }
}

// IvaRetentionEngine
class IvaRetentionEngine {
  static isAgentOfRetention(isSpecialTaxpayer) {
    return Boolean(isSpecialTaxpayer);
  }

  static evaluateRetention(input) {
    const { buyer, supplier, bcvExchangeRate } = input;
    const baseImponibleTotal = BcvExchangeService.round(
      input.baseImponible16 + input.baseImponible8 + input.baseImponible31,
      2
    );
    const debitoFiscalTotal = BcvExchangeService.round(
      input.debitoFiscal16 + input.debitoFiscal8 + input.debitoFiscal31,
      2
    );

    if (!this.isAgentOfRetention(buyer.isSpecialTaxpayer)) {
      return {
        isSubjectToRetention: false,
        retentionPercentage: 0.0,
        baseImponibleTotal,
        debitoFiscalTotal,
        montoIvaRetenido: 0.0,
        montoIvaRetenidoUsd: 0.0,
        appliedReason: 'El comprador no es Contribuyente Especial (SPE).',
      };
    }

    if (debitoFiscalTotal <= 0) {
      return {
        isSubjectToRetention: false,
        retentionPercentage: 0.0,
        baseImponibleTotal,
        debitoFiscalTotal: 0.0,
        montoIvaRetenido: 0.0,
        montoIvaRetenidoUsd: 0.0,
        appliedReason: 'La operación no genera débito fiscal gravable.',
      };
    }

    let retentionPercentage = 75.0;
    let appliedReason = 'Alícuota general de retención del 75%.';

    const isRifValidChecksum = RifValidator.isValid(supplier.rif);
    if (!isRifValidChecksum || !supplier.isRifActiveInSeniat || !supplier.isRifValid) {
      retentionPercentage = 100.0;
      appliedReason = 'Retención del 100%: RIF del proveedor inválido o inactivo.';
    } else if (!input.isVatDiscriminated) {
      retentionPercentage = 100.0;
      appliedReason = 'Retención del 100%: IVA no discriminado en la factura.';
    } else if (input.isContingencyInvoice && !input.hasAuthorizedControlNumber) {
      retentionPercentage = 100.0;
      appliedReason = 'Retención del 100%: Factura en contingencia no autorizada.';
    } else if (supplier.forced100PercentRetention) {
      retentionPercentage = 100.0;
      appliedReason = 'Retención del 100%: Proveedor catalogado con 100% por SENIAT.';
    }

    const montoIvaRetenido = BcvExchangeService.round(
      debitoFiscalTotal * (retentionPercentage / 100),
      2
    );
    const montoIvaRetenidoUsd = BcvExchangeService.convertVesToUsd(
      montoIvaRetenido,
      bcvExchangeRate
    );

    return {
      isSubjectToRetention: true,
      retentionPercentage,
      baseImponibleTotal,
      debitoFiscalTotal,
      montoIvaRetenido,
      montoIvaRetenidoUsd,
      appliedReason,
    };
  }
}

// IslrRetentionEngine
class IslrRetentionEngine {
  static SUSTRAENDO_FACTOR = 83.3334;
  static CONCEPTS = {
    '001': { code: '001', basePercentage: 100.0, taxRatePercentage: 3.0, appliesSustraendo: true },
    '002': { code: '002', basePercentage: 100.0, taxRatePercentage: 5.0, appliesSustraendo: false },
    '055': { code: '055', basePercentage: 100.0, taxRatePercentage: 1.0, appliesSustraendo: true },
    '057': { code: '057', basePercentage: 100.0, taxRatePercentage: 2.0, appliesSustraendo: false },
    '061': { code: '061', basePercentage: 100.0, taxRatePercentage: 3.0, appliesSustraendo: true },
    '063': { code: '063', basePercentage: 100.0, taxRatePercentage: 5.0, appliesSustraendo: false },
  };

  static calculateSustraendo(utValue, rate) {
    if (utValue <= 0 || rate <= 0) return 0.0;
    return BcvExchangeService.round(utValue * (rate / 100.0) * this.SUSTRAENDO_FACTOR, 2);
  }

  static calculateMinimumExemptThreshold(utValue) {
    return BcvExchangeService.round(utValue * this.SUSTRAENDO_FACTOR, 2);
  }

  static calculateRetention(input) {
    const concept = this.CONCEPTS[input.conceptCode];
    if (!concept) throw new Error(`Concepto desconocido: ${input.conceptCode}`);
    const { amount, currentUtValue, beneficiaryType } = input;
    const baseImponible = BcvExchangeService.round(amount * (concept.basePercentage / 100.0), 2);
    const grossTax = BcvExchangeService.round(baseImponible * (concept.taxRatePercentage / 100.0), 2);

    if (concept.appliesSustraendo && beneficiaryType === 'PNR') {
      const minThreshold = this.calculateMinimumExemptThreshold(currentUtValue);
      if (amount < minThreshold) {
        return {
          conceptCode: concept.code,
          operationAmount: amount,
          baseImponible,
          grossTax,
          sustraendo: 0.0,
          netTaxRetained: 0.0,
          isExemptByMinimumThreshold: true,
        };
      }
      const sustraendo = this.calculateSustraendo(currentUtValue, concept.taxRatePercentage);
      const netTax = Math.max(0.0, BcvExchangeService.round(grossTax - sustraendo, 2));
      return {
        conceptCode: concept.code,
        operationAmount: amount,
        baseImponible,
        grossTax,
        sustraendo,
        netTaxRetained: netTax,
        isExemptByMinimumThreshold: false,
      };
    }

    return {
      conceptCode: concept.code,
      operationAmount: amount,
      baseImponible,
      grossTax,
      sustraendo: 0.0,
      netTaxRetained: grossTax,
      isExemptByMinimumThreshold: false,
    };
  }
}

// SeniatFileGenerator
class SeniatFileGenerator {
  static generateVatTxt(records) {
    return records.map(r => {
      const fields = [
        RifValidator.clean(r.rifAgente),
        r.periodoImpositivo,
        r.fechaFactura,
        r.tipoOperacion || 'C',
        r.tipoDocumento,
        RifValidator.clean(r.rifProveedor),
        r.numeroFactura.trim(),
        r.numeroControl.trim(),
        BcvExchangeService.formatSeniatDecimal(r.montoTotalConIva),
        BcvExchangeService.formatSeniatDecimal(r.baseImponible),
        BcvExchangeService.formatSeniatDecimal(r.montoIvaRetenido),
        r.numeroFacturaAfectada?.trim() || '0',
        r.numeroComprobante,
        BcvExchangeService.formatSeniatDecimal(r.montoExento),
        BcvExchangeService.formatSeniatDecimal(r.alicuotaAplicada),
        r.numeroExpedienteImportacion?.trim() || '0'
      ];
      return fields.join('\t');
    }).join('\r\n');
  }

  static generateIslrXml(rifAgente, periodo, detalles) {
    const cleanAgente = RifValidator.clean(rifAgente);
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<RelacionRetencionesISLR RifAgente="${cleanAgente}" Periodo="${periodo}">\n`;
    for (const d of detalles) {
      xml += `  <DetalleRetencion>\n`;
      xml += `    <RifRetenido>${RifValidator.clean(d.rifRetenido)}</RifRetenido>\n`;
      xml += `    <NumeroFactura>${d.numeroFactura}</NumeroFactura>\n`;
      xml += `    <NumeroControl>${d.numeroControl}</NumeroControl>\n`;
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
}

// =========================================================================================
// SUITE DE PRUEBAS UNITARIAS
// =========================================================================================

test('1. Validador Módulo 11 de RIFs venezolanos canónicos y bordes', () => {
  // RIFs reales válidos
  assert.equal(RifValidator.isValid('J-00006372-9'), true, 'Polar debe ser válido');
  assert.equal(RifValidator.isValid('J306842675'), true, 'MercadoLibre debe ser válido');
  assert.equal(RifValidator.isValid('G-20000303-0'), true, 'SENIAT debe ser válido');
  assert.equal(RifValidator.isValid('V123456781'), true, 'Persona Natural debe ser válido');

  // RIFs inválidos
  assert.equal(RifValidator.isValid('J-00006372-8'), false, 'Dígito verificador incorrecto');
  assert.equal(RifValidator.isValid('Z-12345678-0'), false, 'Prefijo no reconocido');
  assert.equal(RifValidator.isValid('J-123-0'), false, 'Longitud incorrecta');

  // Formateo
  assert.equal(RifValidator.format('J000063729'), 'J-00006372-9');
});

test('2. Motor de Retenciones de IVA (PA SNAT/2025/000054)', () => {
  const bcvRate = 40.0;

  // Caso 1: Comprador NO es Contribuyente Especial -> 0% retención
  const res1 = IvaRetentionEngine.evaluateRetention({
    invoiceNumber: '0001',
    controlNumber: '00-0001',
    invoiceDate: '2026-03-15',
    documentType: '01',
    isContingencyInvoice: false,
    hasAuthorizedControlNumber: true,
    isVatDiscriminated: true,
    buyer: { rif: 'J-12345678-9', razonSocial: 'Pyme Ordinaria', isSpecialTaxpayer: false },
    supplier: { rif: 'J-00006372-9', razonSocial: 'Proveedor Regular', isRifValid: true, isRifActiveInSeniat: true },
    baseImponible16: 1000.0,
    baseImponible8: 0,
    baseImponible31: 0,
    montoExento: 0,
    debitoFiscal16: 160.0,
    debitoFiscal8: 0,
    debitoFiscal31: 0,
    totalInvoiceWithVat: 1160.0,
    bcvExchangeRate: bcvRate,
  });
  assert.equal(res1.isSubjectToRetention, false);
  assert.equal(res1.retentionPercentage, 0.0);
  assert.equal(res1.montoIvaRetenido, 0.0);

  // Caso 2: Comprador SPE + Proveedor válido + Factura en regla -> 75% retención
  const res2 = IvaRetentionEngine.evaluateRetention({
    invoiceNumber: '0002',
    controlNumber: '00-0002',
    invoiceDate: '2026-03-15',
    documentType: '01',
    isContingencyInvoice: false,
    hasAuthorizedControlNumber: true,
    isVatDiscriminated: true,
    buyer: { rif: 'J-29876543-1', razonSocial: 'Agente SPE', isSpecialTaxpayer: true },
    supplier: { rif: 'J-00006372-9', razonSocial: 'Proveedor Regular', isRifValid: true, isRifActiveInSeniat: true },
    baseImponible16: 1000.0,
    baseImponible8: 0,
    baseImponible31: 0,
    montoExento: 0,
    debitoFiscal16: 160.0,
    debitoFiscal8: 0,
    debitoFiscal31: 0,
    totalInvoiceWithVat: 1160.0,
    bcvExchangeRate: bcvRate,
  });
  assert.equal(res2.isSubjectToRetention, true);
  assert.equal(res2.retentionPercentage, 75.0);
  assert.equal(res2.montoIvaRetenido, 120.0); // 160 * 75%
  assert.equal(res2.montoIvaRetenidoUsd, 3.0); // 120 / 40.0

  // Caso 3: Causal 100% -> IVA no discriminado
  const res3 = IvaRetentionEngine.evaluateRetention({
    invoiceNumber: '0003',
    controlNumber: '00-0003',
    invoiceDate: '2026-03-15',
    documentType: '01',
    isContingencyInvoice: false,
    hasAuthorizedControlNumber: true,
    isVatDiscriminated: false, // NO discriminado
    buyer: { rif: 'J-29876543-1', razonSocial: 'Agente SPE', isSpecialTaxpayer: true },
    supplier: { rif: 'J-00006372-9', razonSocial: 'Proveedor Regular', isRifValid: true, isRifActiveInSeniat: true },
    baseImponible16: 1000.0,
    baseImponible8: 0,
    baseImponible31: 0,
    montoExento: 0,
    debitoFiscal16: 160.0,
    debitoFiscal8: 0,
    debitoFiscal31: 0,
    totalInvoiceWithVat: 1160.0,
    bcvExchangeRate: bcvRate,
  });
  assert.equal(res3.retentionPercentage, 100.0);
  assert.equal(res3.montoIvaRetenido, 160.0);

  // Caso 4: Causal 100% -> Factura en contingencia sin número de control autorizado
  const res4 = IvaRetentionEngine.evaluateRetention({
    invoiceNumber: '0004',
    controlNumber: 'SIN-NUMERO',
    invoiceDate: '2026-03-15',
    documentType: '01',
    isContingencyInvoice: true,
    hasAuthorizedControlNumber: false,
    isVatDiscriminated: true,
    buyer: { rif: 'J-29876543-1', razonSocial: 'Agente SPE', isSpecialTaxpayer: true },
    supplier: { rif: 'J-00006372-9', razonSocial: 'Proveedor Regular', isRifValid: true, isRifActiveInSeniat: true },
    baseImponible16: 1000.0,
    baseImponible8: 0,
    baseImponible31: 0,
    montoExento: 0,
    debitoFiscal16: 160.0,
    debitoFiscal8: 0,
    debitoFiscal31: 0,
    totalInvoiceWithVat: 1160.0,
    bcvExchangeRate: bcvRate,
  });
  assert.equal(res4.retentionPercentage, 100.0);
  assert.equal(res4.montoIvaRetenido, 160.0);
});

test('3. Motor de Retenciones de ISLR y Sustraendo (Decreto 1808)', () => {
  const currentUtValue = 9.0; // Valor de la Unidad Tributaria
  const minThreshold = 9.0 * 83.3334; // 750.0006 -> 750.00 Bs

  // Caso 1: Persona Natural Residente (001 - 3%) con monto MENOR a la base mínima legal
  const res1 = IslrRetentionEngine.calculateRetention({
    conceptCode: '001',
    amount: 500.0, // menor a ~750 Bs
    currentUtValue,
    beneficiaryType: 'PNR',
  });
  assert.equal(res1.isExemptByMinimumThreshold, true);
  assert.equal(res1.netTaxRetained, 0.0);

  // Caso 2: Persona Natural Residente (001 - 3%) con monto MAYOR a la base mínima
  // Monto: 10,000 Bs.
  // Impuesto Bruto = 10,000 * 3% = 300.00 Bs.
  // Sustraendo = 9.0 * 0.03 * 83.3334 = 22.50 Bs.
  // Impuesto Neto Retenido = 300.00 - 22.50 = 277.50 Bs.
  const res2 = IslrRetentionEngine.calculateRetention({
    conceptCode: '001',
    amount: 10000.0,
    currentUtValue,
    beneficiaryType: 'PNR',
  });
  assert.equal(res2.isExemptByMinimumThreshold, false);
  assert.equal(res2.grossTax, 300.0);
  assert.equal(res2.sustraendo, 22.5);
  assert.equal(res2.netTaxRetained, 277.5);

  // Caso 3: Persona Jurídica Domiciliada (057 - 2% Servicios)
  // Monto: 10,000 Bs. NO aplica sustraendo
  // Impuesto = 10,000 * 2% = 200.00 Bs.
  const res3 = IslrRetentionEngine.calculateRetention({
    conceptCode: '057',
    amount: 10000.0,
    currentUtValue,
    beneficiaryType: 'PJ_DOM',
  });
  assert.equal(res3.sustraendo, 0.0);
  assert.equal(res3.netTaxRetained, 200.0);
});

test('4. Generación de Archivo TXT de Retenciones de IVA (16 campos tabulados)', () => {
  const records = [
    {
      rifAgente: 'J-12345678-9',
      periodoImpositivo: '202603',
      fechaFactura: '2026-03-15',
      tipoOperacion: 'C',
      tipoDocumento: '01',
      rifProveedor: 'J-00006372-9',
      numeroFactura: '00012345',
      numeroControl: '00-001234',
      montoTotalConIva: 1160.0,
      baseImponible: 1000.0,
      montoIvaRetenido: 120.0,
      numeroFacturaAfectada: '0',
      numeroComprobante: '20260300000001',
      montoExento: 0.0,
      alicuotaAplicada: 16.0,
      numeroExpedienteImportacion: '0',
    },
  ];

  const txt = SeniatFileGenerator.generateVatTxt(records);
  const fields = txt.split('\t');

  assert.equal(fields.length, 16, 'Debe contener exactamente 16 campos');
  assert.equal(fields[0], 'J123456789'); // RIF Agente sin guiones
  assert.equal(fields[1], '202603');     // Periodo AAAAMM
  assert.equal(fields[2], '2026-03-15'); // Fecha AAAA-MM-DD
  assert.equal(fields[3], 'C');          // Tipo Operación
  assert.equal(fields[4], '01');         // Factura
  assert.equal(fields[5], 'J000063729'); // RIF Proveedor sin guiones
  assert.equal(fields[6], '00012345');   // Factura
  assert.equal(fields[7], '00-001234');  // Control
  assert.equal(fields[8], '1160.00');    // Total
  assert.equal(fields[9], '1000.00');    // Base
  assert.equal(fields[10], '120.00');    // Monto Retenido
  assert.equal(fields[11], '0');         // Afectada
  assert.equal(fields[12], '20260300000001'); // Comprobante 14 digitos
  assert.equal(fields[13], '0.00');      // Exento
  assert.equal(fields[14], '16.00');     // Alicuota
  assert.equal(fields[15], '0');         // Expediente
});

test('5. Generación de Archivo XML de Retenciones de ISLR (XSD SENIAT)', () => {
  const xml = SeniatFileGenerator.generateIslrXml('J-12345678-9', '202603', [
    {
      rifRetenido: 'J-00006372-9',
      numeroFactura: '00012345',
      numeroControl: '00-001234',
      fechaOperacion: '15/03/2026',
      codigoConcepto: '057',
      montoOperacion: 5000.0,
      porcentajeRetencion: 2.0,
      montoSustraendo: 0.0,
      montoRetenido: 100.0,
    },
  ]);

  assert.ok(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('<RelacionRetencionesISLR RifAgente="J123456789" Periodo="202603">'));
  assert.ok(xml.includes('<RifRetenido>J000063729</RifRetenido>'));
  assert.ok(xml.includes('<FechaOperacion>15/03/2026</FechaOperacion>'));
  assert.ok(xml.includes('<CodigoConcepto>057</CodigoConcepto>'));
  assert.ok(xml.includes('<MontoOperacion>5000.00</MontoOperacion>'));
  assert.ok(xml.includes('<MontoRetenido>100.00</MontoRetenido>'));
});
