"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankReconciliationEngine = void 0;
const automatic_journal_generator_1 = require("./automatic-journal-generator");
const bcv_service_1 = require("../seniat/bcv-service");
class BankReconciliationEngine {
    static REGEX_IGTF = /(IGTF|IMP\.?GRAN\.?TRANS|IMPUESTO\s+TRANS\.?\s+FINAN)/i;
    static REGEX_COMISION = /(COMISION|COM\.?PTO\.?VENTA|MANT\.?CUENTA)/i;
    static normalizeReference(ref) {
        if (!ref)
            return '';
        const cleaned = ref.replace(/[^A-Za-z0-9]/g, '');
        return cleaned.replace(/^0+/, '');
    }
    static calculateDateDifferenceInDays(dateStrA, dateStrB) {
        const dateA = new Date(dateStrA);
        const dateB = new Date(dateStrB);
        const diffTime = Math.abs(dateA.getTime() - dateB.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    static executeReconciliation(statementLines, internalMovements, bcvExchangeRate = 36.0) {
        let phase1Count = 0;
        let phase2Count = 0;
        for (const stmt of statementLines) {
            if (stmt.status === 'CONCILIADO')
                continue;
            const normStmtRef = this.normalizeReference(stmt.reference);
            const match = internalMovements.find((mov) => mov.status !== 'CONCILIADO' &&
                mov.movementType === stmt.movementType &&
                Math.abs(mov.amount - stmt.amount) < 0.01 &&
                this.normalizeReference(mov.reference) === normStmtRef &&
                this.calculateDateDifferenceInDays(stmt.date, mov.date) <= 2);
            if (match) {
                stmt.status = 'CONCILIADO';
                stmt.reconciledWithId = match.id;
                stmt.reconciliationType = 'EXACTA_NIVEL_1';
                match.status = 'CONCILIADO';
                match.matchedStatementId = stmt.id;
                phase1Count++;
            }
        }
        for (const stmt of statementLines) {
            if (stmt.status === 'CONCILIADO')
                continue;
            const match = internalMovements.find((mov) => mov.status !== 'CONCILIADO' &&
                mov.movementType === stmt.movementType &&
                Math.abs(mov.amount - stmt.amount) < 0.01 &&
                this.calculateDateDifferenceInDays(stmt.date, mov.date) <= 5);
            if (match) {
                stmt.status = 'CONCILIADO';
                stmt.reconciledWithId = match.id;
                stmt.reconciliationType = 'NUMERICA_TEMPORAL';
                match.status = 'CONCILIADO';
                match.matchedStatementId = stmt.id;
                phase2Count++;
            }
        }
        const fiscalCrossChecks = [];
        for (const stmt of statementLines) {
            if (stmt.movementType === 'CREDITO') {
                const linkedMov = internalMovements.find((m) => m.matchedStatementId === stmt.id);
                if (linkedMov && linkedMov.salesInvoiceNumber) {
                    fiscalCrossChecks.push({
                        statementId: stmt.id,
                        statementAmount: stmt.amount,
                        matchedInvoiceNumber: linkedMov.salesInvoiceNumber,
                        invoiceExpectedTotal: linkedMov.amount,
                        isMatched: true,
                        alertType: 'OK',
                        message: `Abono bancario respaldado por Factura N° ${linkedMov.salesInvoiceNumber}.`,
                    });
                }
                else {
                    stmt.status = 'IDENTIFICACION_REQUERIDA';
                    fiscalCrossChecks.push({
                        statementId: stmt.id,
                        statementAmount: stmt.amount,
                        isMatched: false,
                        alertType: 'RIESGO_FISCAL_SIN_SOPORTE',
                        message: `Riesgo Fiscal: Abono en cuenta bancaria por Bs. ${stmt.amount.toFixed(2)} sin soporte de factura emitida ni cobro registrado ante el SENIAT.`,
                    });
                }
            }
        }
        const detectedExpenses = [];
        for (const stmt of statementLines) {
            if (stmt.status !== 'CONCILIADO' && stmt.movementType === 'DEBITO') {
                if (this.REGEX_IGTF.test(stmt.description)) {
                    detectedExpenses.push({
                        statementId: stmt.id,
                        date: stmt.date,
                        reference: stmt.reference,
                        description: stmt.description,
                        type: 'IGTF_BANCARIO',
                        totalAmount: stmt.amount,
                        netExpense: stmt.amount,
                        vatCredit: 0.0,
                        suggestedJournalEntry: {
                            concept: `Registro automático de débito IGTF Bancario: ${stmt.description}`,
                            sourceModule: 'BANCOS',
                            lines: [
                                {
                                    accountCode: automatic_journal_generator_1.STANDARD_ACCOUNTS.GASTOS_IGTF_BANCARIO.code,
                                    accountName: automatic_journal_generator_1.STANDARD_ACCOUNTS.GASTOS_IGTF_BANCARIO.name,
                                    description: `Cargo IGTF Bancario Ref. ${stmt.reference}`,
                                    debitVes: stmt.amount,
                                    creditVes: 0.0,
                                    debitUsd: bcv_service_1.BcvExchangeService.convertVesToUsd(stmt.amount, bcvExchangeRate),
                                    creditUsd: 0.0,
                                    bcvRate: bcvExchangeRate,
                                },
                                {
                                    accountCode: automatic_journal_generator_1.STANDARD_ACCOUNTS.BANCOS_NACIONALES_VES.code,
                                    accountName: automatic_journal_generator_1.STANDARD_ACCOUNTS.BANCOS_NACIONALES_VES.name,
                                    description: `Disminución en cuenta corriente bancaria por IGTF`,
                                    debitVes: 0.0,
                                    creditVes: stmt.amount,
                                    debitUsd: 0.0,
                                    creditUsd: bcv_service_1.BcvExchangeService.convertVesToUsd(stmt.amount, bcvExchangeRate),
                                    bcvRate: bcvExchangeRate,
                                },
                            ],
                        },
                    });
                }
                else if (this.REGEX_COMISION.test(stmt.description)) {
                    const baseComision = bcv_service_1.BcvExchangeService.round(stmt.amount / 1.16, 2);
                    const ivaCredito = bcv_service_1.BcvExchangeService.round(stmt.amount - baseComision, 2);
                    detectedExpenses.push({
                        statementId: stmt.id,
                        date: stmt.date,
                        reference: stmt.reference,
                        description: stmt.description,
                        type: 'COMISION_BANCARIA',
                        totalAmount: stmt.amount,
                        netExpense: baseComision,
                        vatCredit: ivaCredito,
                        suggestedJournalEntry: {
                            concept: `Registro de Comisión Bancaria/POS con Crédito Fiscal IVA: ${stmt.description}`,
                            sourceModule: 'BANCOS',
                            lines: [
                                {
                                    accountCode: automatic_journal_generator_1.STANDARD_ACCOUNTS.GASTOS_COMISIONES_BANCARIAS.code,
                                    accountName: automatic_journal_generator_1.STANDARD_ACCOUNTS.GASTOS_COMISIONES_BANCARIAS.name,
                                    description: `Gasto Comisión Bancaria Ref. ${stmt.reference}`,
                                    debitVes: baseComision,
                                    creditVes: 0.0,
                                    debitUsd: bcv_service_1.BcvExchangeService.convertVesToUsd(baseComision, bcvExchangeRate),
                                    creditUsd: 0.0,
                                    bcvRate: bcvExchangeRate,
                                },
                                {
                                    accountCode: automatic_journal_generator_1.STANDARD_ACCOUNTS.CREDITO_FISCAL_IVA_16.code,
                                    accountName: automatic_journal_generator_1.STANDARD_ACCOUNTS.CREDITO_FISCAL_IVA_16.name,
                                    description: `Crédito Fiscal IVA 16% sobre Comisión Bancaria`,
                                    debitVes: ivaCredito,
                                    creditVes: 0.0,
                                    debitUsd: bcv_service_1.BcvExchangeService.convertVesToUsd(ivaCredito, bcvExchangeRate),
                                    creditUsd: 0.0,
                                    bcvRate: bcvExchangeRate,
                                },
                                {
                                    accountCode: automatic_journal_generator_1.STANDARD_ACCOUNTS.BANCOS_NACIONALES_VES.code,
                                    accountName: automatic_journal_generator_1.STANDARD_ACCOUNTS.BANCOS_NACIONALES_VES.name,
                                    description: `Disminución en cuenta corriente bancaria por comisión`,
                                    debitVes: 0.0,
                                    creditVes: stmt.amount,
                                    debitUsd: 0.0,
                                    creditUsd: bcv_service_1.BcvExchangeService.convertVesToUsd(stmt.amount, bcvExchangeRate),
                                    bcvRate: bcvExchangeRate,
                                },
                            ],
                        },
                    });
                }
            }
        }
        const unmatchedStatements = statementLines.filter((s) => s.status === 'PENDIENTE').length;
        const unmatchedInternalMovements = internalMovements.filter((m) => m.status === 'PENDIENTE').length;
        const fiscalAlertsCount = fiscalCrossChecks.filter((c) => !c.isMatched).length;
        return {
            reconciledStatements: statementLines,
            reconciledInternalMovements: internalMovements,
            fiscalCrossChecks,
            detectedExpenses,
            summary: {
                phase1ExactMatches: phase1Count,
                phase2TemporalMatches: phase2Count,
                unmatchedStatements,
                unmatchedInternalMovements,
                fiscalAlertsCount,
                autoDetectedExpensesCount: detectedExpenses.length,
            },
        };
    }
}
exports.BankReconciliationEngine = BankReconciliationEngine;
//# sourceMappingURL=bank-reconciliation-engine.js.map