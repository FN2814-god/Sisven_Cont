import { AutomaticJournalGenerator } from './automatic-journal-generator';
import { BankReconciliationEngine } from './bank-reconciliation-engine';
import {
  BankStatementLineItem, InternalBankMovement,
} from './types';

describe('Motor Contable VEN-NIF PYME', () => {
  test('1. Asiento Automático: Factura de Venta a Crédito en Divisas', () => {
    const entry = new AutomaticJournalGenerator().generateSaleInvoiceEntry({
      tenantId: 'tenant-123', invoiceId: 'inv-001', invoiceNumber: 'FAC-0001',
      controlNumber: '00-0001', date: '2026-03-10',
      customerRif: 'J-30684267-5', customerName: 'Cliente Mayorista',
      amountUsd: 1160.0, baseImponibleUsd: 1000.0, vatAmountUsd: 160.0,
      bcvExchangeRate: 36.0, isCredit: true,
    });

    expect(entry.totalDebitVes).toBe(41760.0);
    expect(entry.totalCreditVes).toBe(41760.0);
    expect(entry.totalDebitUsd).toBe(1160.0);
    expect(entry.totalCreditUsd).toBe(1160.0);
    expect(entry.lines.length).toBe(3);
  });

  test('2. Asiento Automático: Cobro en Divisas con Retención IVA (75%) e IGTF (3%)', () => {
    const entry = new AutomaticJournalGenerator().generatePaymentReceivedEntry({
      tenantId: 'tenant-123', paymentId: 'pay-001', receiptNumber: 'RC-0001',
      date: '2026-03-15', customerRif: 'J-30684267-5',
      customerName: 'Cliente Mayorista SPE', isCustomerSpecialTaxpayer: true,
      totalInvoiceAmountVes: 41760.0, totalInvoiceAmountUsd: 1160.0,
      vatAmountVes: 5760.0, vatAmountUsd: 160.0,
      ivaRetentionVes: 4320.0, ivaRetentionUsd: 120.0,
      amountReceivedInCashUsd: 1000.0, igtfRate: 3.0,
      igtfPercibidoVes: 1080.0, igtfPercibidoUsd: 30.0,
      bcvExchangeRate: 36.0, targetAccountType: 'CAJA_DIVISAS',
    });

    expect(entry.totalDebitVes).toBe(42840.0);
    expect(entry.totalCreditVes).toBe(42840.0);
    expect(entry.totalDebitUsd).toBe(1190.0);
    expect(entry.totalCreditUsd).toBe(1190.0);
  });

  test('3. Asiento Automático: Compra a Proveedor con Retención IVA (75%) e ISLR (2%)', () => {
    const entry = new AutomaticJournalGenerator().generateSupplierPurchaseEntry({
      tenantId: 'tenant-123', purchaseId: 'pur-001', invoiceNumber: 'FAC-999',
      controlNumber: '00-0099', date: '2026-03-20',
      supplierRif: 'J-00006372-9', supplierName: 'Proveedor Mantenimiento',
      expenseAccountCode: '6.1.03.01.01.000', expenseDescription: 'Gastos de Mantenimiento',
      baseImponibleVes: 10000.0, baseImponibleUsd: 277.78,
      vatAmountVes: 1600.0, vatAmountUsd: 44.44,
      ivaRetentionVes: 1200.0, ivaRetentionUsd: 33.33,
      islrRetentionVes: 200.0, islrRetentionUsd: 5.56,
      islrConceptCode: '057', bcvExchangeRate: 36.0,
    });

    expect(entry.totalDebitVes).toBe(11600.0);
    expect(entry.totalCreditVes).toBe(11600.0);
    expect(entry.lines.length).toBe(5);
  });

  test('4. Conciliación Bancaria: Fases 1, 2, 3 (Fiscal) y 4 (Gastos)', () => {
    const statements: BankStatementLineItem[] = [
      { id: 'stmt-1', date: '2026-03-12', reference: '00012345', description: 'Transferencia Recibida', movementType: 'CREDITO', amount: 41760.0, status: 'PENDIENTE' },
      { id: 'stmt-2', date: '2026-03-16', reference: 'REF-OTRA', description: 'Pago de cliente', movementType: 'CREDITO', amount: 15000.0, status: 'PENDIENTE' },
      { id: 'stmt-3', date: '2026-03-18', reference: 'DEP-8888', description: 'Depósito en efectivo no identificado', movementType: 'CREDITO', amount: 50000.0, status: 'PENDIENTE' },
      { id: 'stmt-4', date: '2026-03-19', reference: 'DEB-991', description: 'CARGO IGTF BANCARIO TRANS. DIVISA', movementType: 'DEBITO', amount: 1500.0, status: 'PENDIENTE' },
      { id: 'stmt-5', date: '2026-03-20', reference: 'DEB-992', description: 'COMISION PTO.VENTA LIQUIDACION', movementType: 'DEBITO', amount: 116.0, status: 'PENDIENTE' },
    ];
    const internalMovements: InternalBankMovement[] = [
      { id: 'mov-1', date: '2026-03-11', reference: '12345', description: 'Cobro Factura FAC-0001', movementType: 'CREDITO', amount: 41760.0, status: 'PENDIENTE', salesInvoiceNumber: 'FAC-0001' },
      { id: 'mov-2', date: '2026-03-12', reference: 'INT-999', description: 'Cobro parcial cliente B', movementType: 'CREDITO', amount: 15000.0, status: 'PENDIENTE', salesInvoiceNumber: 'FAC-0002' },
    ];

    const result = BankReconciliationEngine.executeReconciliation(statements, internalMovements, 36.0);

    expect(result.summary.phase1ExactMatches).toBe(1);
    expect(result.summary.phase2TemporalMatches).toBe(1);

    const alert = result.fiscalCrossChecks.find((c) => c.statementId === 'stmt-3');
    expect(alert).toBeDefined();
    expect(alert!.isMatched).toBe(false);
    expect(alert!.alertType).toBe('RIESGO_FISCAL_SIN_SOPORTE');

    expect(result.detectedExpenses.length).toBe(2);
    const expIgtf = result.detectedExpenses.find((e) => e.type === 'IGTF_BANCARIO');
    expect(expIgtf).toBeDefined();
    expect(expIgtf!.totalAmount).toBe(1500.0);
    expect(expIgtf!.vatCredit).toBe(0.0);

    const expComision = result.detectedExpenses.find((e) => e.type === 'COMISION_BANCARIA');
    expect(expComision).toBeDefined();
    expect(expComision!.totalAmount).toBe(116.0);
    expect(expComision!.netExpense).toBe(100.0);
    expect(expComision!.vatCredit).toBe(16.0);
  });
});
