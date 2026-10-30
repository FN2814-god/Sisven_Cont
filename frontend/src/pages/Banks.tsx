import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { fmtVes } from '../lib/format';
import {
  btnPrimary, btnSecondary, Card, EmptyState, ErrorBox, Field, inputCls, tdCls, thCls,
} from '../components/ui';

const STATUS_STYLE: Record<string, string> = {
  PENDIENTE: 'bg-slate-100 text-slate-600',
  CONCILIADO: 'bg-emerald-100 text-emerald-700',
  DISCREPANCIA: 'bg-amber-100 text-amber-700',
  IDENTIFICACION_REQUERIDA: 'bg-red-100 text-red-700',
};

export default function BanksPage() {
  const { tenant, user } = useAuth();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'extracto' | 'movimientos'>('extracto');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const canEdit = user?.role !== 'CONSULTA';

  const [stmtForm, setStmtForm] = useState({ transaction_date: '', reference_number: '', description: '', movement_type: 'CREDITO' as const, amount: '', bank_account_id: '' });
  const [movForm, setMovForm] = useState({ movement_date: '', reference_number: '', concept: '', movement_type: 'DEBITO' as const, amount: '', sales_invoice_number: '', bank_account_id: '' });
  const [accForm, setAccForm] = useState({ bank_name: '', account_number: '', currency: 'VES', description: '' });
  const [bcvRate, setBcvRate] = useState('');

  const accounts = useQuery({
    queryKey: ['bank-accounts', tenant?.tenant_id],
    queryFn: () => api.get('/banks/accounts').then((r) => r.data),
    enabled: !!tenant,
  });
  const statements = useQuery({
    queryKey: ['bank-statements', tenant?.tenant_id],
    queryFn: () => api.get('/banks/statements').then((r) => r.data),
    enabled: !!tenant,
  });
  const movements = useQuery({
    queryKey: ['bank-movements', tenant?.tenant_id],
    queryFn: () => api.get('/banks/movements').then((r) => r.data),
    enabled: !!tenant,
  });
  const rateQ = useQuery({ queryKey: ['bcv-rate'], queryFn: () => api.get('/bcv/rate').then((r) => r.data), retry: 0 });
  if (!bcvRate && rateQ.data?.rate) setBcvRate(String(rateQ.data.rate));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['bank-statements'] });
    qc.invalidateQueries({ queryKey: ['bank-movements'] });
    qc.invalidateQueries({ queryKey: ['stats'] });
  };

  const addStmt = useMutation({
    mutationFn: () => api.post('/banks/statements', { ...stmtForm, amount: parseFloat(stmtForm.amount), bank_account_id: stmtForm.bank_account_id || undefined }),
    onSuccess: () => { setStmtForm({ transaction_date: '', reference_number: '', description: '', movement_type: 'CREDITO', amount: '', bank_account_id: '' }); invalidate(); },
    onError: (e) => setError(apiError(e)),
  });
  const addMov = useMutation({
    mutationFn: () => api.post('/banks/movements', { ...movForm, amount: parseFloat(movForm.amount), bank_account_id: movForm.bank_account_id || undefined, sales_invoice_number: movForm.sales_invoice_number || undefined }),
    onSuccess: () => { setMovForm({ movement_date: '', reference_number: '', concept: '', movement_type: 'DEBITO', amount: '', sales_invoice_number: '', bank_account_id: '' }); invalidate(); },
    onError: (e) => setError(apiError(e)),
  });
  const addAcc = useMutation({
    mutationFn: () => api.post('/banks/accounts', accForm),
    onSuccess: () => { setAccForm({ bank_name: '', account_number: '', currency: 'VES', description: '' }); qc.invalidateQueries({ queryKey: ['bank-accounts'] }); },
    onError: (e) => setError(apiError(e)),
  });
  const reconcile = useMutation({
    mutationFn: () => api.post('/banks/reconcile', { bcv_rate: parseFloat(bcvRate) || undefined }).then((r) => r.data),
    onSuccess: (d) => { setResult(d); invalidate(); },
    onError: (e) => setError(apiError(e)),
  });
  const manualMatch = useMutation({
    mutationFn: ({ stmtId, movId }: { stmtId: string; movId: string }) =>
      api.post(`/banks/statements/${stmtId}/match/${movId}`),
    onSuccess: () => { setMatchId(null); invalidate(); },
    onError: (e) => setError(apiError(e)),
  });

  const pendingMovs = (movements.data ?? []).filter((m: any) => m.status === 'PENDIENTE');

  const accSelect = (value: string, onChange: (v: string) => void) => (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Sin cuenta asignada</option>
      {(accounts.data ?? []).map((a: any) => <option key={a.account_id} value={a.account_id}>{a.bank_name} ···{a.account_number.slice(-4)} ({a.currency})</option>)}
    </select>
  );

  const AccountForm = (
    <Card title="Cuentas bancarias">
      <div className="space-y-3">
        {(accounts.data ?? []).map((a: any) => (
          <div key={a.account_id} className="flex justify-between items-center border-b pb-2 text-sm">
            <span><b>{a.bank_name}</b> · {a.account_number}</span>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-bold">{a.currency}</span>
          </div>
        ))}
        {canEdit && (
          <form onSubmit={(e) => { e.preventDefault(); addAcc.mutate(); }} className="grid grid-cols-4 gap-2 items-end pt-2">
            <input className={inputCls} placeholder="Banco" value={accForm.bank_name} required onChange={(e) => setAccForm({ ...accForm, bank_name: e.target.value })} />
            <input className={inputCls} placeholder="N° cuenta" value={accForm.account_number} required onChange={(e) => setAccForm({ ...accForm, account_number: e.target.value })} />
            <select className={inputCls} value={accForm.currency} onChange={(e) => setAccForm({ ...accForm, currency: e.target.value })}>
              <option>VES</option><option>USD</option>
            </select>
            <button className={btnPrimary}>Agregar</button>
          </form>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conciliación Bancaria</h1>
          <p className="text-sm text-slate-500">Motor de 4 fases: exacta · temporal · cruce fiscal · gastos automáticos</p>
        </div>
        <div className="flex space-x-2 items-center">
          <input className="border rounded-lg px-3 py-1.5 text-sm w-28" placeholder="Tasa BCV" value={bcvRate} onChange={(e) => setBcvRate(e.target.value)} />
          {canEdit && (
            <button className={btnPrimary} onClick={() => reconcile.mutate()} disabled={reconcile.isPending}>
              {reconcile.isPending ? 'Conciliando…' : 'Ejecutar conciliación'}
            </button>
          )}
        </div>
      </div>

      <ErrorBox message={error} />

      {result && (
        <Card title="Resultado de la conciliación">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 text-center">
            {[
              ['Fase 1 · Exactas', result.summary?.phase1ExactMatches],
              ['Fase 2 · Temporales', result.summary?.phase2TemporalMatches],
              ['Extracto sin cuadrar', result.summary?.unmatchedStatements],
              ['Libro sin cuadrar', result.summary?.unmatchedInternalMovements],
              ['Alertas fiscales', result.summary?.fiscalAlertsCount],
              ['Gastos detectados', result.summary?.autoDetectedExpensesCount],
            ].map(([label, v]) => (
              <div key={label as string} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xl font-bold">{String(v ?? 0)}</p>
                <p className="text-[10px] uppercase text-slate-500 font-semibold">{label}</p>
              </div>
            ))}
          </div>
          {result.fiscal_cross_checks?.some((c: any) => !c.isMatched) && (
            <div className="mt-4 space-y-1">
              {result.fiscal_cross_checks.filter((c: any) => !c.isMatched).map((c: any, i: number) => (
                <p key={i} className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-1.5">{c.message}</p>
              ))}
            </div>
          )}
          {result.auto_detected_expenses?.length > 0 && (
            <table className="w-full mt-4">
              <thead><tr><th className={thCls}>Fecha</th><th className={thCls}>Descripción</th><th className={thCls}>Tipo</th><th className={thCls + ' text-right'}>Monto</th></tr></thead>
              <tbody>
                {result.auto_detected_expenses.map((e: any, i: number) => (
                  <tr key={i}>
                    <td className={tdCls}>{e.date}</td>
                    <td className={tdCls}>{e.description}</td>
                    <td className={tdCls}><span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{e.type}</span></td>
                    <td className={tdCls + ' text-right font-mono'}>{fmtVes(e.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {AccountForm}

      <div className="flex space-x-2">
        <button className={tab === 'extracto' ? btnPrimary : btnSecondary} onClick={() => setTab('extracto')}>Extracto bancario</button>
        <button className={tab === 'movimientos' ? btnPrimary : btnSecondary} onClick={() => setTab('movimientos')}>Libro interno</button>
      </div>

      {tab === 'extracto' && (
        <Card title="Partidas del extracto bancario">
          {canEdit && (
            <form onSubmit={(e) => { e.preventDefault(); addStmt.mutate(); }} className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-4">
              <Field label="Fecha"><input type="date" className={inputCls} value={stmtForm.transaction_date} required onChange={(e) => setStmtForm({ ...stmtForm, transaction_date: e.target.value })} /></Field>
              <Field label="Referencia"><input className={inputCls} value={stmtForm.reference_number} required onChange={(e) => setStmtForm({ ...stmtForm, reference_number: e.target.value })} /></Field>
              <Field label="Descripción"><input className={inputCls} value={stmtForm.description} required onChange={(e) => setStmtForm({ ...stmtForm, description: e.target.value })} /></Field>
              <Field label="Tipo">
                <select className={inputCls} value={stmtForm.movement_type} onChange={(e) => setStmtForm({ ...stmtForm, movement_type: e.target.value as any })}>
                  <option value="CREDITO">Abono</option><option value="DEBITO">Cargo</option>
                </select>
              </Field>
              <Field label="Monto"><input type="number" step="0.01" className={inputCls} value={stmtForm.amount} required onChange={(e) => setStmtForm({ ...stmtForm, amount: e.target.value })} /></Field>
              <div className="flex items-end"><button className={btnPrimary}>Añadir</button></div>
            </form>
          )}
          {statements.data?.length ? (
            <table className="w-full">
              <thead><tr>
                <th className={thCls}>Fecha</th><th className={thCls}>Referencia</th><th className={thCls}>Descripción</th>
                <th className={thCls}>Tipo</th><th className={thCls + ' text-right'}>Monto</th><th className={thCls}>Estado</th><th className={thCls}></th>
              </tr></thead>
              <tbody>
                {statements.data.map((s: any) => (
                  <tr key={s.statement_id}>
                    <td className={tdCls}>{s.transaction_date}</td>
                    <td className={tdCls + ' font-mono'}>{s.reference_number}</td>
                    <td className={tdCls}>{s.description}</td>
                    <td className={tdCls}>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.movement_type === 'CREDITO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {s.movement_type === 'CREDITO' ? 'ABONO' : 'CARGO'}
                      </span>
                    </td>
                    <td className={tdCls + ' text-right font-mono'}>{fmtVes(s.amount)}</td>
                    <td className={tdCls}>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[s.status] ?? 'bg-slate-100'}`}>{s.status}</span>
                      {s.reconciliation_type && <span className="ml-1 text-[9px] text-slate-400">{s.reconciliation_type}</span>}
                    </td>
                    <td className={tdCls + ' text-right'}>
                      {canEdit && s.status === 'PENDIENTE' && (
                        matchId === s.statement_id ? (
                          <div className="flex space-x-1 items-center">
                            <select className={inputCls + ' text-xs'} onChange={(e) => e.target.value && manualMatch.mutate({ stmtId: s.statement_id, movId: e.target.value })}>
                              <option value="">Cuadrar con…</option>
                              {pendingMovs.map((m: any) => <option key={m.movement_id} value={m.movement_id}>{m.reference_number} · {fmtVes(m.amount)}</option>)}
                            </select>
                            <button className="text-xs text-slate-400" onClick={() => setMatchId(null)}>✕</button>
                          </div>
                        ) : (
                          <button className="text-xs text-blue-600 font-semibold" onClick={() => setMatchId(s.statement_id)}>Cuadrar manual</button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState>Sin partidas de extracto.</EmptyState>}
        </Card>
      )}

      {tab === 'movimientos' && (
        <Card title="Libro interno de banco">
          {canEdit && (
            <form onSubmit={(e) => { e.preventDefault(); addMov.mutate(); }} className="grid grid-cols-2 sm:grid-cols-7 gap-2 mb-4">
              <Field label="Fecha"><input type="date" className={inputCls} value={movForm.movement_date} required onChange={(e) => setMovForm({ ...movForm, movement_date: e.target.value })} /></Field>
              <Field label="Referencia"><input className={inputCls} value={movForm.reference_number} required onChange={(e) => setMovForm({ ...movForm, reference_number: e.target.value })} /></Field>
              <Field label="Concepto"><input className={inputCls} value={movForm.concept} required onChange={(e) => setMovForm({ ...movForm, concept: e.target.value })} /></Field>
              <Field label="Tipo">
                <select className={inputCls} value={movForm.movement_type} onChange={(e) => setMovForm({ ...movForm, movement_type: e.target.value as any })}>
                  <option value="DEBITO">Cargo</option><option value="CREDITO">Abono</option>
                </select>
              </Field>
              <Field label="Monto"><input type="number" step="0.01" className={inputCls} value={movForm.amount} required onChange={(e) => setMovForm({ ...movForm, amount: e.target.value })} /></Field>
              <Field label="N° Factura"><input className={inputCls} value={movForm.sales_invoice_number} onChange={(e) => setMovForm({ ...movForm, sales_invoice_number: e.target.value })} /></Field>
              <div className="flex items-end"><button className={btnPrimary}>Añadir</button></div>
            </form>
          )}
          {movements.data?.length ? (
            <table className="w-full">
              <thead><tr>
                <th className={thCls}>Fecha</th><th className={thCls}>Referencia</th><th className={thCls}>Concepto</th>
                <th className={thCls}>Factura</th><th className={thCls}>Tipo</th><th className={thCls + ' text-right'}>Monto</th><th className={thCls}>Estado</th>
              </tr></thead>
              <tbody>
                {movements.data.map((m: any) => (
                  <tr key={m.movement_id}>
                    <td className={tdCls}>{m.movement_date}</td>
                    <td className={tdCls + ' font-mono'}>{m.reference_number}</td>
                    <td className={tdCls}>{m.concept}</td>
                    <td className={tdCls + ' font-mono text-xs'}>{m.sales_invoice_number ?? '—'}</td>
                    <td className={tdCls}>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.movement_type === 'CREDITO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {m.movement_type === 'CREDITO' ? 'ABONO' : 'CARGO'}
                      </span>
                    </td>
                    <td className={tdCls + ' text-right font-mono'}>{fmtVes(m.amount)}</td>
                    <td className={tdCls}><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[m.status] ?? 'bg-slate-100'}`}>{m.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState>Sin movimientos internos.</EmptyState>}
        </Card>
      )}
    </div>
  );
}
