import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { fmtVes } from '../lib/format';
import { Card, EmptyState, inputCls, tdCls, thCls } from '../components/ui';

export default function LedgerPage() {
  const { tenant } = useAuth();
  const [accountId, setAccountId] = useState('');
  const now = new Date();
  const [from, setFrom] = useState(`${now.getFullYear()}-01-01`);
  const [to, setTo] = useState(now.toISOString().substring(0, 10));

  const chart = useQuery({
    queryKey: ['chart', tenant?.tenant_id],
    queryFn: () => api.get('/chart-of-accounts').then((r) => r.data),
    enabled: !!tenant,
  });
  const ledger = useQuery({
    queryKey: ['ledger', tenant?.tenant_id, accountId, from, to],
    queryFn: () => api.get(`/reports/ledger?account_id=${accountId}&from=${from}&to=${to}`).then((r) => r.data),
    enabled: !!tenant && !!accountId,
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold">Libro Mayor</h1>
      <Card>
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
