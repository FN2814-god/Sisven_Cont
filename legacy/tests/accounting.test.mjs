import test from 'node:test';
import assert from 'node:assert/strict';

// Importamos la lógica equivalente para el test runner de Node.js
class BcvExchangeService {
  static round(val, decimals = 2) {
    const factor = Math.pow(10, decimals);
    const n = +(val * factor);
    const i = Math.floor(n);
    const f = n - i;
    const e = 1e-8;
    let r = (f > 0.5 - e && f < 0.5 + e) ? (i % 2 === 0 ? i : i + 1) : Math.round(n);
    return +(r / factor).toFixed(decimals);
  }

  static convertUsdToVes(amountUsd, rate) {
    if (rate <= 0) throw new Error('Tasa debe ser > 0');
    return this.round(amountUsd * rate, 2);
  }

  static convertVesToUsd(amountVes, rate) {
    if (rate <= 0) throw new Error('Tasa debe ser > 0');
    return this.round(amountVes / rate, 2);
  }
}

const STANDARD_ACCOUNTS = {
  CAJA_CUSTODIA_DIVISAS: { code: '1.1.01.01.00.000', name: 'Caja Chica / Custodia Divisas' },
  BANCOS_NACIONALES_VES: { code: '1.1.01.02.01.000', name: 'Bancos Nacionales Moneda Cta Cte (VES)' },
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
  static assertDoubleEntryBalance(lines) {
    if (lines.length < 2) throw new Error('Mínimo 2 líneas');
    let sumDebitVes = 0.0;
    let sumCreditVes = 0.0;
    let sumDebitUsd = 0.0;
    let sumCreditUsd = 0.0;
    for (const l of lines) {
      sumDebitVes = BcvExchangeService.round(sumDebitVes + l.debitVes, 2);
      sumCreditVes = BcvExchangeService.round(sumCreditVes + l.creditVes, 2);
      sumDebitUsd = BcvExchangeService.round(sumDebitUsd + l.debitUsd, 2);
      sumCreditUsd = BcvExchangeService.round(sumCreditUsd + l.creditUsd, 2);
    }
    const diffVes = Math.abs(BcvExchangeService.round(sumDebitVes - sumCreditVes, 2));
    const diffUsd = Math.abs(BcvExchangeService.round(sumDebitUsd - sumCreditUsd, 2));
    if (diffVes !== 0.0) throw new Error(`Descuadre VES: ${sumDebitVes} vs ${sumCreditVes}`);
    if (diffUsd !== 0.0) throw new Error(`Descuadre USD: ${sumDebitUsd} vs ${sumCreditUsd}`);
  }

  generateSaleInvoiceEntry(event, entryNumber = 1) {
    const { tenantId, invoiceNumber, date, customerRif, customerName, bcvExchangeRate } = event;
    const baseUsd = BcvExchangeService.round(event.baseImponibleUsd, 2);
    const vatUsd = BcvExchangeService.round(event.vatAmountUsd, 2);
    const totalUsd = BcvExchangeService.round(baseUsd + vatUsd, 2);

    const baseVes = BcvExchangeService.convertUsdToVes(baseUsd, bcvExchangeRate);
    const vatVes = BcvExchangeService.convertUsdToVes(vatUsd, bcvExchangeRate);
    const totalVes = BcvExchangeService.round(baseVes + vatVes, 2);

    const lines = [
      {
        accountCode: STANDARD_ACCOUNTS.CXC_COMERCIALES_NACIONALES.code,
        debitVes: totalVes,
        creditVes: 0.0,
        debitUsd: totalUsd,
        creditUsd: 0.0,
      },
      {
        accountCode: STANDARD_ACCOUNTS.VENTAS_GRAVADAS_16.code,
        debitVes: 0.0,
        creditVes: baseVes,
        debitUsd: 0.0,
        creditUsd: baseUsd,
      },
      {
        accountCode: STANDARD_ACCOUNTS.DEBITO_FISCAL_IVA_16.code,
        debitVes: 0.0,
        creditVes: vatVes,
        debitUsd: 0.0,
        creditUsd: vatUsd,
      },
    ];

    AutomaticJournalGenerator.assertDoubleEntryBalance(lines);
    return {
      entryNumber,
      concept: `Factura ${invoiceNumber}`,
      lines,
      totalDebitVes: totalVes,
      totalCreditVes: totalVes,
      totalDebitUsd: totalUsd,
      totalCreditUsd: totalUsd,
    };
  }

  generatePaymentReceivedEntry(event, entryNumber = 1) {
    const { bcvExchangeRate } = event;
    const totalInvoiceVes = BcvExchangeService.round(event.totalInvoiceAmountVes, 2);
    const totalInvoiceUsd = BcvExchangeService.round(event.totalInvoiceAmountUsd, 2);
    const ivaRetentionVes = BcvExchangeService.round(event.ivaRetentionVes, 2);
    const ivaRetentionUsd = BcvExchangeService.round(event.ivaRetentionUsd, 2);
    const igtfVes = BcvExchangeService.round(event.igtfPercibidoVes, 2);
    const igtfUsd = BcvExchangeService.round(event.igtfPercibidoUsd, 2);

    const netoCobrarFacturaVes = BcvExchangeService.round(totalInvoiceVes - ivaRetentionVes, 2);
    const netoCobrarFacturaUsd = BcvExchangeService.round(totalInvoiceUsd - ivaRetentionUsd, 2);

    const totalIngresoCajaVes = BcvExchangeService.round(netoCobrarFacturaVes + igtfVes, 2);
    const totalIngresoCajaUsd = BcvExchangeService.round(netoCobrarFacturaUsd + igtfUsd, 2);

    const lines = [
      {
        accountCode: STANDARD_ACCOUNTS.CAJA_CUSTODIA_DIVISAS.code,
        debitVes: totalIngresoCajaVes,
        creditVes: 0.0,
        debitUsd: totalIngresoCajaUsd,
        creditUsd: 0.0,
      },
      {
        accountCode: STANDARD_ACCOUNTS.RETENCIONES_IVA_COMPENSAR.code,
        debitVes: ivaRetentionVes,
        creditVes: 0.0,
        debitUsd: ivaRetentionUsd,
        creditUsd: 0.0,
      },
      {
        accountCode: STANDARD_ACCOUNTS.CXC_COMERCIALES_NACIONALES.code,
        debitVes: 0.0,
        creditVes: totalInvoiceVes,
        debitUsd: 0.0,
        creditUsd: totalInvoiceUsd,
      },
      {
        accountCode: STANDARD_ACCOUNTS.IGTF_POR_PAGAR_ENTERAR_3.code,
        debitVes: 0.0,
        creditVes: igtfVes,
        debitUsd: 0.0,
        creditUsd: igtfUsd,
      },
    ];

    AutomaticJournalGenerator.assertDoubleEntryBalance(lines);
    const totalDebitVes = BcvExchangeService.round(totalIngresoCajaVes + ivaRetentionVes, 2);
    const totalDebitUsd = BcvExchangeService.round(totalIngresoCajaUsd + ivaRetentionUsd, 2);

    return {
      entryNumber,
      lines,
      totalDebitVes,
      totalCreditVes: totalDebitVes,
      totalDebitUsd,
      totalCreditUsd: totalDebitUsd,
    };
  }

  generateSupplierPurchaseEntry(event, entryNumber = 1) {
    const { bcvExchangeRate } = event;
    const baseVes = BcvExchangeService.round(event.baseImponibleVes, 2);
    const baseUsd = BcvExchangeService.round(event.baseImponibleUsd, 2);
    const vatVes = BcvExchangeService.round(event.vatAmountVes, 2);
    const vatUsd = BcvExchangeService.round(event.vatAmountUsd, 2);

    const totalInvoiceVes = BcvExchangeService.round(baseVes + vatVes, 2);
    const totalInvoiceUsd = BcvExchangeService.round(baseUsd + vatUsd, 2);

    const ivaRetVes = BcvExchangeService.round(event.ivaRetentionVes, 2);
    const ivaRetUsd = BcvExchangeService.round(event.ivaRetentionUsd, 2);

    const islrRetVes = BcvExchangeService.round(event.islrRetentionVes, 2);
    const islrRetUsd = BcvExchangeService.round(event.islrRetentionUsd, 2);

    const netoPagarVes = BcvExchangeService.round(totalInvoiceVes - ivaRetVes - islrRetVes, 2);
    const netoPagarUsd = BcvExchangeService.round(totalInvoiceUsd - ivaRetUsd - islrRetUsd, 2);

    const lines = [
      {
        accountCode: STANDARD_ACCOUNTS.GASTOS_SERVICIOS_GENERALES.code,
        debitVes: baseVes,
        creditVes: 0.0,
        debitUsd: baseUsd,
        creditUsd: 0.0,
      },
      {
        accountCode: STANDARD_ACCOUNTS.CREDITO_FISCAL_IVA_16.code,
        debitVes: vatVes,
        creditVes: 0.0,
        debitUsd: vatUsd,
        creditUsd: 0.0,
      },
      {
        accountCode: STANDARD_ACCOUNTS.CXP_PROVEEDORES_NACIONALES.code,
        debitVes: 0.0,
        creditVes: netoPagarVes,
        debitUsd: 0.0,
        creditUsd: netoPagarUsd,
      },
      {
        accountCode: STANDARD_ACCOUNTS.IVA_RETENIDO_PROVEEDORES_ENTERAR.code,
        debitVes: 0.0,
        creditVes: ivaRetVes,
        debitUsd: 0.0,
        creditUsd: ivaRetUsd,
      },
      {
        accountCode: STANDARD_ACCOUNTS.RETENCIONES_ISLR_PAGAR.code,
        debitVes: 0.0,
        creditVes: islrRetVes,
        debitUsd: 0.0,
        creditUsd: islrRetUsd,
      },
    ];

    AutomaticJournalGenerator.assertDoubleEntryBalance(lines);
    return {
      entryNumber,
      lines,
      totalDebitVes: totalInvoiceVes,
      totalCreditVes: totalInvoiceVes,
      totalDebitUsd: totalInvoiceUsd,
      totalCreditUsd: totalInvoiceUsd,
    };
  }
}

class BankReconciliationEngine {
  static REGEX_IGTF = /(IGTF|IMP\.?GRAN\.?TRANS|IMPUESTO\s+TRANS\.?\s+FINAN)/i;
  static REGEX_COMISION = /(COMISION|COM\.?PTO\.?VENTA|MANT\.?CUENTA)/i;

  static normalizeReference(ref) {
    if (!ref) return '';
    return ref.replace(/[^A-Za-z0-9]/g, '').replace(/^0+/, '');
  }

  static calculateDateDifferenceInDays(dateStrA, dateStrB) {
    const diffTime = Math.abs(new Date(dateStrA).getTime() - new Date(dateStrB).getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static executeReconciliation(statementLines, internalMovements, bcvRate = 36.0) {
    let phase1Count = 0;
    let phase2Count = 0;

    // Fase 1: Coincidencia Exacta
    for (const stmt of statementLines) {
      if (stmt.status === 'CONCILIADO') continue;
      const normRef = this.normalizeReference(stmt.reference);
      const match = internalMovements.find(
        (m) =>
          m.status !== 'CONCILIADO' &&
          m.movementType === stmt.movementType &&
          Math.abs(m.amount - stmt.amount) < 0.01 &&
          this.normalizeReference(m.reference) === normRef &&
          this.calculateDateDifferenceInDays(stmt.date, m.date) <= 2
      );
      if (match) {
        stmt.status = 'CONCILIADO';
        stmt.reconciliationType = 'EXACTA_NIVEL_1';
        stmt.reconciledWithId = match.id;
        match.status = 'CONCILIADO';
        match.matchedStatementId = stmt.id;
        phase1Count++;
      }
    }

    // Fase 2: Coincidencia Temporal <= 5 dias
    for (const stmt of statementLines) {
      if (stmt.status === 'CONCILIADO') continue;
      const match = internalMovements.find(
        (m) =>
          m.status !== 'CONCILIADO' &&
          m.movementType === stmt.movementType &&
          Math.abs(m.amount - stmt.amount) < 0.01 &&
          this.calculateDateDifferenceInDays(stmt.date, m.date) <= 5
      );
      if (match) {
        stmt.status = 'CONCILIADO';
        stmt.reconciliationType = 'NUMERICA_TEMPORAL';
        stmt.reconciledWithId = match.id;
        match.status = 'CONCILIADO';
        match.matchedStatementId = stmt.id;
        phase2Count++;
      }
    }

    // Fase 3: Regla Banco vs Facturación
    const fiscalCrossChecks = [];
    for (const stmt of statementLines) {
      if (stmt.movementType === 'CREDITO') {
        const linkedMov = internalMovements.find((m) => m.matchedStatementId === stmt.id);
        if (linkedMov && linkedMov.salesInvoiceNumber) {
          fiscalCrossChecks.push({
            statementId: stmt.id,
            isMatched: true,
            alertType: 'OK',
            message: `Abono respaldado por Factura N° ${linkedMov.salesInvoiceNumber}.`,
          });
        } else {
          stmt.status = 'IDENTIFICACION_REQUERIDA';
          fiscalCrossChecks.push({
            statementId: stmt.id,
            isMatched: false,
            alertType: 'RIESGO_FISCAL_SIN_SOPORTE',
            message: `Riesgo Fiscal: Abono por Bs. ${stmt.amount} sin factura emitida.`,
          });
        }
      }
    }

    // Fase 4: Detección Automática de Gastos
    const detectedExpenses = [];
    for (const stmt of statementLines) {
      if (stmt.status !== 'CONCILIADO' && stmt.movementType === 'DEBITO') {
        if (this.REGEX_IGTF.test(stmt.description)) {
          detectedExpenses.push({
            statementId: stmt.id,
            type: 'IGTF_BANCARIO',
            totalAmount: stmt.amount,
            netExpense: stmt.amount,
            vatCredit: 0.0,
          });
        } else if (this.REGEX_COMISION.test(stmt.description)) {
          const baseComision = BcvExchangeService.round(stmt.amount / 1.16, 2);
          const ivaCredito = BcvExchangeService.round(stmt.amount - baseComision, 2);
          detectedExpenses.push({
            statementId: stmt.id,
            type: 'COMISION_BANCARIA',
            totalAmount: stmt.amount,
            netExpense: baseComision,
            vatCredit: ivaCredito,
          });
        }
      }
    }

    return {
      reconciledStatements: statementLines,
      reconciledInternalMovements: internalMovements,
      fiscalCrossChecks,
      detectedExpenses,
      summary: {
        phase1ExactMatches: phase1Count,
        phase2TemporalMatches: phase2Count,
        fiscalAlertsCount: fiscalCrossChecks.filter((c) => !c.isMatched).length,
        autoDetectedExpensesCount: detectedExpenses.length,
      },
    };
  }
}

// =========================================================================================
// SUITE DE PRUEBAS
// =========================================================================================

test('1. Asiento Contable Automático: Factura de Venta a Crédito en Divisas', () => {
  const generator = new AutomaticJournalGenerator();
  const entry = generator.generateSaleInvoiceEntry({
    tenantId: 'tenant-123',
    invoiceId: 'inv-001',
    invoiceNumber: 'FAC-0001',
    controlNumber: '00-0001',
    date: '2026-03-10',
    customerRif: 'J-30684267-5',
    customerName: 'Cliente Mayorista',
    amountUsd: 1160.0,
    baseImponibleUsd: 1000.0,
    vatAmountUsd: 160.0,
    bcvExchangeRate: 36.0,
    isCredit: true,
  });

  // Base VES: 1,000 * 36 = 36,000.00
  // IVA VES: 160 * 36 = 5,760.00
  // Total VES: 41,760.00
  assert.equal(entry.totalDebitVes, 41760.0);
  assert.equal(entry.totalCreditVes, 41760.0);
  assert.equal(entry.totalDebitUsd, 1160.0);
  assert.equal(entry.totalCreditUsd, 1160.0);
  assert.equal(entry.lines.length, 3);
});

test('2. Asiento Contable Automático: Cobro en Divisas con Retención IVA (75%) e IGTF Percibido (3%)', () => {
  const generator = new AutomaticJournalGenerator();
  // Factura previa de 41,760 Bs ($1,160).
  // Retención IVA 75% = 4,320 Bs ($120).
  // Neto Factura = 37,440 Bs ($1,040).
  // IGTF 3% percibido sobre $1,000 cobrado = $30 (1,080 Bs).
  // Ingreso Total a Caja = 37,440 + 1,080 = 38,520 Bs ($1,070).
  const entry = generator.generatePaymentReceivedEntry({
    tenantId: 'tenant-123',
    paymentId: 'pay-001',
    receiptNumber: 'RC-0001',
    date: '2026-03-15',
    customerRif: 'J-30684267-5',
    customerName: 'Cliente Mayorista SPE',
    isCustomerSpecialTaxpayer: true,
    totalInvoiceAmountVes: 41760.0,
    totalInvoiceAmountUsd: 1160.0,
    vatAmountVes: 5760.0,
    vatAmountUsd: 160.0,
    ivaRetentionVes: 4320.0,
    ivaRetentionUsd: 120.0,
    amountReceivedInCashUsd: 1000.0,
    igtfRate: 3.0,
    igtfPercibidoVes: 1080.0,
    igtfPercibidoUsd: 30.0,
    bcvExchangeRate: 36.0,
    targetAccountType: 'CAJA_DIVISAS',
  });

  // Total Debe = 38,520 (Caja) + 4,320 (Ret IVA) = 42,840 Bs.
  // Total Haber = 41,760 (CxC) + 1,080 (IGTF por enterar) = 42,840 Bs.
  assert.equal(entry.totalDebitVes, 42840.0);
  assert.equal(entry.totalCreditVes, 42840.0);
  assert.equal(entry.totalDebitUsd, 1190.0);
  assert.equal(entry.totalCreditUsd, 1190.0);
});

test('3. Asiento Contable Automático: Compra a Proveedor con Retención IVA (75%) e ISLR (2%)', () => {
  const generator = new AutomaticJournalGenerator();
  // Base: 10,000 Bs. IVA 16%: 1,600 Bs. Total: 11,600 Bs.
  // Retención IVA 75%: 1,200 Bs.
  // Retención ISLR 2%: 200 Bs.
  // Neto a pagar a Proveedor: 11,600 - 1,200 - 200 = 10,200 Bs.
  const entry = generator.generateSupplierPurchaseEntry({
    tenantId: 'tenant-123',
    purchaseId: 'pur-001',
    invoiceNumber: 'FAC-999',
    controlNumber: '00-0099',
    date: '2026-03-20',
    supplierRif: 'J-00006372-9',
    supplierName: 'Proveedor Mantenimiento',
    expenseAccountCode: '6.1.03.01.01.000',
    expenseDescription: 'Gastos de Mantenimiento',
    baseImponibleVes: 10000.0,
    baseImponibleUsd: 277.78,
    vatAmountVes: 1600.0,
    vatAmountUsd: 44.44,
    ivaRetentionVes: 1200.0,
    ivaRetentionUsd: 33.33,
    islrRetentionVes: 200.0,
    islrRetentionUsd: 5.56,
    islrConceptCode: '057',
    bcvExchangeRate: 36.0,
  });

  assert.equal(entry.totalDebitVes, 11600.0);
  assert.equal(entry.totalCreditVes, 11600.0);
  assert.equal(entry.lines.length, 5);
});

test('4. Conciliación Bancaria Automática: Fases 1, 2, 3 (Fiscal) y 4 (Gastos)', () => {
  const statements = [
    // 1. Coincidencia Exacta Fase 1
    {
      id: 'stmt-1',
      date: '2026-03-12',
      reference: '00012345',
      description: 'Transferencia Recibida',
      movementType: 'CREDITO',
      amount: 41760.0,
      status: 'PENDIENTE',
    },
    // 2. Coincidencia Temporal Fase 2 (ref diferente, fecha a 4 días)
    {
      id: 'stmt-2',
      date: '2026-03-16',
      reference: 'REF-OTRA',
      description: 'Pago de cliente',
      movementType: 'CREDITO',
      amount: 15000.0,
      status: 'PENDIENTE',
    },
    // 3. Abono sin soporte fiscal (Fase 3: Riesgo SENIAT)
    {
      id: 'stmt-3',
      date: '2026-03-18',
      reference: 'DEP-8888',
      description: 'Depósito en efectivo no identificado',
      movementType: 'CREDITO',
      amount: 50000.0,
      status: 'PENDIENTE',
    },
    // 4. Débito por IGTF Bancario (Fase 4: Auto-gasto)
    {
      id: 'stmt-4',
      date: '2026-03-19',
      reference: 'DEB-991',
      description: 'CARGO IGTF BANCARIO TRANS. DIVISA',
      movementType: 'DEBITO',
      amount: 1500.0,
      status: 'PENDIENTE',
    },
    // 5. Débito por Comisión Bancaria Punto de Venta (Fase 4: Auto-gasto + IVA)
    {
      id: 'stmt-5',
      date: '2026-03-20',
      reference: 'DEB-992',
      description: 'COMISION PTO.VENTA LIQUIDACION',
      movementType: 'DEBITO',
      amount: 116.0, // Base 100 + IVA 16
      status: 'PENDIENTE',
    },
  ];

  const internalMovements = [
    {
      id: 'mov-1',
      date: '2026-03-11', // diff 1 día
      reference: '12345', // coincide sin ceros
      description: 'Cobro Factura FAC-0001',
      movementType: 'CREDITO',
      amount: 41760.0,
      status: 'PENDIENTE',
      salesInvoiceNumber: 'FAC-0001',
    },
    {
      id: 'mov-2',
      date: '2026-03-12', // diff 4 días con stmt-2
      reference: 'INT-999',
      description: 'Cobro parcial cliente B',
      movementType: 'CREDITO',
      amount: 15000.0,
      status: 'PENDIENTE',
      salesInvoiceNumber: 'FAC-0002',
    },
  ];

  const result = BankReconciliationEngine.executeReconciliation(statements, internalMovements, 36.0);

  // Verificaciones de Fase 1 y 2
  assert.equal(result.summary.phase1ExactMatches, 1, 'stmt-1 debe coincidir en Fase 1');
  assert.equal(result.summary.phase2TemporalMatches, 1, 'stmt-2 debe coincidir en Fase 2');

  // Verificación de Fase 3 (Control Fiscal)
  const alert = result.fiscalCrossChecks.find((c) => c.statementId === 'stmt-3');
  assert.ok(alert, 'Debe haber alerta para stmt-3');
  assert.equal(alert.isMatched, false);
  assert.equal(alert.alertType, 'RIESGO_FISCAL_SIN_SOPORTE');

  // Verificación de Fase 4 (Detección de Gastos e IGTF)
  assert.equal(result.detectedExpenses.length, 2);

  const expIgtf = result.detectedExpenses.find((e) => e.type === 'IGTF_BANCARIO');
  assert.ok(expIgtf);
  assert.equal(expIgtf.totalAmount, 1500.0);
  assert.equal(expIgtf.vatCredit, 0.0);

  const expComision = result.detectedExpenses.find((e) => e.type === 'COMISION_BANCARIA');
  assert.ok(expComision);
  assert.equal(expComision.totalAmount, 116.0);
  assert.equal(expComision.netExpense, 100.0);
  assert.equal(expComision.vatCredit, 16.0);
});
