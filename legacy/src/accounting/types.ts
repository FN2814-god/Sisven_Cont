/**
 * Tipos de datos para Contabilidad Automática VEN-NIF y Conciliación Bancaria
 */

export interface JournalEntryLineDto {
  lineId?: string;
  accountCode: string;
  accountName: string;
  description: string;
  debitVes: number;
  creditVes: number;
  debitUsd: number;
  creditUsd: number;
  bcvRate: number;
  thirdPartyRif?: string;
  costCenter?: string;
}

export interface JournalEntryDto {
  entryId?: string;
  tenantId: string;
  fiscalYear: number;
  fiscalPeriod: number;
  entryNumber: number;
  entryDate: string; // YYYY-MM-DD
  concept: string;
  sourceModule: 'VENTAS' | 'COBROS' | 'COMPRAS' | 'BANCOS' | 'MANUAL';
  sourceDocumentId?: string;
  status: 'BORRADOR' | 'ASENTADO' | 'ANULADO';
  bcvExchangeRate: number;
  lines: JournalEntryLineDto[];
  totalDebitVes: number;
  totalCreditVes: number;
  totalDebitUsd: number;
  totalCreditUsd: number;
}

export interface InvoiceIssuedEvent {
  tenantId: string;
  invoiceId: string;
  invoiceNumber: string;
  controlNumber: string;
  date: string; // YYYY-MM-DD
  customerRif: string;
  customerName: string;
  amountUsd: number;
  baseImponibleUsd: number;
  vatAmountUsd: number;
  bcvExchangeRate: number;
  isCredit: boolean;
}

export interface PaymentReceivedEvent {
  tenantId: string;
  paymentId: string;
  receiptNumber: string;
  date: string; // YYYY-MM-DD
  customerRif: string;
  customerName: string;
  isCustomerSpecialTaxpayer: boolean; // SPE
  totalInvoiceAmountVes: number;
  totalInvoiceAmountUsd: number;
  vatAmountVes: number;
  vatAmountUsd: number;
  ivaRetentionVes: number; // Ej. 75%
  ivaRetentionUsd: number;
  amountReceivedInCashUsd: number;
  igtfRate: number; // 3%
  igtfPercibidoVes: number;
  igtfPercibidoUsd: number;
  bcvExchangeRate: number;
  targetAccountType: 'CAJA_DIVISAS' | 'BANCO_VES' | 'BANCO_USD';
}

export interface SupplierPurchaseEvent {
  tenantId: string;
  purchaseId: string;
  invoiceNumber: string;
  controlNumber: string;
  date: string;
  supplierRif: string;
  supplierName: string;
  expenseAccountCode: string; // Ej. 6.1.03.01.01.000
  expenseDescription: string;
  baseImponibleVes: number;
  baseImponibleUsd: number;
  vatAmountVes: number;
  vatAmountUsd: number;
  ivaRetentionVes: number; // 75% o 100%
  ivaRetentionUsd: number;
  islrRetentionVes: number; // Ej. 2% PJ (057)
  islrRetentionUsd: number;
  islrConceptCode: string;
  bcvExchangeRate: number;
}

// Modelos de Conciliación Bancaria
export type MovementType = 'DEBITO' | 'CREDITO';

export type ReconciliationState = 'PENDIENTE' | 'CONCILIADO' | 'DISCREPANCIA' | 'IDENTIFICACION_REQUERIDA';

export interface BankStatementLineItem {
  id: string;
  date: string; // YYYY-MM-DD
  reference: string;
  description: string;
  movementType: MovementType;
  amount: number;
  balance?: number;
  status: ReconciliationState;
  reconciledWithId?: string;
  reconciliationType?: string;
  notes?: string;
}

export interface InternalBankMovement {
  id: string;
  date: string; // YYYY-MM-DD
  reference: string;
  description: string;
  movementType: MovementType;
  amount: number;
  status: ReconciliationState;
  matchedStatementId?: string;
  salesInvoiceNumber?: string;
}

export interface BankVsSalesCrossCheckResult {
  statementId: string;
  statementAmount: number;
  matchedInvoiceNumber?: string;
  invoiceExpectedTotal?: number;
  isMatched: boolean;
  alertType?: 'RIESGO_FISCAL_SIN_SOPORTE' | 'DISCREPANCIA_MONTOS' | 'OK';
  message: string;
}

export interface AutoDetectedBankExpense {
  statementId: string;
  date: string;
  reference: string;
  description: string;
  type: 'IGTF_BANCARIO' | 'COMISION_BANCARIA';
  totalAmount: number;
  netExpense: number;
  vatCredit: number; // 16% si es comisión bancaria
  suggestedJournalEntry: Partial<JournalEntryDto>;
}
