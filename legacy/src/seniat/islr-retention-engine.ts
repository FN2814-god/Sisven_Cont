import { IslrCalculationInput, IslrCalculationResult, IslrConceptMatrix, FiscalPersonType } from './types';
import { BcvExchangeService } from './bcv-service';

/**
 * Motor Tributario de Retenciones de Impuesto Sobre la Renta (ISLR).
 * Fundamento Legal: Decreto N° 1808 (Reglamento Parcial en Materia de Retenciones) y Providencia PA SNAT/2024/000102.
 */
export class IslrRetentionEngine {
  /**
   * Catálogo de conceptos de retención según el Artículo 9 del Decreto 1808 del SENIAT.
   */
  public static readonly CONCEPTS: Record<string, IslrConceptMatrix> = {
    '001': {
      code: '001',
      description: 'Honorarios Profesionales pagados a Personas Naturales Residentes',
      beneficiaryType: 'PNR',
      basePercentage: 100.0,
      taxRatePercentage: 3.0,
      appliesSustraendo: true,
    },
    '002': {
      code: '002',
      description: 'Honorarios Profesionales pagados a Personas Jurídicas Domiciliadas',
      beneficiaryType: 'PJ_DOM',
      basePercentage: 100.0,
      taxRatePercentage: 5.0,
      appliesSustraendo: false,
    },
    '003': {
      code: '003',
      description: 'Honorarios Profesionales pagados a Personas Naturales No Residentes',
      beneficiaryType: 'PNNR',
      basePercentage: 90.0,
      taxRatePercentage: 34.0,
      appliesSustraendo: false,
    },
    '018': {
      code: '018',
      description: 'Comisiones Mercantiles pagadas a Personas Naturales Residentes',
      beneficiaryType: 'PNR',
      basePercentage: 100.0,
      taxRatePercentage: 3.0,
      appliesSustraendo: true,
    },
    '020': {
      code: '020',
      description: 'Comisiones Mercantiles pagadas a Personas Jurídicas Domiciliadas',
      beneficiaryType: 'PJ_DOM',
      basePercentage: 100.0,
      taxRatePercentage: 5.0,
      appliesSustraendo: false,
    },
    '055': {
      code: '055',
      description: 'Ejecución de Obras o Prestación de Servicios a Personas Naturales Residentes',
      beneficiaryType: 'PNR',
      basePercentage: 100.0,
      taxRatePercentage: 1.0,
      appliesSustraendo: true,
    },
    '057': {
      code: '057',
      description: 'Ejecución de Obras o Prestación de Servicios a Personas Jurídicas Domiciliadas',
      beneficiaryType: 'PJ_DOM',
      basePercentage: 100.0,
      taxRatePercentage: 2.0,
      appliesSustraendo: false,
    },
    '061': {
      code: '061',
      description: 'Arrendamiento de Inmuebles pagado a Personas Naturales Residentes',
      beneficiaryType: 'PNR',
      basePercentage: 100.0,
      taxRatePercentage: 3.0,
      appliesSustraendo: true,
    },
    '063': {
      code: '063',
      description: 'Arrendamiento de Inmuebles pagado a Personas Jurídicas Domiciliadas',
      beneficiaryType: 'PJ_DOM',
      basePercentage: 100.0,
      taxRatePercentage: 5.0,
      appliesSustraendo: false,
    },
    '070': {
      code: '070',
      description: 'Publicidad y Propaganda pagada a Personas Jurídicas Domiciliadas',
      beneficiaryType: 'PJ_DOM',
      basePercentage: 100.0,
      taxRatePercentage: 5.0,
      appliesSustraendo: false,
    },
    '075': {
      code: '075',
      description: 'Fletes y Transporte Terrestre o Marítimo pagado a Personas Jurídicas',
      beneficiaryType: 'PJ_DOM',
      basePercentage: 100.0,
      taxRatePercentage: 3.0,
      appliesSustraendo: false,
    },
  };

  /**
   * Factor matemático canónico derivado de la exención de 1000 UT anuales dividida entre 12 meses:
   * 1000 / 12 = 83.33333333333333...
   */
  public static readonly SUSTRAENDO_FACTOR = 83.3334;

  /**
   * Calcula el Sustraendo legal en Bolívares para Personas Naturales Residentes:
   * Sustraendo = Valor_UT * %Retencion * 83.3334
   */
  public static calculateSustraendo(currentUtValue: number, taxRatePercentage: number): number {
    if (currentUtValue <= 0 || taxRatePercentage <= 0) {
      return 0.0;
    }
    const factorDecimal = taxRatePercentage / 100.0;
    const rawSustraendo = currentUtValue * factorDecimal * this.SUSTRAENDO_FACTOR;
    return BcvExchangeService.round(rawSustraendo, 2);
  }

  /**
   * Calcula el monto mínimo exento legal en Bolívares (83.3334 * UT).
   * Si el pago a una PNR es inferior a este monto, la retención es 0.
   */
  public static calculateMinimumExemptThreshold(currentUtValue: number): number {
    return BcvExchangeService.round(currentUtValue * this.SUSTRAENDO_FACTOR, 2);
  }

  /**
   * Ejecuta el cálculo completo de la retención de ISLR.
   */
  public static calculateRetention(input: IslrCalculationInput): IslrCalculationResult {
    const concept = this.CONCEPTS[input.conceptCode];
    if (!concept) {
      throw new Error(`Código de concepto ISLR desconocido según Decreto 1808: ${input.conceptCode}`);
    }

    const { amount, currentUtValue, beneficiaryType } = input;
    const baseImponible = BcvExchangeService.round(amount * (concept.basePercentage / 100.0), 2);
    const grossTax = BcvExchangeService.round(baseImponible * (concept.taxRatePercentage / 100.0), 2);

    // Caso 1: Persona Natural Residente con Sustraendo
    if (concept.appliesSustraendo && beneficiaryType === 'PNR') {
      const minimumThreshold = this.calculateMinimumExemptThreshold(currentUtValue);

      // Si el monto total de la operación es menor al mínimo exento mensual legal, no procede retención
      if (amount < minimumThreshold) {
        return {
          conceptCode: concept.code,
          operationAmount: amount,
          baseImponible,
          taxRatePercentage: concept.taxRatePercentage,
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
        taxRatePercentage: concept.taxRatePercentage,
        grossTax,
        sustraendo,
        netTaxRetained: netTax,
        isExemptByMinimumThreshold: false,
      };
    }

    // Caso 2: Personas Jurídicas o No Residentes (Sin Sustraendo)
    return {
      conceptCode: concept.code,
      operationAmount: amount,
      baseImponible,
      taxRatePercentage: concept.taxRatePercentage,
      grossTax,
      sustraendo: 0.0,
      netTaxRetained: grossTax,
      isExemptByMinimumThreshold: false,
    };
  }
}
