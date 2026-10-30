import { RifPrefix } from './types';

/**
 * Validador Oficial del Registro de Información Fiscal (RIF) del SENIAT.
 * Utiliza el algoritmo de Chequeo Módulo 11 ponderado oficial de Venezuela.
 */
export class RifValidator {
  private static readonly PREFIX_VALUES: Record<RifPrefix, number> = {
    V: 1,
    E: 2,
    J: 3,
    P: 4,
    G: 5,
    C: 6,
  };

  private static readonly WEIGHTS: number[] = [3, 2, 7, 6, 5, 4, 3, 2];

  /**
   * Limpia y normaliza un RIF eliminando espacios, guiones y puntos.
   * Retorna formato canónico de 10 caracteres: J123456789
   */
  public static clean(rif: string): string {
    if (!rif) return '';
    return rif.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  /**
   * Da formato visual con guiones: J-12345678-9
   */
  public static format(rif: string): string {
    const cleaned = this.clean(rif);
    if (cleaned.length !== 10) return rif;
    const prefix = cleaned[0];
    const body = cleaned.substring(1, 9);
    const checkDigit = cleaned[9];
    return `${prefix}-${body}-${checkDigit}`;
  }

  /**
   * Calcula el dígito verificador esperado para una letra y 8 dígitos numéricos.
   */
  public static calculateCheckDigit(prefix: RifPrefix, bodyDigits: string): number {
    if (!this.PREFIX_VALUES[prefix]) {
      throw new Error(`Prefijo de RIF inválido: ${prefix}`);
    }

    const paddedBody = bodyDigits.padStart(8, '0');
    if (paddedBody.length !== 8 || !/^\d{8}$/.test(paddedBody)) {
      throw new Error(`El cuerpo numérico del RIF debe contener exactamente 8 dígitos.`);
    }

    // Prefijo multiplicado por peso fijo 4
    let sum = this.PREFIX_VALUES[prefix] * 4;

    for (let i = 0; i < 8; i++) {
      const digit = parseInt(paddedBody[i], 10);
      sum += digit * this.WEIGHTS[i];
    }

    const remainder = sum % 11;
    if (remainder <= 1) {
      return 0;
    }
    return 11 - remainder;
  }

  /**
   * Valida sintaxis y dígito verificador del RIF por Módulo 11.
   */
  public static isValid(rif: string): boolean {
    const cleaned = this.clean(rif);
    if (!/^[VEJPGC]\d{9}$/.test(cleaned)) {
      return false;
    }

    const prefix = cleaned[0] as RifPrefix;
    const body = cleaned.substring(1, 9);
    const expectedCheckDigit = parseInt(cleaned[9], 10);

    try {
      const calculatedDigit = this.calculateCheckDigit(prefix, body);
      return calculatedDigit === expectedCheckDigit;
    } catch {
      return false;
    }
  }

  /**
   * Extrae los componentes de un RIF válido.
   */
  public static parse(rif: string): { prefix: RifPrefix; body: string; checkDigit: number; raw: string } {
    const cleaned = this.clean(rif);
    if (!this.isValid(cleaned)) {
      throw new Error(`RIF inválido o no conforme con el Módulo 11: ${rif}`);
    }

    return {
      prefix: cleaned[0] as RifPrefix,
      body: cleaned.substring(1, 9),
      checkDigit: parseInt(cleaned[9], 10),
      raw: cleaned,
    };
  }
}
