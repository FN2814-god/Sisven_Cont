import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { fmtVes } from '../lib/format';
import { Card, EmptyState, tdCls, thCls } from '../components/ui';

export default function TrialBalancePage() {
  const { tenant } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [period, setPeriod] = useState(now.getMonth() + 1);

  const tb = useQuery({
    queryKey: ['trial-balance', tenant?.tenant_id, year, period],
    queryFn: () => api.get(`/reports/trial-balance?year=${year}&period=${period}`).then((r) => r.data),
    enabled: !!tenant,
  });

  const t = tb.data?.totals;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Balance de Comprobación</h1>
          <p className="text-sm text-slate-500">Saldos y movimientos por cuenta — cuadre de partida doble</p>
        </div>
        <div className="flex space-x-2">
          <select className="border rounded-lg px-3 py-1.5 text-sm" value={period} onChange={(e) => setPeriod(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
          <input type="number" className="border rounded-lg px-3 py-1.5 text-sm w-24" value={year} onChange={(e) => setYear(+e.target.value)} />
        </div>
      </div>
      <Card>
        {tb.data?.accounts?.length ? (
          <table className="w-full">
            <thead><tr>
              <th className={thCls}>Cuenta</th>
              <th className={thCls + ' text-right'}>Saldo Deudor Ant.</th><th className={thCls + ' text-right'}>Saldo Acreedor Ant.</th>
              <th className={thCls + ' text-right'}>Debe</th><th className={thCls + ' text-right'}>Haber</th>
              <th className={thCls + ' text-right'}>Saldo Deudor</th><th className={thCls + ' text-right'}>Saldo Acreedor</th>
            </tr></thead>
            <tbody>
              {tb.data.accounts.map((r: any) => (
                <tr key={r.account_id}>
                  <td className={tdCls}><span className="font-mono text-xs">{r.code}</span> {r.name}</td>
                  <td className={tdCls + ' text-right font-mono'}>{r.opening_debit_ves ? fmtVes(r.opening_debit_ves) : ''}</td>
                  <td className={tdCls + ' text-right font-mono'}>{r.opening_credit_ves ? fmtVes(r.opening_credit_ves) : ''}</td>
                  <td className={tdCls + ' text-right font-mono'}>{fmtVes(r.movement_debit_ves)}</td>
                  <td className={tdCls + ' text-right font-mono'}>{fmtVes(r.movement_credit_ves)}</td>
                  <td className={tdCls + ' text-right font-mono'}>{r.closing_debit_ves ? fmtVes(r.closing_debit_ves) : ''}</td>
                  <td className={tdCls + ' text-right font-mono'}>{r.closing_credit_ves ? fmtVes(r.closing_credit_ves) : ''}</td>
                </tr>
              ))}
              <tr className="font-bold bg-slate-50">
                <td className={tdCls}>Totales</td>
                <td className={tdCls + ' text-right font-mono'}>{fmtVes(t.opening_debit_ves)}</td>
                <td className={tdCls + ' text-right font-mono'}>{fmtVes(t.opening_credit_ves)}</td>
                <td className={tdCls + ' text-right font-mono'}>{fmtVes(t.movement_debit_ves)}</td>
                <td className={tdCls + ' text-right font-mono'}>{fmtVes(t.movement_credit_ves)}</td>
                <td className={tdCls + ' text-right font-mono'}>{fmtVes(t.closing_debit_ves)}</td>
                <td className={tdCls + ' text-right font-mono'}>{fmtVes(t.closing_credit_ves)}</td>
              </tr>
            </tbody>
          </table>
        ) : <EmptyState>Sin movimientos en el período.</EmptyState>}
      </Card>
    </div>
  );
}
