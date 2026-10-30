import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { fmtVes } from '../lib/format';
import {
  btnPrimary, btnSecondary, Card, EmptyState, ErrorBox, inputCls, tdCls, thCls,
} from '../components/ui';

interface Line { account_id: string; description: string; debit_ves: string; credit_ves: string; third_party_rif: string }
const emptyLine = (): Line => ({ account_id: '', description: '', debit_ves: '', credit_ves: '', third_party_rif: '' });

export default function NewEntryPage() {
  const { tenant } = useAuth();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [concept, setConcept] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [rate, setRate] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);

  const chart = useQuery({
    queryKey: ['chart', tenant?.tenant_id],
    queryFn: () => api.get('/chart-of-accounts').then((r) => r.data),
    enabled: !!tenant,
  });
  const entries = useQuery({
    queryKey: ['entries', tenant?.tenant_id],
    queryFn: () => api.get('/journal-entries').then((r) => r.data),
    enabled: !!tenant,
  });
  const rateQ = useQuery({ queryKey: ['bcv-rate'], queryFn: () => api.get('/bcv/rate').then((r) => r.data), retry: 0 });
  if (!rate && rateQ.data?.rate) setRate(String(rateQ.data.rate));

  const save = useMutation({
    mutationFn: (payload: any) => api.post('/journal-entries', payload).then((r) => r.data),
    onSuccess: () => {
      setOk('Comprobante asentado correctamente.');
      setError(null);
      setLines([emptyLine(), emptyLine()]);
      setConcept('');
      qc.invalidateQueries({ queryKey: ['entries'] });
    },
    onError: (e) => { setError(apiError(e)); setOk(null); },
  });

  const accounts = (chart.data ?? []).filter((a: any) => a.is_selectable);
  const sumD = lines.reduce((s, l) => s + (parseFloat(l.debit_ves) || 0), 0);
  const sumC = lines.reduce((s, l) => s + (parseFloat(l.credit_ves) || 0), 0);
  const balanced = Math.abs(sumD - sumC) < 0.005 && sumD > 0;

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!balanced) return setError('El comprobante no cuadra: Débitos ≠ Créditos');
    save.mutate({
      entry_date: date,
      concept,
      bcv_exchange_rate: parseFloat(rate) || 0,
      lines: lines.map((l) => ({
        account_id: l.account_id,
        description: l.description || undefined,
        debit_ves: parseFloat(l.debit_ves) || 0,
        credit_ves: parseFloat(l.credit_ves) || 0,
        third_party_rif: l.third_party_rif || undefined,
      })),
    });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold">Asientos Contables Manuales</h1>
      <Card title="Nuevo comprobante (partida doble bimoneda)">
        <form onSubmit={submit} className="space-y-4">
          <ErrorBox message={error} />
          {ok && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-2">{ok}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Fecha</span>
              <input type="date" className={inputCls + ' mt-1'} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-slate-600">Concepto</span>
              <input className={inputCls + ' mt-1'} value={concept} required onChange={(e) => setConcept(e.target.value)} />
            </label>
          </div>
          <label className="block max-w-xs">
            <span className="text-xs font-semibold text-slate-600">Tasa BCV (para columna USD)</span>
            <input type="number" step="0.0001" className={inputCls + ' mt-1'} value={rate} required onChange={(e) => setRate(e.target.value)} />
          </label>

          <table className="w-full">
            <thead><tr>
              <th className={thCls}>Cuenta</th><th className={thCls}>Descripción</th><th className={thCls}>RIF tercero</th>
              <th className={thCls + ' text-right'}>Debe (Bs.)</th><th className={thCls + ' text-right'}>Haber (Bs.)</th><th className={thCls}></th>
            </tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className={tdCls}>
                    <select className={inputCls} value={l.account_id} required onChange={(e) => setLine(i, { account_id: e.target.value })}>
                      <option value="">— Seleccione —</option>
                      {accounts.map((a: any) => <option key={a.account_id} value={a.account_id}>{a.code} · {a.name}</option>)}
                    </select>
                  </td>
                  <td className={tdCls}><input className={inputCls} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} /></td>
                  <td className={tdCls}><input className={inputCls} value={l.third_party_rif} onChange={(e) => setLine(i, { third_party_rif: e.target.value })} placeholder="J-…" /></td>
                  <td className={tdCls}><input type="number" step="0.01" className={inputCls + ' text-right'} value={l.debit_ves} onChange={(e) => setLine(i, { debit_ves: e.target.value })} /></td>
                  <td className={tdCls}><input type="number" step="0.01" className={inputCls + ' text-right'} value={l.credit_ves} onChange={(e) => setLine(i, { credit_ves: e.target.value })} /></td>
                  <td className={tdCls}>
                    {lines.length > 2 && <button type="button" className="text-red-500 text-xs font-bold" onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between">
            <button type="button" className={btnSecondary} onClick={() => setLines([...lines, emptyLine()])}>+ Agregar línea</button>
            <div className={`px-4 py-2 rounded-lg text-sm font-bold ${balanced ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              Debe {fmtVes(sumD)} · Haber {fmtVes(sumC)} {balanced ? '· CUADRADO' : '· DESCUADRADO'}
            </div>
          </div>
          <button className={btnPrimary} disabled={save.isPending || !balanced}>Asentar comprobante</button>
        </form>
      </Card>

      <Card title="Últimos comprobantes">
        {entries.data?.length ? (
          <table className="w-full">
            <thead><tr>
              <th className={thCls}>N°</th><th className={thCls}>Fecha</th><th className={thCls}>Concepto</th>
              <th className={thCls}>Origen</th><th className={thCls}>Estado</th><th className={thCls + ' text-right'}>Total Bs.</th>
            </tr></thead>
            <tbody>
              {entries.data.slice(0, 20).map((e: any) => (
                <tr key={e.entry_id} className={e.status === 'ANULADO' ? 'opacity-50 line-through' : ''}>
                  <td className={tdCls + ' font-mono'}>{e.entry_number}</td>
                  <td className={tdCls}>{e.entry_date}</td>
                  <td className={tdCls}>{e.concept}</td>
                  <td className={tdCls}><span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold">{e.source_module}</span></td>
                  <td className={tdCls}><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${e.status === 'ASENTADO' ? 'bg-emerald-100 text-emerald-700' : e.status === 'ANULADO' ? 'bg-red-100 text-red-700' : 'bg-slate-100'}`}>{e.status}</span></td>
                  <td className={tdCls + ' text-right font-mono'}>{fmtVes(e.total_debit_ves)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState>Sin comprobantes.</EmptyState>}
      </Card>
    </div>
  );
}
