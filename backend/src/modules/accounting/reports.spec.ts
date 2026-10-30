import { DataSource } from 'typeorm';
import { ReportsService } from './reports.service';
import {
  ChartOfAccount, FiscalPeriod, JournalEntry, JournalEntryLine,
} from '../../entities/accounting.entity';
import { STANDARD_ACCOUNTS } from '../../shared/accounting/automatic-journal-generator';

/**
 * Suite de reportes contables sobre SQLite en memoria.
 * Dataset: una venta de 1,160 Bs (base 1,000 + IVA 160) y un gasto de 500 Bs,
 * todo a tasa BCV 1.0 para simplificar los cálculos.
 */
describe('Reportes Contables (diario, mayor, balances, EEFF)', () => {
  let ds: DataSource;
  let svc: ReportsService;
  const T = 't1';

  const acc = (code: string, name: string, nature: 'DEUDORA' | 'ACREEDORA') => ({
    tenant_id: T, code, name, level: 6, nature, is_selectable: true, parent_id: null,
  });

  beforeAll(async () => {
    ds = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [ChartOfAccount, FiscalPeriod, JournalEntry, JournalEntryLine],
      synchronize: true,
    });
    await ds.initialize();
    svc = new ReportsService(
      ds.getRepository(JournalEntry),
      ds.getRepository(JournalEntryLine),
      ds.getRepository(ChartOfAccount),
    );

    const chart = ds.getRepository(ChartOfAccount);
    const idByCode = new Map<string, string>();
    const seed = [
      acc(STANDARD_ACCOUNTS.CAJA_CUSTODIA_DIVISAS.code, STANDARD_ACCOUNTS.CAJA_CUSTODIA_DIVISAS.name, 'DEUDORA'),
      acc(STANDARD_ACCOUNTS.VENTAS_GRAVADAS_16.code, STANDARD_ACCOUNTS.VENTAS_GRAVADAS_16.name, 'ACREEDORA'),
      acc(STANDARD_ACCOUNTS.DEBITO_FISCAL_IVA_16.code, STANDARD_ACCOUNTS.DEBITO_FISCAL_IVA_16.name, 'ACREEDORA'),
      acc(STANDARD_ACCOUNTS.GASTOS_SERVICIOS_GENERALES.code, STANDARD_ACCOUNTS.GASTOS_SERVICIOS_GENERALES.name, 'DEUDORA'),
      acc('3.3.01.01.00.000', 'Resultados Acumulados', 'ACREEDORA'),
    ];
    for (const a of seed) {
      const saved = await chart.save(chart.create(a));
      idByCode.set(a.code, saved.account_id);
    }

    const line = (entryId: string, code: string, name: string, d: number, c: number) => ({
      tenant_id: T, entry_id: entryId, account_id: idByCode.get(code)!,
      account_code: code, account_name: name,
      debit_ves: d, credit_ves: c, debit_usd: d, credit_usd: c, bcv_rate: 1,
    });

    // Asiento 1: venta 1,160 (caja) = 1,000 (ventas) + 160 (IVA)
    await ds.getRepository(JournalEntry).save(ds.getRepository(JournalEntry).create({
      entry_id: 'e1', tenant_id: T, fiscal_year: 2026, fiscal_period: 3, entry_number: 1,
      entry_date: '2026-03-05', concept: 'Venta', source_module: 'VENTAS',
      status: 'ASENTADO', bcv_exchange_rate: 1,
      total_debit_ves: 1160, total_credit_ves: 1160, total_debit_usd: 1160, total_credit_usd: 1160,
      lines: [
        line('e1', STANDARD_ACCOUNTS.CAJA_CUSTODIA_DIVISAS.code, 'Caja', 1160, 0),
        line('e1', STANDARD_ACCOUNTS.VENTAS_GRAVADAS_16.code, 'Ventas', 0, 1000),
        line('e1', STANDARD_ACCOUNTS.DEBITO_FISCAL_IVA_16.code, 'Débito IVA', 0, 160),
      ],
    }));

    // Asiento 2: gasto 500 (gastos) contra caja
    await ds.getRepository(JournalEntry).save(ds.getRepository(JournalEntry).create({
      entry_id: 'e2', tenant_id: T, fiscal_year: 2026, fiscal_period: 3, entry_number: 2,
      entry_date: '2026-03-10', concept: 'Gasto servicios', source_module: 'MANUAL',
      status: 'ASENTADO', bcv_exchange_rate: 1,
      total_debit_ves: 500, total_credit_ves: 500, total_debit_usd: 500, total_credit_usd: 500,
      lines: [
        line('e2', STANDARD_ACCOUNTS.GASTOS_SERVICIOS_GENERALES.code, 'Gastos', 500, 0),
        line('e2', STANDARD_ACCOUNTS.CAJA_CUSTODIA_DIVISAS.code, 'Caja', 0, 500),
      ],
    }));
  });

  afterAll(() => ds.destroy());

  test('Libro Diario lista los asientos cronológicamente', async () => {
    const book = await svc.journalBook(T, 2026, 3);
    expect(book.entries.length).toBe(2);
    expect(book.entries[0].entry_number).toBe(1);
    expect(book.entries[0].lines.length).toBe(3);
  });

  test('Libro Mayor muestra saldo acumulado correcto', async () => {
    const chart = await ds.getRepository(ChartOfAccount).findOne({
      where: { tenant_id: T, code: STANDARD_ACCOUNTS.CAJA_CUSTODIA_DIVISAS.code },
    });
    const ledger = await svc.ledger(T, chart!.account_id, '2026-03-01', '2026-03-31');
    expect(ledger.movements.length).toBe(2);
    // 1,160 débito − 500 crédito = 660 neto
    expect(ledger.closing_balance_ves).toBe(660);
  });

  test('Balance de Comprobación cuadra (debe = haber)', async () => {
    const tb = await svc.trialBalance(T, 2026, 3);
    expect(tb.totals.movement_debit_ves).toBe(tb.totals.movement_credit_ves);
    expect(tb.totals.closing_debit_ves).toBe(tb.totals.closing_credit_ves);
    const ventas = tb.accounts.find((a) => a.code === STANDARD_ACCOUNTS.VENTAS_GRAVADAS_16.code);
    expect(ventas!.closing_credit_ves).toBe(1000);
  });

  test('Estado de Resultados: ingresos − gastos', async () => {
    const is = await svc.incomeStatement(T, '2026-01-01', '2026-12-31');
    expect(is.ingresos.total.ves).toBe(1000);
    expect(is.gastos.total.ves).toBe(500);
    expect(is.resultado_neto.ves).toBe(500);
  });

  test('Balance General: Activo = Pasivo + Patrimonio (resultado incluido)', async () => {
    const bs = await svc.balanceSheet(T, '2026-12-31');
    // Caja 660; Débito IVA 160; Resultado del ejercicio 500
    expect(bs.activo.total_ves).toBe(660);
    expect(bs.pasivo.total_ves).toBe(160);
    expect(bs.patrimonio.resultado_ejercicio_ves).toBe(500);
    expect(bs.balance_check_ves).toBe(0);
  });
});
