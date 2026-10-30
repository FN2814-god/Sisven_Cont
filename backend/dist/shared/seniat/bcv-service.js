"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BcvExchangeService = void 0;
class BcvExchangeService {
    static round(value, decimals = 2) {
        const factor = Math.pow(10, decimals);
        const n = +(value * factor);
        const i = Math.floor(n);
        const f = n - i;
        const e = 1e-8;
        let r;
        if (f > 0.5 - e && f < 0.5 + e) {
            r = i % 2 === 0 ? i : i + 1;
        }
        else {
            r = Math.round(n);
        }
        return +(r / factor).toFixed(decimals);
    }
    static convertUsdToVes(amountUsd, exchangeRate) {
        if (exchangeRate <= 0) {
            throw new Error(`La tasa oficial del BCV debe ser mayor a cero. Valor recibido: ${exchangeRate}`);
        }
        return this.round(amountUsd * exchangeRate, 2);
    }
    static convertVesToUsd(amountVes, exchangeRate) {
        if (exchangeRate <= 0) {
            throw new Error(`La tasa oficial del BCV debe ser mayor a cero. Valor recibido: ${exchangeRate}`);
        }
        return this.round(amountVes / exchangeRate, 2);
    }
    static formatSeniatDecimal(amount) {
        return this.round(amount, 2).toFixed(2);
    }
    static async fetchOfficialRate() {
        try {
            const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
            if (!response.ok) {
                throw new Error(`Respuesta no exitosa de DolarApi: HTTP ${response.status}`);
            }
            const data = await response.json();
            const rate = Number(data.promedio ?? data.precio ?? data.venta ?? data.valor);
            if (!rate || isNaN(rate)) {
                throw new Error(`Tasa no encontrada en la respuesta de DolarApi: ${JSON.stringify(data)}`);
            }
            return {
                rate,
                updatedAt: data.fechaActualizacion,
                source: 've.dolarapi.com (Oficial BCV)',
            };
        }
        catch (error) {
            throw new Error(`Error al consultar DolarApi Venezuela: ${error.message}`);
        }
    }
}
exports.BcvExchangeService = BcvExchangeService;
//# sourceMappingURL=bcv-service.js.map