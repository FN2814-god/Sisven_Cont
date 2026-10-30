import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { isValidRif, fmtVes } from '../lib/format';
import {
  btnPrimary, Card, EmptyState, ErrorBox, Field, inputCls, tdCls, thCls,
} from '../components/ui';

const ISLR_CONCEPTS = [
  { code: '001', label: '001 · Honorarios Prof. PN Residente (3% + sustraendo)' },
  { code: '002', label: '002 · Honorarios Prof. PJ Domiciliada (5%)' },
  { code: '018', label: '018 · Comisiones Mercantiles PN (3% + sustraendo)' },
  { code: '020', label: '020 · Comisiones Mercantiles PJ (5%)' },
  { code: '055', label: '055 · Servicios PN Residente (1% + sustraendo)' },
  { code: '057', label: '057 · Servicios PJ Domiciliada (2%)' },
];

export default function PurchasesPage() {
  const { tenant, user } = useAuth();
  const canEdit = user?.role !== 'CONSULTA';
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState({
    fecha_factura: new Date().toISOString().substring(0, 10),
    rif_proveedor: '', nombre_proveedor: '', numero_factura: '', numero_control: '',
    expense_account_code: '6.1.03.01.01.000',
    amounts_in: 'VES' as 'USD' | 'VES',
    base_imponible: '', compras_exentas: '0',
    porcentaje_retencion_iva: tenant?.porcentaje_retencion_iva ?? 75,
    islr_concepto_codigo: '057',
    islr_beneficiary_type: 'PJ_DOM',
    valor_ut: '',
    bcv_exchange_rate: '',
  });

  const purchases = useQuery({
    queryKey: ['purchases', tenant?.tenant_id],
    queryFn: () => api.get('/purchases').then((r) => r.data),
    enabled: !!tenant,
  });
  const chart = useQuery({
    queryKey: ['chart', tenant?.tenant_id],
    queryFn: () => api.get('/chart-of-accounts').then((r) => r.data),
    enabled: !!tenant,
  });
  const rateQ = useQuery({
    queryKey: ['bcv-rate'],
    queryFn: () => api.get('/bcv/rate').then((r) => r.data),
    retry: 0,
  });
  if (!form.bcv_exchange_rate && rateQ.data?.rate) {
    setForm((f) => ({ ...f, bcv_exchange_rate: String(rateQ.data.rate) }));
  }

  const save = useMutation({
    mutationFn: (payload: any) => api.post('/purchases', payload).then((r) => r.data),
    onSuccess: (d) => {
      setOk(`Compra registrada. IVA retenido: ${fmtVes(d.iva_retenido)} · ISLR: ${fmtVes(d.islr_retenido)}${d.comprobante_iva ? ` · Comprobante ${d.comprobante_iva}` : ''}`);
      setError(null);
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (e) => { setError(apiError(e)); setOk(null); },
  });

  const rate = parseFloat(form.bcv_exchange_rate) || 0;
  const baseIn = parseFloat(form.base_imponible) || 0;
  const baseVes = form.amounts_in === 'USD' ? baseIn * rate : baseIn;
  const ivaVes = baseVes * 0.16;
  const ivaRetVes = tenant?.es_contribuyente_especial ? ivaVes * (form.porcentaje_retencion_iva / 100) : 0;
  const islrRetVes = form.islr_concepto_codigo === '057' ? baseVes * 0.02
    : form.islr_concepto_codigo === '002' || form.islr_concepto_codigo === '020' ? baseVes * 0.05
    : form.islr_concepto_codigo === '001' || form.islr_concepto_codigo === '018' ? baseVes * 0.03
    : baseVes * 0.01;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidRif(form.rif_proveedor)) return setError('RIF del proveedor inválido');
    save.mutate({
      ...form,
      base_imponible: parseFloat(form.base_imponible) || 0,
      compras_exentas: parseFloat(form.compras_exentas) || 0,
      valor_ut: parseFloat(form.valor_ut) || 0,
      bcv_exchange_rate: rate,
      islr_concepto_codigo: form.islr_concepto_codigo || undefined,
    });
  };

  const selectable = (chart.data ?? []).filter((a: any) => a.is_selectable && a.code.startsWith('6'));

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold">Compras y Retenciones</h1>
      {canEdit && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Registrar Factura de Proveedor">
            <form onSubmit={submit} className="space-y-4">
              <ErrorBox message={error} />
              {ok && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-2">{ok}</div>}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha"><input type="date" className={inputCls} value={form.fecha_factura} onChange={(e) => setForm({ ...form, fecha_factura: e.target.value })} /></Field>
                <Field label="Tasa BCV"><input type="number" step="0.0001" className={inputCls} value={form.bcv_exchange_rate} onChange={(e) => setForm({ ...form, bcv_exchange_rate: e.target.value })} required /></Field>
                <Field label="RIF del proveedor">
                  <input className={inputCls} value={form.rif_proveedor} onChange={(e) => setForm({ ...form, rif_proveedor: e.target.value })} required />
                  {form.rif_proveedor && !isValidRif(form.rif_proveedor) && <span className="text-xs text-red-600">RIF inválido</span>}
                </Field>
                <Field label="Razón Social"><input className={inputCls} value={form.nombre_proveedor} onChange={(e) => setForm({ ...form, nombre_proveedor: e.target.value })} required /></Field>
                <Field label="N° Factura"><input className={inputCls} value={form.numero_factura} onChange={(e) => setForm({ ...form, numero_factura: e.target.value })} required /></Field>
                <Field label="N° Control"><input className={inputCls} value={form.numero_control} onChange={(e) => setForm({ ...form, numero_control: e.target.value })} required /></Field>
                <Field label="Cuenta de gasto">
                  <select className={inputCls} value={form.expense_account_code} onChange={(e) => setForm({ ...form, expense_account_code: e.target.value })}>
                    {selectable.map((a: any) => <option key={a.account_id} value={a.code}>{a.code} · {a.name}</option>)}
                  </select>
                </Field>
                <Field label="Montos en">
                  <select className={inputCls} value={form.amounts_in} onChange={(e) => setForm({ ...form, amounts_in: e.target.value as any })}>
                    <option value="VES">Bolívares (VES)</option><option value="USD">Divisas (USD)</option>
                  </select>
                </Field>
                <Field label={`Base imponible 16% (${form.amounts_in})`}><input type="number" step="0.01" className={inputCls} value={form.base_imponible} onChange={(e) => setForm({ ...form, base_imponible: e.target.value })} required /></Field>
                <Field label="Compras exentas (Bs.)"><input type="number" step="0.01" className={inputCls} value={form.compras_exentas} onChange={(e) => setForm({ ...form, compras_exentas: e.target.value })} /></Field>
                <Field label="Concepto ISLR (Decreto 1808)">
                  <select className={inputCls} value={form.islr_concepto_codigo} onChange={(e) => setForm({ ...form, islr_concepto_codigo: e.target.value })}>
                    <option value="">Sin retención ISLR</option>
                    {ISLR_CONCEPTS.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Valor UT (Bs.)" hint="Para sustraendo en PNR"><input type="number" step="0.01" className={inputCls} value={form.valor_ut} onChange={(e) => setForm({ ...form, valor_ut: e.target.value })} /></Field>
              </div>
              <button className={btnPrimary + ' w-full'} disabled={save.isPending}>
                {save.isPending ? 'Registrando…' : 'Registrar compra con retenciones y asiento'}
              </button>
            </form>
          </Card>
        </div>
        <Card title="Resumen de retenciones">
          <dl className="text-sm space-y-3">
            <div className="flex justify-between"><dt>Base imponible</dt><dd className="font-mono">{fmtVes(baseVes)}</dd></div>
            <div className="flex justify-between"><dt>IVA 16%</dt><dd className="font-mono">{fmtVes(ivaVes)}</dd></div>
            <div className="flex justify-between text-amber-700 font-semibold">
              <dt>Ret. IVA {tenant?.es_contribuyente_especial ? `(${form.porcentaje_retencion_iva}%)` : '(no SPE)'}</dt>
              <dd className="font-mono">{fmtVes(ivaRetVes)}</dd>
            </div>
            <div className="flex justify-between text-amber-700 font-semibold"><dt>Ret. ISLR (aprox.)</dt><dd className="font-mono">{fmtVes(islrRetVes)}</dd></div>
            <div className="flex justify-between border-t pt-2 font-bold"><dt>Neto a pagar</dt><dd className="font-mono">{fmtVes(baseVes + ivaVes + (parseFloat(form.compras_exentas) || 0) - ivaRetVes - islrRetVes)}</dd></div>
          </dl>
        </Card>
      </div>
      )}

      <Card title="Libro de Compras">
        {purchases.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className={thCls}>Op.</th><th className={thCls}>Fecha</th><th className={thCls}>Factura</th>
                <th className={thCls}>Proveedor</th><th className={thCls + ' text-right'}>Base</th><th className={thCls + ' text-right'}>Crédito IVA</th>
                <th className={thCls + ' text-right'}>Ret. IVA</th><th className={thCls + ' text-right'}>Ret. ISLR</th><th className={thCls + ' text-right'}>Total</th>
              </tr></thead>
              <tbody>
                {purchases.data.map((p: any) => (
                  <tr key={p.purchase_id}>
                    <td className={tdCls}>{p.numero_operacion}</td>
                    <td className={tdCls}>{p.fecha_factura}</td>
                    <td className={tdCls + ' font-mono'}>{p.numero_factura}</td>
                    <td className={tdCls}>{p.nombre_proveedor}<br /><span className="text-xs text-slate-400">{p.rif_proveedor}</span></td>
                    <td className={tdCls + ' text-right font-mono'}>{fmtVes(p.base_imponible_16)}</td>
                    <td className={tdCls + ' text-right font-mono'}>{fmtVes(p.credito_fiscal_16)}</td>
                    <td className={tdCls + ' text-right font-mono'}>{fmtVes(p.iva_retenido)}</td>
                    <td className={tdCls + ' text-right font-mono'}>{fmtVes(p.islr_retenido)}</td>
                    <td className={tdCls + ' text-right font-mono font-semibold'}>{fmtVes(p.total_compras_con_iva)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState>No hay compras registradas.</EmptyState>}
      </Card>
    </div>
  );
}
