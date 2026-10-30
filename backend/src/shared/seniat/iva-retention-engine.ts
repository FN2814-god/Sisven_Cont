import { InvoiceTaxEvaluationInput, IvaRetentionResult } from './types';
import { RifValidator } from './rif-validator';
import { BcvExchangeService } from './bcv-service';

/**
 * Motor Tributario de Retenciones de Impuesto al Valor Agregado (IVA).
 * Fundamento Legal: Providencias SNAT/2025/000054, SNAT/2011/00071, SNAT/2026/00093 y Ley del IVA.
 */
export class IvaRetentionEngine {
  /**
   * Evalúa si el comprador está calificado como Sujeto Pasivo Especial (SPE)
   * y por ende tiene la cualidad jurídica de Agente de Retención de IVA.
   */
  public static isAgentOfRetention(isSpecialTaxpayer: boolean): boolean {
    return Boolean(isSpecialTaxpayer);
  }

  /**
   * Ejecuta la evaluación completa de la retención de IVA para una compra.
   */
  public static evaluateRetention(input: InvoiceTaxEvaluationInput): IvaRetentionResult {
    const { buyer, supplier, bcvExchangeRate } = input;

    // Totalizar bases y débitos de la factura
    const baseImponibleTotal = BcvExchangeService.round(
      input.baseImponible16 + input.baseImponible8 + input.baseImponible31,
      2
    );

    const debitoFiscalTotal = BcvExchangeService.round(
      input.debitoFiscal16 + input.debitoFiscal8 + input.debitoFiscal31,
      2
    );

    // Regla 1: Si el adquirente NO es Sujeto Pasivo Especial, NO actúa como Agente de Retención
    if (!this.isAgentOfRetention(buyer.isSpecialTaxpayer)) {
      return {
        isSubjectToRetention: false,
        retentionPercentage: 0.0,
        baseImponibleTotal,
        debitoFiscalTotal,
        montoIvaRetenido: 0.0,
        montoIvaRetenidoUsd: 0.0,
        appliedReason: 'El comprador no es Contribuyente Especial (SPE). No procede retención de IVA.',
      };
    }

    // Regla 2: Si no hay débito fiscal (factura 100% exenta o monto cero), retención es 0
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

    // Regla 3: Verificación de Causales de Retención del 100% (Providencia SNAT/2025/000054)
    let retentionPercentage = 75.0; // Alícuota general estándar
    let appliedReason = 'Aplicación de alícuota general de retención del 75% a proveedor formalmente activo.';

    // Causal A: RIF del proveedor no es válido según Módulo 11 o no está activo en SENIAT
    const isRifValidChecksum = RifValidator.isValid(supplier.rif);
    if (!isRifValidChecksum || !supplier.isRifActiveInSeniat || !supplier.isRifValid) {
      retentionPercentage = 100.0;
      appliedReason = 'Retención del 100%: El proveedor no posee un RIF válido o no está activo en el SENIAT.';
    }
    // Causal B: El IVA no se encuentra discriminado en la factura
    else if (!input.isVatDiscriminated) {
      retentionPercentage = 100.0;
      appliedReason = 'Retención del 100%: El impuesto (IVA) no se encuentra discriminado en el comprobante fiscal.';
    }
    // Causal C: Factura emitida en contingencia sin número de control asignado/autorizado
    else if (input.isContingencyInvoice && !input.hasAuthorizedControlNumber) {
      retentionPercentage = 100.0;
      appliedReason = 'Retención del 100%: Factura en contingencia carente de número de control digital/autorizado.';
    }
    // Causal D: Proveedor con designación forzada del 100% por portal SENIAT
    else if (supplier.forced100PercentRetention) {
      retentionPercentage = 100.0;
      appliedReason = 'Retención del 100%: Proveedor catalogado con porcentaje incrementado según consulta de portal SENIAT.';
    }

    // Cálculo del impuesto retenido
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

  /**
   * Genera el número legal del comprobante de retención de IVA según formato oficial:
   * AAAAMM + 8 dígitos correlativos (14 caracteres exactos).
   * Ejemplo: periodo 202603, secuencia 14 -> 20260300000014
   */
  public static generateVatVoucherNumber(periodoAnomes: string, sequenceNumber: number): string {
    if (!/^\d{6}$/.test(periodoAnomes)) {
      throw new Error(`El período impositivo debe tener formato AAAAMM (6 dígitos): ${periodoAnomes}`);
    }
    if (sequenceNumber <= 0 || sequenceNumber > 99999999) {
      throw new Error(`La secuencia debe estar entre 1 y 99999999. Recibido: ${sequenceNumber}`);
    }
    const sequencePadded = sequenceNumber.toString().padStart(8, '0');
    return `${periodoAnomes}${sequencePadded}`;
  }
}
