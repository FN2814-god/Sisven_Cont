"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IvaRetentionEngine = void 0;
const rif_validator_1 = require("./rif-validator");
const bcv_service_1 = require("./bcv-service");
class IvaRetentionEngine {
    static isAgentOfRetention(isSpecialTaxpayer) {
        return Boolean(isSpecialTaxpayer);
    }
    static evaluateRetention(input) {
        const { buyer, supplier, bcvExchangeRate } = input;
        const baseImponibleTotal = bcv_service_1.BcvExchangeService.round(input.baseImponible16 + input.baseImponible8 + input.baseImponible31, 2);
        const debitoFiscalTotal = bcv_service_1.BcvExchangeService.round(input.debitoFiscal16 + input.debitoFiscal8 + input.debitoFiscal31, 2);
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
        let appliedReason = 'Aplicación de alícuota general de retención del 75% a proveedor formalmente activo.';
        const isRifValidChecksum = rif_validator_1.RifValidator.isValid(supplier.rif);
        if (!isRifValidChecksum || !supplier.isRifActiveInSeniat || !supplier.isRifValid) {
            retentionPercentage = 100.0;
            appliedReason = 'Retención del 100%: El proveedor no posee un RIF válido o no está activo en el SENIAT.';
        }
        else if (!input.isVatDiscriminated) {
            retentionPercentage = 100.0;
            appliedReason = 'Retención del 100%: El impuesto (IVA) no se encuentra discriminado en el comprobante fiscal.';
        }
        else if (input.isContingencyInvoice && !input.hasAuthorizedControlNumber) {
            retentionPercentage = 100.0;
            appliedReason = 'Retención del 100%: Factura en contingencia carente de número de control digital/autorizado.';
        }
        else if (supplier.forced100PercentRetention) {
            retentionPercentage = 100.0;
            appliedReason = 'Retención del 100%: Proveedor catalogado con porcentaje incrementado según consulta de portal SENIAT.';
        }
        const montoIvaRetenido = bcv_service_1.BcvExchangeService.round(debitoFiscalTotal * (retentionPercentage / 100), 2);
        const montoIvaRetenidoUsd = bcv_service_1.BcvExchangeService.convertVesToUsd(montoIvaRetenido, bcvExchangeRate);
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
    static generateVatVoucherNumber(periodoAnomes, sequenceNumber) {
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
exports.IvaRetentionEngine = IvaRetentionEngine;
//# sourceMappingURL=iva-retention-engine.js.map