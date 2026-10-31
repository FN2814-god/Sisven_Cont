import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { fmtVes, fmtUsd } from '../lib/format';
import { Card, EmptyState, tdCls, thCls } from '../components/ui';

export default function JournalPage() {
  const { tenant } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [period, setPeriod] = useState(now.getMonth() + 1);
  const [showUsd, setShowUsd] = useState(false);

  const book = useQuery({
    queryKey: ['journal-book', tenant?.tenant_id, year, period],
    queryFn: () => api.get(`/reports/journal-book?year=${year}&period=${period}`).then((r) => r.data),
    enabled: !!tenant,
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Libro Diario Legal</h1>
          <p className="text-sm text-slate-500">
            Asientos cronológicos en partida doble{showUsd ? ' · vista bimoneda' : ' · bolívares'}
          </p>
        </div>
        <div className="flex space-x-2 items-center">
          <div className="no-print flex rounded-lg overflow-hidden border border-slate-300 text-sm font-semibold">
            <button onClick={() => setShowUsd(false)}
              className={`px-3 py-1.5 ${!showUsd ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
              Bs.
            </button>
            <button onClick={() => setShowUsd(true)}
              className={`px-3 py-1.5 ${showUsd ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
              Bimoneda
            </button>
          </div>
          <select className="border rounded-lg px-3 py-1.5 text-sm" value={period} onChange={(e) => setPeriod(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
          <input type="number" className="border rounded-lg px-3 py-1.5 text-sm w-24" value={year} onChange={(e) => setYear(+e.target.value)} />
          <button onClick={() => window.print()} className="no-print px-3 py-1.5 bg-slate-100 rounded-lg text-sm font-semibold">Imprimir</button>
        </div>
      </div>

      {book.data?.entries?.length ? (
        <div className="space-y-4">
          {book.data.entries.map((e: any) => (
            <Card key={e.entry_id}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-bold">
                    Comprobante N° {e.entry_number} · {e.entry_date}
                    <span className="ml-2 text-[10px] bg-slate-100 px-2 py-0.5 rounded-full uppercase">{e.source_module}</span>
                  </p>
                  <p className="text-xs text-slate-500">{e.concept}</p>
                </div>
                <p className="text-xs text-slate-400">Tasa BCV: {e.bcv_exchange_rate}</p>
              </div>
              <table className="w-full">
                <thead><tr>
                  <th className={thCls}>Cuenta</th><th className={thCls}>Descripción</th>
                  <th className={thCls + ' text-right'}>Debe Bs.</th><th className={thCls + ' text-right'}>Haber Bs.</th>
                  {showUsd && (
                    <>
                      <th className={thCls + ' text-right'}>Debe $</th><th className={thCls + ' text-right'}>Haber $</th>
                    </>
                  )}
                </tr></thead>
                <tbody>
                  {e.lines.map((l: any) => (
                    <tr key={l.line_id}>
                      <td className={tdCls + ' font-mono text-xs'}>{l.account_code}<br /><span className="text-slate-500">{l.account_name}</span></td>
                      <td className={tdCls + ' text-xs'}>{l.description}</td>
                      <td className={tdCls + ' text-right font-mono'}>{l.debit_ves ? fmtVes(l.debit_ves) : ''}</td>
                      <td className={tdCls + ' text-right font-mono'}>{l.credit_ves ? fmtVes(l.credit_ves) : ''}</td>
                      {showUsd && (
                        <>
                          <td className={tdCls + ' text-right font-mono text-slate-500'}>{l.debit_usd ? fmtUsd(l.debit_usd) : ''}</td>
                          <td className={tdCls + ' text-right font-mono text-slate-500'}>{l.credit_usd ? fmtUsd(l.credit_usd) : ''}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="font-bold bg-slate-50">
                    <td className={tdCls} colSpan={2}>Totales</td>
                    <td className={tdCls + ' text-right font-mono'}>{fmtVes(e.total_debit_ves)}</td>
                    <td className={tdCls + ' text-right font-mono'}>{fmtVes(e.total_credit_ves)}</td>
                    {showUsd && (
                      <>
                        <td className={tdCls + ' text-right font-mono'}>{fmtUsd(e.total_debit_usd)}</td>
                        <td className={tdCls + ' text-right font-mono'}>{fmtUsd(e.total_credit_usd)}</td>
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      ) : <EmptyState>Sin asientos en el período seleccionado.</EmptyState>}
    </div>
  );
}
