"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IslrRetentionEngine = void 0;
const bcv_service_1 = require("./bcv-service");
class IslrRetentionEngine {
    static CONCEPTS = {
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
    static SUSTRAENDO_FACTOR = 83.3334;
    static calculateSustraendo(currentUtValue, taxRatePercentage) {
        if (currentUtValue <= 0 || taxRatePercentage <= 0) {
            return 0.0;
        }
        const factorDecimal = taxRatePercentage / 100.0;
        const rawSustraendo = currentUtValue * factorDecimal * this.SUSTRAENDO_FACTOR;
        return bcv_service_1.BcvExchangeService.round(rawSustraendo, 2);
    }
    static calculateMinimumExemptThreshold(currentUtValue) {
        return bcv_service_1.BcvExchangeService.round(currentUtValue * this.SUSTRAENDO_FACTOR, 2);
    }
    static calculateRetention(input) {
        const concept = this.CONCEPTS[input.conceptCode];
        if (!concept) {
            throw new Error(`Código de concepto ISLR desconocido según Decreto 1808: ${input.conceptCode}`);
        }
        const { amount, currentUtValue, beneficiaryType } = input;
        const baseImponible = bcv_service_1.BcvExchangeService.round(amount * (concept.basePercentage / 100.0), 2);
        const grossTax = bcv_service_1.BcvExchangeService.round(baseImponible * (concept.taxRatePercentage / 100.0), 2);
        if (concept.appliesSustraendo && beneficiaryType === 'PNR') {
            const minimumThreshold = this.calculateMinimumExemptThreshold(currentUtValue);
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
            const netTax = Math.max(0.0, bcv_service_1.BcvExchangeService.round(grossTax - sustraendo, 2));
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
exports.IslrRetentionEngine = IslrRetentionEngine;
//# sourceMappingURL=islr-retention-engine.js.map