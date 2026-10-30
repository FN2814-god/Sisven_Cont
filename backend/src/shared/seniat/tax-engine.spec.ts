import { RifValidator } from './rif-validator';
import { IvaRetentionEngine } from './iva-retention-engine';
import { IslrRetentionEngine } from './islr-retention-engine';
import { SeniatFileGenerator } from './seniat-file-generator';

describe('Motor Tributario SENIAT', () => {
  test('1. Validador Módulo 11 de RIFs venezolanos canónicos y bordes', () => {
    expect(RifValidator.isValid('J-00006372-9')).toBe(true);
    expect(RifValidator.isValid('J306842675')).toBe(true);
    expect(RifValidator.isValid('G-20000303-0')).toBe(true);
    expect(RifValidator.isValid('V123456781')).toBe(true);

    expect(RifValidator.isValid('J-00006372-8')).toBe(false);
    expect(RifValidator.isValid('Z-12345678-0')).toBe(false);
    expect(RifValidator.isValid('J-123-0')).toBe(false);

    expect(RifValidator.format('J000063729')).toBe('J-00006372-9');
  });

  test('2. Motor de Retenciones de IVA (PA SNAT/2025/000054)', () => {
    const bcvRate = 40.0;
    const base = {
      invoiceDate: '2026-03-15',
      documentType: '01' as const,
      isContingencyInvoice: false,
      hasAuthorizedControlNumber: true,
      isVatDiscriminated: true,
      supplier: { rif: 'J-00006372-9', razonSocial: 'Proveedor Regular', isRifValid: true, isRifActiveInSeniat: true },
      baseImponible16: 1000.0, baseImponible8: 0, baseImponible31: 0, montoExento: 0,
      debitoFiscal16: 160.0, debitoFiscal8: 0, debitoFiscal31: 0,
      totalInvoiceWithVat: 1160.0, bcvExchangeRate: bcvRate,
    };

    // Comprador NO SPE -> 0%
    const res1 = IvaRetentionEngine.evaluateRetention({
      ...base, invoiceNumber: '0001', controlNumber: '00-0001',
      buyer: { rif: 'J-12345678-9', razonSocial: 'Pyme Ordinaria', isSpecialTaxpayer: false },
    });
    expect(res1.isSubjectToRetention).toBe(false);
    expect(res1.retentionPercentage).toBe(0.0);
    expect(res1.montoIvaRetenido).toBe(0.0);

    // SPE -> 75%
    const res2 = IvaRetentionEngine.evaluateRetention({
      ...base, invoiceNumber: '0002', controlNumber: '00-0002',
      buyer: { rif: 'J-29876543-1', razonSocial: 'Agente SPE', isSpecialTaxpayer: true },
    });
    expect(res2.isSubjectToRetention).toBe(true);
    expect(res2.retentionPercentage).toBe(75.0);
    expect(res2.montoIvaRetenido).toBe(120.0);
    expect(res2.montoIvaRetenidoUsd).toBe(3.0);

    // IVA no discriminado -> 100%
    const res3 = IvaRetentionEngine.evaluateRetention({
      ...base, invoiceNumber: '0003', controlNumber: '00-0003', isVatDiscriminated: false,
      buyer: { rif: 'J-29876543-1', razonSocial: 'Agente SPE', isSpecialTaxpayer: true },
    });
    expect(res3.retentionPercentage).toBe(100.0);
    expect(res3.montoIvaRetenido).toBe(160.0);

    // Contingencia sin control autorizado -> 100%
    const res4 = IvaRetentionEngine.evaluateRetention({
      ...base, invoiceNumber: '0004', controlNumber: 'SIN-NUMERO',
      isContingencyInvoice: true, hasAuthorizedControlNumber: false,
      buyer: { rif: 'J-29876543-1', razonSocial: 'Agente SPE', isSpecialTaxpayer: true },
    });
    expect(res4.retentionPercentage).toBe(100.0);
    expect(res4.montoIvaRetenido).toBe(160.0);
  });

  test('3. Motor de Retenciones de ISLR y Sustraendo (Decreto 1808)', () => {
    const currentUtValue = 9.0;

    const res1 = IslrRetentionEngine.calculateRetention({
      conceptCode: '001', amount: 500.0, currentUtValue, beneficiaryType: 'PNR',
    });
    expect(res1.isExemptByMinimumThreshold).toBe(true);
    expect(res1.netTaxRetained).toBe(0.0);

    // 10,000 * 3% = 300 − (9 * 0.03 * 83.3334 = 22.50) = 277.50
    const res2 = IslrRetentionEngine.calculateRetention({
      conceptCode: '001', amount: 10000.0, currentUtValue, beneficiaryType: 'PNR',
    });
    expect(res2.isExemptByMinimumThreshold).toBe(false);
    expect(res2.grossTax).toBe(300.0);
    expect(res2.sustraendo).toBe(22.5);
    expect(res2.netTaxRetained).toBe(277.5);

    const res3 = IslrRetentionEngine.calculateRetention({
      conceptCode: '057', amount: 10000.0, currentUtValue, beneficiaryType: 'PJ_DOM',
    });
    expect(res3.sustraendo).toBe(0.0);
    expect(res3.netTaxRetained).toBe(200.0);
  });

  test('4. Generación de Archivo TXT de Retenciones de IVA (16 campos tabulados)', () => {
    const txt = SeniatFileGenerator.generateVatTxt([{
      rifAgente: 'J-12345678-9', periodoImpositivo: '202603', fechaFactura: '2026-03-15',
      tipoOperacion: 'C', tipoDocumento: '01', rifProveedor: 'J-00006372-9',
      numeroFactura: '00012345', numeroControl: '00-001234',
      montoTotalConIva: 1160.0, baseImponible: 1000.0, montoIvaRetenido: 120.0,
      numeroFacturaAfectada: '0', numeroComprobante: '20260300000001',
      montoExento: 0.0, alicuotaAplicada: 16.0, numeroExpedienteImportacion: '0',
    }]);
    const fields = txt.split('\t');

    expect(fields.length).toBe(16);
    expect(fields[0]).toBe('J123456789');
    expect(fields[1]).toBe('202603');
    expect(fields[2]).toBe('2026-03-15');
    expect(fields[3]).toBe('C');
    expect(fields[4]).toBe('01');
    expect(fields[5]).toBe('J000063729');
    expect(fields[6]).toBe('00012345');
    expect(fields[7]).toBe('00-001234');
    expect(fields[8]).toBe('1160.00');
    expect(fields[9]).toBe('1000.00');
    expect(fields[10]).toBe('120.00');
    expect(fields[11]).toBe('0');
    expect(fields[12]).toBe('20260300000001');
    expect(fields[13]).toBe('0.00');
    expect(fields[14]).toBe('16.00');
    expect(fields[15]).toBe('0');
  });

  test('5. Generación de Archivo XML de Retenciones de ISLR (XSD SENIAT)', () => {
    const xml = SeniatFileGenerator.generateIslrXml('J-12345678-9', '202603', [{
      rifRetenido: 'J-00006372-9', numeroFactura: '00012345', numeroControl: '00-001234',
      fechaOperacion: '15/03/2026', codigoConcepto: '057',
      montoOperacion: 5000.0, porcentajeRetencion: 2.0,
      montoSustraendo: 0.0, montoRetenido: 100.0,
    }]);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<RelacionRetencionesISLR RifAgente="J123456789" Periodo="202603">');
    expect(xml).toContain('<RifRetenido>J000063729</RifRetenido>');
    expect(xml).toContain('<FechaOperacion>15/03/2026</FechaOperacion>');
    expect(xml).toContain('<CodigoConcepto>057</CodigoConcepto>');
    expect(xml).toContain('<MontoOperacion>5000.00</MontoOperacion>');
    expect(xml).toContain('<MontoRetenido>100.00</MontoRetenido>');
  });
});
