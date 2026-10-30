"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RifValidator = void 0;
class RifValidator {
    static PREFIX_VALUES = {
        V: 1,
        E: 2,
        J: 3,
        P: 4,
        G: 5,
        C: 6,
    };
    static WEIGHTS = [3, 2, 7, 6, 5, 4, 3, 2];
    static clean(rif) {
        if (!rif)
            return '';
        return rif.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    }
    static format(rif) {
        const cleaned = this.clean(rif);
        if (cleaned.length !== 10)
            return rif;
        const prefix = cleaned[0];
        const body = cleaned.substring(1, 9);
        const checkDigit = cleaned[9];
        return `${prefix}-${body}-${checkDigit}`;
    }
    static calculateCheckDigit(prefix, bodyDigits) {
        if (!this.PREFIX_VALUES[prefix]) {
            throw new Error(`Prefijo de RIF inválido: ${prefix}`);
        }
        const paddedBody = bodyDigits.padStart(8, '0');
        if (paddedBody.length !== 8 || !/^\d{8}$/.test(paddedBody)) {
            throw new Error(`El cuerpo numérico del RIF debe contener exactamente 8 dígitos.`);
        }
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
    static isValid(rif) {
        const cleaned = this.clean(rif);
        if (!/^[VEJPGC]\d{9}$/.test(cleaned)) {
            return false;
        }
        const prefix = cleaned[0];
        const body = cleaned.substring(1, 9);
        const expectedCheckDigit = parseInt(cleaned[9], 10);
        try {
            const calculatedDigit = this.calculateCheckDigit(prefix, body);
            return calculatedDigit === expectedCheckDigit;
        }
        catch {
            return false;
        }
    }
    static parse(rif) {
        const cleaned = this.clean(rif);
        if (!this.isValid(cleaned)) {
            throw new Error(`RIF inválido o no conforme con el Módulo 11: ${rif}`);
        }
        return {
            prefix: cleaned[0],
            body: cleaned.substring(1, 9),
            checkDigit: parseInt(cleaned[9], 10),
            raw: cleaned,
        };
    }
}
exports.RifValidator = RifValidator;
//# sourceMappingURL=rif-validator.js.map