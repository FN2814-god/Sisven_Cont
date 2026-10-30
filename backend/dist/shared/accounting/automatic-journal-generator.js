"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomaticJournalGenerator = exports.STANDARD_ACCOUNTS = void 0;
const bcv_service_1 = require("../seniat/bcv-service");
exports.STANDARD_ACCOUNTS = {
    CAJA_CUSTODIA_DIVISAS: { code: '1.1.01.01.00.000', name: 'Caja Chica / Custodia Divisas' },
    BANCOS_NACIONALES_VES: { code: '1.1.01.02.01.000', name: 'Bancos Nacionales Moneda Cta Cte (VES)' },
    BANCOS_NACIONALES_USD: { code: '1.1.01.02.02.000', name: 'Bancos Nacionales Moneda Extranjera (USD)' },
    CXC_COMERCIALES_NACIONALES: { code: '1.1.02.01.01.000', name: 'Cuentas por Cobrar Comerciales Nacionales' },
    RETENCIONES_IVA_COMPENSAR: { code: '1.1.03.01.01.000', name: 'Retenciones de IVA Acumuladas por Compensar' },
    CREDITO_FISCAL_IVA_16: { code: '1.1.03.02.01.000', name: 'Crédito Fiscal IVA (16%)' },
    CXP_PROVEEDORES_NACIONALES: { code: '2.1.01.01.01.000', name: 'Cuentas por Pagar Proveedores Nacionales' },
    DEBITO_FISCAL_IVA_16: { code: '2.1.02.01.01.000', name: 'Débito Fiscal IVA (16%)' },
    IVA_RETENIDO_PROVEEDORES_ENTERAR: { code: '2.1.02.01.02.000', name: 'IVA Retenido a Proveedores por Enterar' },
    RETENCIONES_ISLR_PAGAR: { code: '2.1.02.01.03.000', name: 'Retenciones de ISLR por Pagar' },
    IGTF_POR_PAGAR_ENTERAR_3: { code: '2.1.02.01.04.000', name: 'IGTF por Pagar / Enterar (3% Percibido)' },
    VENTAS_GRAVADAS_16: { code: '4.1.01.01.01.000', name: 'Ventas de Mercancías Gravadas (Alícuota 16%)' },
    GASTOS_COMISIONES_BANCARIAS: { code: '6.1.02.01.01.000', name: 'Gastos por Comisiones Bancarias' },
    GASTOS_IGTF_BANCARIO: { code: '6.1.02.01.02.000', name: 'Gastos por Impuesto IGTF Bancario (No Deducible)' },
    GASTOS_SERVICIOS_GENERALES: { code: '6.1.03.01.01.000', name: 'Gastos por Mantenimiento y Servicios' },
};
class AutomaticJournalGenerator {
    journalRepo;
    constructor(journalRepo) {
        this.journalRepo = journalRepo;
    }
    static assertDoubleEntryBalance(lines) {
        if (lines.length < 2) {
            throw new Error(`Un comprobante contable debe poseer al menos 2 líneas para cumplir la partida doble.`);
        }
        let sumDebitVes = 0.0;
        let sumCreditVes = 0.0;
        let sumDebitUsd = 0.0;
        let sumCreditUsd = 0.0;
        for (const l of lines) {
            sumDebitVes = bcv_service_1.BcvExchangeService.round(sumDebitVes + l.debitVes, 2);
            sumCreditVes = bcv_service_1.BcvExchangeService.round(sumCreditVes + l.creditVes, 2);
            sumDebitUsd = bcv_service_1.BcvExchangeService.round(sumDebitUsd + l.debitUsd, 2);
            sumCreditUsd = bcv_service_1.BcvExchangeService.round(sumCreditUsd + l.creditUsd, 2);
        }
        const diffVes = Math.abs(bcv_service_1.BcvExchangeService.round(sumDebitVes - sumCreditVes, 2));
        const diffUsd = Math.abs(bcv_service_1.BcvExchangeService.round(sumDebitUsd - sumCreditUsd, 2));
        if (diffVes !== 0.0) {
            throw new Error(`Descuadre contable en VES: Total Débito=${sumDebitVes}, Total Crédito=${sumCreditVes}. Diferencia=${diffVes}`);
        }
        if (diffUsd !== 0.0) {
            throw new Error(`Descuadre contable en USD: Total Débito=${sumDebitUsd}, Total Crédito=${sumCreditUsd}. Diferencia=${diffUsd}`);
        }
    }
    generateSaleInvoiceEntry(event, entryNumber = 1) {
        const { tenantId, invoiceNumber, date, customerRif, customerName, bcvExchangeRate } = event;
        const baseImponibleUsd = bcv_service_1.BcvExchangeService.round(event.baseImponibleUsd, 2);
        const vatAmountUsd = bcv_service_1.BcvExchangeService.round(event.vatAmountUsd, 2);
        const totalAmountUsd = bcv_service_1.BcvExchangeService.round(baseImponibleUsd + vatAmountUsd, 2);
        const baseImponibleVes = bcv_service_1.BcvExchangeService.convertUsdToVes(baseImponibleUsd, bcvExchangeRate);
        const vatAmountVes = bcv_service_1.BcvExchangeService.convertUsdToVes(vatAmountUsd, bcvExchangeRate);
        const totalAmountVes = bcv_service_1.BcvExchangeService.round(baseImponibleVes + vatAmountVes, 2);
        const lines = [
            {
                accountCode: exports.STANDARD_ACCOUNTS.CXC_COMERCIALES_NACIONALES.code,
                accountName: exports.STANDARD_ACCOUNTS.CXC_COMERCIALES_NACIONALES.name,
                description: `CxC Factura N° ${invoiceNumber} - ${customerName}`,
                debitVes: totalAmountVes,
                creditVes: 0.0,
                debitUsd: totalAmountUsd,
                creditUsd: 0.0,
                bcvRate: bcvExchangeRate,
                thirdPartyRif: customerRif,
            },
            {
                accountCode: exports.STANDARD_ACCOUNTS.VENTAS_GRAVADAS_16.code,
                accountName: exports.STANDARD_ACCOUNTS.VENTAS_GRAVADAS_16.name,
                description: `Venta según Factura N° ${invoiceNumber}`,
                debitVes: 0.0,
                creditVes: baseImponibleVes,
                debitUsd: 0.0,
                creditUsd: baseImponibleUsd,
                bcvRate: bcvExchangeRate,
                thirdPartyRif: customerRif,
            },
            {
                accountCode: exports.STANDARD_ACCOUNTS.DEBITO_FISCAL_IVA_16.code,
                accountName: exports.STANDARD_ACCOUNTS.DEBITO_FISCAL_IVA_16.name,
                description: `Débito Fiscal IVA 16% Factura N° ${invoiceNumber}`,
                debitVes: 0.0,
                creditVes: vatAmountVes,
                debitUsd: 0.0,
                creditUsd: vatAmountUsd,
                bcvRate: bcvExchangeRate,
                thirdPartyRif: customerRif,
            },
        ];
        AutomaticJournalGenerator.assertDoubleEntryBalance(lines);
        const year = parseInt(date.substring(0, 4), 10);
        const period = parseInt(date.substring(5, 7), 10);
        return {
            tenantId,
            fiscalYear: year,
            fiscalPeriod: period,
            entryNumber,
            entryDate: date,
            concept: `Registro de Factura de Venta N° ${invoiceNumber} a crédito en divisas a cliente ${customerName}`,
            sourceModule: 'VENTAS',
            sourceDocumentId: event.invoiceId,
            status: 'ASENTADO',
            bcvExchangeRate,
            lines,
            totalDebitVes: totalAmountVes,
            totalCreditVes: totalAmountVes,
            totalDebitUsd: totalAmountUsd,
            totalCreditUsd: totalAmountUsd,
        };
    }
    generatePaymentReceivedEntry(event, entryNumber = 1) {
        const { tenantId, receiptNumber, date, customerRif, customerName, bcvExchangeRate, } = event;
        const totalInvoiceVes = bcv_service_1.BcvExchangeService.round(event.totalInvoiceAmountVes, 2);
        const totalInvoiceUsd = bcv_service_1.BcvExchangeService.round(event.totalInvoiceAmountUsd, 2);
        const ivaRetentionVes = bcv_service_1.BcvExchangeService.round(event.ivaRetentionVes, 2);
        const ivaRetentionUsd = bcv_service_1.BcvExchangeService.round(event.ivaRetentionUsd, 2);
        const igtfVes = bcv_service_1.BcvExchangeService.round(event.igtfPercibidoVes, 2);
        const igtfUsd = bcv_service_1.BcvExchangeService.round(event.igtfPercibidoUsd, 2);
        const netoCobrarFacturaVes = bcv_service_1.BcvExchangeService.round(totalInvoiceVes - ivaRetentionVes, 2);
        const netoCobrarFacturaUsd = bcv_service_1.BcvExchangeService.round(totalInvoiceUsd - ivaRetentionUsd, 2);
        const totalIngresoCajaVes = bcv_service_1.BcvExchangeService.round(netoCobrarFacturaVes + igtfVes, 2);
        const totalIngresoCajaUsd = bcv_service_1.BcvExchangeService.round(netoCobrarFacturaUsd + igtfUsd, 2);
        const targetAccount = exports.STANDARD_ACCOUNTS.CAJA_CUSTODIA_DIVISAS;
        const lines = [
            {
                accountCode: targetAccount.code,
                accountName: targetAccount.name,
                description: `Cobro Recibo N° ${receiptNumber} en divisas ($${totalIngresoCajaUsd}) incl. IGTF`,
                debitVes: totalIngresoCajaVes,
                creditVes: 0.0,
                debitUsd: totalIngresoCajaUsd,
                creditUsd: 0.0,
                bcvRate: bcvExchangeRate,
                thirdPartyRif: customerRif,
            },
            {
                accountCode: exports.STANDARD_ACCOUNTS.RETENCIONES_IVA_COMPENSAR.code,
                accountName: exports.STANDARD_ACCOUNTS.RETENCIONES_IVA_COMPENSAR.name,
                description: `Retención de IVA (75%) recibida según comprobante cliente SPE`,
                debitVes: ivaRetentionVes,
                creditVes: 0.0,
                debitUsd: ivaRetentionUsd,
                creditUsd: 0.0,
                bcvRate: bcvExchangeRate,
                thirdPartyRif: customerRif,
            },
            {
                accountCode: exports.STANDARD_ACCOUNTS.CXC_COMERCIALES_NACIONALES.code,
                accountName: exports.STANDARD_ACCOUNTS.CXC_COMERCIALES_NACIONALES.name,
                description: `Cancelación cuenta por cobrar cliente ${customerName}`,
                debitVes: 0.0,
                creditVes: totalInvoiceVes,
                debitUsd: 0.0,
                creditUsd: totalInvoiceUsd,
                bcvRate: bcvExchangeRate,
                thirdPartyRif: customerRif,
            },
            {
                accountCode: exports.STANDARD_ACCOUNTS.IGTF_POR_PAGAR_ENTERAR_3.code,
                accountName: exports.STANDARD_ACCOUNTS.IGTF_POR_PAGAR_ENTERAR_3.name,
                description: `IGTF 3% percibido en divisas por enterar al SENIAT`,
                debitVes: 0.0,
                creditVes: igtfVes,
                debitUsd: 0.0,
                creditUsd: igtfUsd,
                bcvRate: bcvExchangeRate,
                thirdPartyRif: customerRif,
            },
        ];
        AutomaticJournalGenerator.assertDoubleEntryBalance(lines);
        const year = parseInt(date.substring(0, 4), 10);
        const period = parseInt(date.substring(5, 7), 10);
        const totalDebitVes = bcv_service_1.BcvExchangeService.round(totalIngresoCajaVes + ivaRetentionVes, 2);
        const totalDebitUsd = bcv_service_1.BcvExchangeService.round(totalIngresoCajaUsd + ivaRetentionUsd, 2);
        return {
            tenantId,
            fiscalYear: year,
            fiscalPeriod: period,
            entryNumber,
            entryDate: date,
            concept: `Cobro en efectivo/divisas según Recibo N° ${receiptNumber} con Retención IVA e IGTF Percibido`,
            sourceModule: 'COBROS',
            sourceDocumentId: event.paymentId,
            status: 'ASENTADO',
            bcvExchangeRate,
            lines,
            totalDebitVes,
            totalCreditVes: totalDebitVes,
            totalDebitUsd,
            totalCreditUsd: totalDebitUsd,
        };
    }
    generateSupplierPurchaseEntry(event, entryNumber = 1) {
        const { tenantId, invoiceNumber, date, supplierRif, supplierName, expenseAccountCode, expenseDescription, bcvExchangeRate, } = event;
        const baseVes = bcv_service_1.BcvExchangeService.round(event.baseImponibleVes, 2);
        const baseUsd = bcv_service_1.BcvExchangeService.round(event.baseImponibleUsd, 2);
        const vatVes = bcv_service_1.BcvExchangeService.round(event.vatAmountVes, 2);
        const vatUsd = bcv_service_1.BcvExchangeService.round(event.vatAmountUsd, 2);
        const totalInvoiceVes = bcv_service_1.BcvExchangeService.round(baseVes + vatVes, 2);
        const totalInvoiceUsd = bcv_service_1.BcvExchangeService.round(baseUsd + vatUsd, 2);
        const ivaRetVes = bcv_service_1.BcvExchangeService.round(event.ivaRetentionVes, 2);
        const ivaRetUsd = bcv_service_1.BcvExchangeService.round(event.ivaRetentionUsd, 2);
        const islrRetVes = bcv_service_1.BcvExchangeService.round(event.islrRetentionVes, 2);
        const islrRetUsd = bcv_service_1.BcvExchangeService.round(event.islrRetentionUsd, 2);
        const netoPagarVes = bcv_service_1.BcvExchangeService.round(totalInvoiceVes - ivaRetVes - islrRetVes, 2);
        const netoPagarUsd = bcv_service_1.BcvExchangeService.round(totalInvoiceUsd - ivaRetUsd - islrRetUsd, 2);
        const lines = [
            {
                accountCode: expenseAccountCode || exports.STANDARD_ACCOUNTS.GASTOS_SERVICIOS_GENERALES.code,
                accountName: expenseDescription || exports.STANDARD_ACCOUNTS.GASTOS_SERVICIOS_GENERALES.name,
                description: `Gasto/Compra Factura N° ${invoiceNumber} - ${supplierName}`,
                debitVes: baseVes,
                creditVes: 0.0,
                debitUsd: baseUsd,
                creditUsd: 0.0,
                bcvRate: bcvExchangeRate,
                thirdPartyRif: supplierRif,
            },
            {
                accountCode: exports.STANDARD_ACCOUNTS.CREDITO_FISCAL_IVA_16.code,
                accountName: exports.STANDARD_ACCOUNTS.CREDITO_FISCAL_IVA_16.name,
                description: `Crédito Fiscal IVA 16% Factura N° ${invoiceNumber}`,
                debitVes: vatVes,
                creditVes: 0.0,
                debitUsd: vatUsd,
                creditUsd: 0.0,
                bcvRate: bcvExchangeRate,
                thirdPartyRif: supplierRif,
            },
            {
                accountCode: exports.STANDARD_ACCOUNTS.CXP_PROVEEDORES_NACIONALES.code,
                accountName: exports.STANDARD_ACCOUNTS.CXP_PROVEEDORES_NACIONALES.name,
                description: `Neto por pagar Factura N° ${invoiceNumber}`,
                debitVes: 0.0,
                creditVes: netoPagarVes,
                debitUsd: 0.0,
                creditUsd: netoPagarUsd,
                bcvRate: bcvExchangeRate,
                thirdPartyRif: supplierRif,
            },
            {
                accountCode: exports.STANDARD_ACCOUNTS.IVA_RETENIDO_PROVEEDORES_ENTERAR.code,
                accountName: exports.STANDARD_ACCOUNTS.IVA_RETENIDO_PROVEEDORES_ENTERAR.name,
                description: `IVA Retenido a proveedor (75%/100%) por enterar`,
                debitVes: 0.0,
                creditVes: ivaRetVes,
                debitUsd: 0.0,
                creditUsd: ivaRetUsd,
                bcvRate: bcvExchangeRate,
                thirdPartyRif: supplierRif,
            },
            {
                accountCode: exports.STANDARD_ACCOUNTS.RETENCIONES_ISLR_PAGAR.code,
                accountName: exports.STANDARD_ACCOUNTS.RETENCIONES_ISLR_PAGAR.name,
                description: `Retención ISLR Concepto ${event.islrConceptCode || '057'} por pagar`,
                debitVes: 0.0,
                creditVes: islrRetVes,
                debitUsd: 0.0,
                creditUsd: islrRetUsd,
                bcvRate: bcvExchangeRate,
                thirdPartyRif: supplierRif,
            },
        ];
        AutomaticJournalGenerator.assertDoubleEntryBalance(lines);
        const year = parseInt(date.substring(0, 4), 10);
        const period = parseInt(date.substring(5, 7), 10);
        return {
            tenantId,
            fiscalYear: year,
            fiscalPeriod: period,
            entryNumber,
            entryDate: date,
            concept: `Compra a Proveedor ${supplierName} según Factura N° ${invoiceNumber} con Retenciones IVA e ISLR`,
            sourceModule: 'COMPRAS',
            sourceDocumentId: event.purchaseId,
            status: 'ASENTADO',
            bcvExchangeRate,
            lines,
            totalDebitVes: totalInvoiceVes,
            totalCreditVes: totalInvoiceVes,
            totalDebitUsd: totalInvoiceUsd,
            totalCreditUsd: totalInvoiceUsd,
        };
    }
}
exports.AutomaticJournalGenerator = AutomaticJournalGenerator;
//# sourceMappingURL=automatic-journal-generator.js.map