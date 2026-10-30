import {
  BankStatementLineItem,
  InternalBankMovement,
  BankVsSalesCrossCheckResult,
  AutoDetectedBankExpense,
  ReconciliationState,
} from './types';
import { STANDARD_ACCOUNTS } from './automatic-journal-generator';
import { BcvExchangeService } from '../seniat/bcv-service';

export interface ReconciliationSummary {
  phase1ExactMatches: number;
  phase2TemporalMatches: number;
  unmatchedStatements: number;
  unmatchedInternalMovements: number;
  fiscalAlertsCount: number;
  autoDetectedExpensesCount: number;
}

/**
 * Motor de Conciliación Bancaria Automatizada y Control de Riesgo Fiscal SENIAT
 */
export class BankReconciliationEngine {
  private static readonly REGEX_IGTF = /(IGTF|IMP\.?GRAN\.?TRANS|IMPUESTO\s+TRANS\.?\s+FINAN)/i;
  private static readonly REGEX_COMISION = /(COMISION|COM\.?PTO\.?VENTA|MANT\.?CUENTA)/i;

  /**
   * Normaliza números de referencia bancaria eliminando ceros a la izquierda y caracteres no numéricos.
   */
  public static normalizeReference(ref: string): string {
    if (!ref) return '';
    const cleaned = ref.replace(/[^A-Za-z0-9]/g, '');
    return cleaned.replace(/^0+/, '');
  }

  /**
   * Calcula la diferencia absoluta de días entre dos fechas (YYYY-MM-DD).
   */
  public static calculateDateDifferenceInDays(dateStrA: string, dateStrB: string): number {
    const dateA = new Date(dateStrA);
    const dateB = new Date(dateStrB);
    const diffTime = Math.abs(dateA.getTime() - dateB.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Ejecuta el proceso integral de conciliación progresiva en 4 fases.
   */
  public static executeReconciliation(
    statementLines: BankStatementLineItem[],
    internalMovements: InternalBankMovement[],
    bcvExchangeRate: number = 36.0
  ): {
    reconciledStatements: BankStatementLineItem[];
    reconciledInternalMovements: InternalBankMovement[];
    fiscalCrossChecks: BankVsSalesCrossCheckResult[];
    detectedExpenses: AutoDetectedBankExpense[];
    summary: ReconciliationSummary;
  } {
    let phase1Count = 0;
    let phase2Count = 0;

    // FASE 1: Coincidencia Exacta de Primer Nivel
    // (Monto idéntico + Referencia normalizada idéntica + Diferencia de días <= 2)
    for (const stmt of statementLines) {
      if (stmt.status === 'CONCILIADO') continue;

      const normStmtRef = this.normalizeReference(stmt.reference);

      const match = internalMovements.find(
        (mov) =>
          mov.status !== 'CONCILIADO' &&
          mov.movementType === stmt.movementType &&
          Math.abs(mov.amount - stmt.amount) < 0.01 &&
          this.normalizeReference(mov.reference) === normStmtRef &&
          this.calculateDateDifferenceInDays(stmt.date, mov.date) <= 2
      );

      if (match) {
        stmt.status = 'CONCILIADO';
        stmt.reconciledWithId = match.id;
        stmt.reconciliationType = 'EXACTA_NIVEL_1';

        match.status = 'CONCILIADO';
        match.matchedStatementId = stmt.id;
        phase1Count++;
      }
    }

    // FASE 2: Coincidencia Numérica y Temporal
    // (Monto idéntico + Diferencia de días <= 5) para partidas aún pendientes
    for (const stmt of statementLines) {
      if (stmt.status === 'CONCILIADO') continue;

      const match = internalMovements.find(
        (mov) =>
          mov.status !== 'CONCILIADO' &&
          mov.movementType === stmt.movementType &&
          Math.abs(mov.amount - stmt.amount) < 0.01 &&
          this.calculateDateDifferenceInDays(stmt.date, mov.date) <= 5
      );

      if (match) {
        stmt.status = 'CONCILIADO';
        stmt.reconciledWithId = match.id;
        stmt.reconciliationType = 'NUMERICA_TEMPORAL';

        match.status = 'CONCILIADO';
        match.matchedStatementId = stmt.id;
        phase2Count++;
      }
    }

    // FASE 3: Regla de Validación "Banco vs Facturación" para ingresos
    const fiscalCrossChecks: BankVsSalesCrossCheckResult[] = [];
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
        } else {
          // Riesgo fiscal detectado: Abono bancario sin soporte de factura emitida
          stmt.status = 'IDENTIFICACION_REQUERIDA';
          fiscalCrossChecks.push({
            statementId: stmt.id,
            statementAmount: stmt.amount,
            isMatched: false,
            alertType: 'RIESGO_FISCAL_SIN_SOPORTE',
            message: `Riesgo Fiscal: Abono en cuenta bancaria por Bs. ${stmt.amount.toFixed(
              2
            )} sin soporte de factura emitida ni cobro registrado ante el SENIAT.`,
          });
        }
      }
    }

    // FASE 4: Detección Automática de Gastos y Comisiones (Notas de Débito Bancarias)
    const detectedExpenses: AutoDetectedBankExpense[] = [];
    for (const stmt of statementLines) {
      if (stmt.status !== 'CONCILIADO' && stmt.movementType === 'DEBITO') {
        // Detección de IGTF Bancario
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
                  accountCode: STANDARD_ACCOUNTS.GASTOS_IGTF_BANCARIO.code,
                  accountName: STANDARD_ACCOUNTS.GASTOS_IGTF_BANCARIO.name,
                  description: `Cargo IGTF Bancario Ref. ${stmt.reference}`,
                  debitVes: stmt.amount,
                  creditVes: 0.0,
                  debitUsd: BcvExchangeService.convertVesToUsd(stmt.amount, bcvExchangeRate),
                  creditUsd: 0.0,
                  bcvRate: bcvExchangeRate,
                },
                {
                  accountCode: STANDARD_ACCOUNTS.BANCOS_NACIONALES_VES.code,
                  accountName: STANDARD_ACCOUNTS.BANCOS_NACIONALES_VES.name,
                  description: `Disminución en cuenta corriente bancaria por IGTF`,
                  debitVes: 0.0,
                  creditVes: stmt.amount,
                  debitUsd: 0.0,
                  creditUsd: BcvExchangeService.convertVesToUsd(stmt.amount, bcvExchangeRate),
                  bcvRate: bcvExchangeRate,
                },
              ],
            },
          });
        }
        // Detección de Comisiones Bancarias / Punto de Venta
        else if (this.REGEX_COMISION.test(stmt.description)) {
          // Desglose de Base Exenta/Gasto de Comisión e IVA Crédito Fiscal (16%)
          // En Venezuela: Monto_Comision = Base + (Base * 0.16) => Base = Monto / 1.16
          const baseComision = BcvExchangeService.round(stmt.amount / 1.16, 2);
          const ivaCredito = BcvExchangeService.round(stmt.amount - baseComision, 2);

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
                  accountCode: STANDARD_ACCOUNTS.GASTOS_COMISIONES_BANCARIAS.code,
                  accountName: STANDARD_ACCOUNTS.GASTOS_COMISIONES_BANCARIAS.name,
                  description: `Gasto Comisión Bancaria Ref. ${stmt.reference}`,
                  debitVes: baseComision,
                  creditVes: 0.0,
                  debitUsd: BcvExchangeService.convertVesToUsd(baseComision, bcvExchangeRate),
                  creditUsd: 0.0,
                  bcvRate: bcvExchangeRate,
                },
                {
                  accountCode: STANDARD_ACCOUNTS.CREDITO_FISCAL_IVA_16.code,
                  accountName: STANDARD_ACCOUNTS.CREDITO_FISCAL_IVA_16.name,
                  description: `Crédito Fiscal IVA 16% sobre Comisión Bancaria`,
                  debitVes: ivaCredito,
                  creditVes: 0.0,
                  debitUsd: BcvExchangeService.convertVesToUsd(ivaCredito, bcvExchangeRate),
                  creditUsd: 0.0,
                  bcvRate: bcvExchangeRate,
                },
                {
                  accountCode: STANDARD_ACCOUNTS.BANCOS_NACIONALES_VES.code,
                  accountName: STANDARD_ACCOUNTS.BANCOS_NACIONALES_VES.name,
                  description: `Disminución en cuenta corriente bancaria por comisión`,
                  debitVes: 0.0,
                  creditVes: stmt.amount,
                  debitUsd: 0.0,
                  creditUsd: BcvExchangeService.convertVesToUsd(stmt.amount, bcvExchangeRate),
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
