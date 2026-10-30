/**
 * Servicio de Conversión Bimoneda y Consulta de Tasa Oficial del BCV.
 * Aplica políticas de redondeo simétrico financiero (Banker's Rounding / Half to Even)
 * para prevenir descuadres de 0.01 VED exigido en la normativa.
 */
export class BcvExchangeService {
  /**
   * Realiza redondeo simétrico a N decimales (Half to Even / Banker's Rounding).
   */
  public static round(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    const n = +(value * factor);
    const i = Math.floor(n);
    const f = n - i;
    const e = 1e-8; // epsilon para precisión flotante

    let r: number;
    if (f > 0.5 - e && f < 0.5 + e) {
      // Caso exacto 0.5: redondeo al par más cercano
      r = i % 2 === 0 ? i : i + 1;
    } else {
      r = Math.round(n);
    }

    return +(r / factor).toFixed(decimals);
  }

  /**
   * Convierte de Divisa (USD) a Bolívares (VES) usando la tasa BCV oficial.
   */
  public static convertUsdToVes(amountUsd: number, exchangeRate: number): number {
    if (exchangeRate <= 0) {
      throw new Error(`La tasa oficial del BCV debe ser mayor a cero. Valor recibido: ${exchangeRate}`);
    }
    return this.round(amountUsd * exchangeRate, 2);
  }

  /**
   * Convierte de Bolívares (VES) a Divisa de Presentación (USD) usando la tasa BCV oficial.
   */
  public static convertVesToUsd(amountVes: number, exchangeRate: number): number {
    if (exchangeRate <= 0) {
      throw new Error(`La tasa oficial del BCV debe ser mayor a cero. Valor recibido: ${exchangeRate}`);
    }
    return this.round(amountVes / exchangeRate, 2);
  }

  /**
   * Formatea un valor numérico para exportación legal SENIAT (ej. 1234.56).
   * Siempre emplea el punto como separador decimal y 2 posiciones decimales fijas.
   */
  public static formatSeniatDecimal(amount: number): string {
    return this.round(amount, 2).toFixed(2);
  }

  /**
   * Consulta la tasa oficial del BCV en tiempo real mediante la API oficial de DolarApi Venezuela:
   * Endpoint: https://ve.dolarapi.com/v1/dolares/oficial
   */
  public static async fetchOfficialRate(): Promise<{ rate: number; updatedAt?: string; source: string }> {
    try {
      const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (!response.ok) {
        throw new Error(`Respuesta no exitosa de DolarApi: HTTP ${response.status}`);
      }
      const data = await response.json() as Record<string, any>;
      const rate = Number(data.promedio ?? data.precio ?? data.venta ?? data.valor);
      if (!rate || isNaN(rate)) {
        throw new Error(`Tasa no encontrada en la respuesta de DolarApi: ${JSON.stringify(data)}`);
      }
      return {
        rate,
        updatedAt: data.fechaActualizacion,
        source: 've.dolarapi.com (Oficial BCV)',
      };
    } catch (error) {
      throw new Error(`Error al consultar DolarApi Venezuela: ${(error as Error).message}`);
    }
  }
}
