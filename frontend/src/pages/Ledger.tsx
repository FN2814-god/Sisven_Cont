import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { fmtVes } from '../lib/format';
import { Card, EmptyState, inputCls, tdCls, thCls } from '../components/ui';

export default function LedgerPage() {
  const { tenant } = useAuth();
  const [accountId, setAccountId] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [period, setPeriod] = useState(now.getMonth() + 1);
  const [from, setFrom] = useState(`${now.getFullYear()}-01-01`);
  const [to, setTo] = useState(now.toISOString().substring(0, 10));

  const lastDay = new Date(year, period, 0).getDate();
  const rangeFrom = `${year}-${String(period).padStart(2, '0')}-01`;
  const rangeTo = `${year}-${String(period).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const chart = useQuery({
    queryKey: ['chart', tenant?.tenant_id],
    queryFn: () => api.get('/chart-of-accounts').then((r) => r.data),
    enabled: !!tenant,
  });
  const analytical = useQuery({
    queryKey: ['analytical-ledger', tenant?.tenant_id, rangeFrom, rangeTo],
    queryFn: () =>
      api.get(`/reports/analytical-ledger?from=${rangeFrom}&to=${rangeTo}`).then((r) => r.data),
    enabled: !!tenant,
  });
  const ledger = useQuery({
    queryKey: ['ledger', tenant?.tenant_id, accountId, from, to],
    queryFn: () => api.get(`/reports/ledger?account_id=${accountId}&from=${from}&to=${to}`).then((r) => r.data),
    enabled: !!tenant && !!accountId,
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Libro Mayor</h1>
          <p className="text-sm text-slate-500">Mayor analítico del período — todas las cuentas con sus movimientos</p>
        </div>
        <button onClick={() => window.print()} className="no-print px-3 py-1.5 bg-slate-100 rounded-lg text-sm font-semibold">Imprimir</button>
      </div>

      <Card title="Mayor del período">
        <div className="flex space-x-2 mb-4 no-print">
          <select className="border rounded-lg px-3 py-1.5 text-sm" value={period} onChange={(e) => setPeriod(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
          <input type="number" className="border rounded-lg px-3 py-1.5 text-sm w-24" value={year} onChange={(e) => setYear(+e.target.value)} />
        </div>
        {analytical.data?.accounts?.length ? (
          <table className="w-full">
            <thead><tr>
              <th className={thCls}>Cuenta</th>
              <th className={thCls + ' text-right'}>Saldo anterior</th>
              <th className={thCls + ' text-right'}>Debe</th>
              <th className={thCls + ' text-right'}>Haber</th>
              <th className={thCls + ' text-right'}>Saldo actual</th>
            </tr></thead>
            <tbody>
              {analytical.data.accounts.map((a: any) => (
                <Fragment key={a.account_id}>
                  <tr className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpanded(expanded === a.account_id ? null : a.account_id)}>
                    <td className={tdCls}>
                      <span className="font-mono text-xs">{a.code}</span> {a.name}
                      <span className="ml-2 text-[10px] text-slate-400">{expanded === a.account_id ? '▾' : '▸'}</span>
                    </td>
                    <td className={tdCls + ' text-right font-mono'}>{a.opening_ves ? fmtVes(a.opening_ves) : ''}</td>
                    <td className={tdCls + ' text-right font-mono'}>{a.movement_debit_ves ? fmtVes(a.movement_debit_ves) : ''}</td>
                    <td className={tdCls + ' text-right font-mono'}>{a.movement_credit_ves ? fmtVes(a.movement_credit_ves) : ''}</td>
                    <td className={tdCls + ' text-right font-mono font-semibold'}>{fmtVes(a.closing_ves)}</td>
                  </tr>
                  {expanded === a.account_id && (
                    <tr>
                      <td colSpan={5} className={tdCls + ' bg-slate-50 p-0'}>
                        {a.movements.length ? (
                          <table className="w-full">
                            <thead><tr>
                              <th className={thCls + ' text-xs'}>Fecha</th>
                              <th className={thCls + ' text-xs'}>Comp.</th>
                              <th className={thCls + ' text-xs'}>Concepto</th>
                              <th className={thCls + ' text-xs text-right'}>Debe</th>
                              <th className={thCls + ' text-xs text-right'}>Haber</th>
                              <th className={thCls + ' text-xs text-right'}>Saldo</th>
                            </tr></thead>
                            <tbody>
                              {a.movements.map((m: any, i: number) => (
                                <tr key={i}>
                                  <td className={tdCls + ' text-xs'}>{m.entry_date}</td>
                                  <td className={tdCls + ' font-mono text-xs'}>{m.entry_number}</td>
                                  <td className={tdCls + ' text-xs'}>{m.concept}</td>
                                  <td className={tdCls + ' text-right font-mono text-xs'}>{m.debit_ves ? fmtVes(m.debit_ves) : ''}</td>
                                  <td className={tdCls + ' text-right font-mono text-xs'}>{m.credit_ves ? fmtVes(m.credit_ves) : ''}</td>
                                  <td className={tdCls + ' text-right font-mono text-xs font-semibold'}>{fmtVes(m.saldo_ves)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-xs text-slate-400 px-4 py-2">Sin movimientos en el período (solo saldo anterior).</p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              <tr className="font-bold bg-slate-50">
                <td className={tdCls}>Totales del período</td>
                <td className={tdCls}></td>
                <td className={tdCls + ' text-right font-mono'}>{fmtVes(analytical.data.totals.movement_debit_ves)}</td>
                <td className={tdCls + ' text-right font-mono'}>{fmtVes(analytical.data.totals.movement_credit_ves)}</td>
                <td className={tdCls}></td>
              </tr>
            </tbody>
          </table>
        ) : <EmptyState>Sin cuentas con actividad en el período.</EmptyState>}
      </Card>

      <Card title="Consulta por cuenta individual">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-slate-600">Cuenta</span>
            <select className={inputCls + ' mt-1'} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">— Seleccione —</option>
              {(chart.data ?? []).filter((a: any) => a.is_selectable).map((a: any) => (
                <option key={a.account_id} value={a.account_id}>{a.code} · {a.name}</option>
              ))}
            </select>
          </label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Desde</span><input type="date" className={inputCls + ' mt-1'} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Hasta</span><input type="date" className={inputCls + ' mt-1'} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
      </Card>

      {ledger.data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Saldo inicial</p><p className="text-lg font-bold font-mono">{fmtVes(ledger.data.opening_balance_ves)}</p></div>
            <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Saldo final</p><p className="text-lg font-bold font-mono text-blue-700">{fmtVes(ledger.data.closing_balance_ves)}</p></div>
            <div className="bg-white border rounded-xl p-4"><p className="text-xs text-slate-500">Naturaleza</p><p className="text-lg font-bold">{ledger.data.account.nature}</p></div>
          </div>
          <Card title={`${ledger.data.account.code} · ${ledger.data.account.name}`}>
            {ledger.data.movements.length ? (
              <table className="w-full">
                <thead><tr>
                  <th className={thCls}>Fecha</th><th className={thCls}>Comp.</th><th className={thCls}>Concepto</th>
                  <th className={thCls + ' text-right'}>Debe</th><th className={thCls + ' text-right'}>Haber</th><th className={thCls + ' text-right'}>Saldo</th>
                </tr></thead>
                <tbody>
                  {ledger.data.movements.map((m: any, i: number) => (
                    <tr key={i}>
                      <td className={tdCls}>{m.entry_date}</td>
                      <td className={tdCls + ' font-mono'}>{m.entry_number}</td>
                      <td className={tdCls}>{m.description || m.concept}</td>
                      <td className={tdCls + ' text-right font-mono'}>{m.debit_ves ? fmtVes(m.debit_ves) : ''}</td>
                      <td className={tdCls + ' text-right font-mono'}>{m.credit_ves ? fmtVes(m.credit_ves) : ''}</td>
                      <td className={tdCls + ' text-right font-mono font-semibold'}>{fmtVes(m.saldo_ves)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState>Sin movimientos en el rango.</EmptyState>}
          </Card>
        </>
      )}
    </div>
  );
}
