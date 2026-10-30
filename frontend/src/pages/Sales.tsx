import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { isValidRif, fmtUsd, fmtVes } from '../lib/format';
import {
  btnPrimary, Card, EmptyState, ErrorBox, Field, inputCls, tdCls, thCls,
} from '../components/ui';

const r2 = (n: number) => Math.round(n * 100) / 100;

export default function SalesPage() {
  const { tenant, user } = useAuth();
  const canEdit = user?.role !== 'CONSULTA';
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState({
    fecha_factura: new Date().toISOString().substring(0, 10),
    rif_comprador: '', nombre_comprador: '',
    amounts_in: 'USD' as 'USD' | 'VES',
    base_imponible: '', ventas_exentas: '0',
    condicion: 'CONTADO' as 'CONTADO' | 'CREDITO',
    cobro_en: 'USD' as 'USD' | 'VES',
    igtf_percibido_3: '0',
    bcv_exchange_rate: '',
  });

  const sales = useQuery({
    queryKey: ['sales', tenant?.tenant_id],
    queryFn: () => api.get('/sales').then((r) => r.data),
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
    mutationFn: (payload: any) => api.post('/sales', payload).then((r) => r.data),
    onSuccess: (d) => {
      setOk(`Factura N° ${d.numero_factura} registrada con asiento automático.`);
      setError(null);
      setForm((f) => ({ ...f, rif_comprador: '', nombre_comprador: '', base_imponible: '', ventas_exentas: '0', igtf_percibido_3: '0' }));
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (e) => { setError(apiError(e)); setOk(null); },
  });

  // Vista previa del asiento (bimoneda)
  const rate = parseFloat(form.bcv_exchange_rate) || 0;
  const baseIn = parseFloat(form.base_imponible) || 0;
  const baseVes = form.amounts_in === 'USD' ? r2(baseIn * rate) : r2(baseIn);
  const baseUsd = form.amounts_in === 'USD' ? r2(baseIn) : r2(baseVes / (rate || 1));
  const exentaVes = r2(parseFloat(form.ventas_exentas) || 0);
  const ivaVes = r2(baseVes * 0.16);
  const igtfVes = r2(parseFloat(form.igtf_percibido_3) || 0);
  const totalVes = r2(baseVes + ivaVes + exentaVes + igtfVes);
  const totalUsd = r2(totalVes / (rate || 1));

  const previewLines = [
    { acc: form.condicion === 'CONTADO' ? (form.cobro_en === 'USD' ? 'Caja Chica / Custodia Divisas' : 'Bancos Nacionales (VES)') : 'Cuentas por Cobrar Comerciales', d: totalVes, c: 0 },
    { acc: 'Ventas de Mercancías Gravadas 16%', d: 0, c: baseVes },
    ...(ivaVes > 0 ? [{ acc: 'Débito Fiscal IVA 16%', d: 0, c: ivaVes }] : []),
    ...(exentaVes > 0 ? [{ acc: 'Ventas de Mercancías Exentas', d: 0, c: exentaVes }] : []),
    ...(igtfVes > 0 ? [{ acc: 'IGTF por Pagar / Enterar (3%)', d: 0, c: igtfVes }] : []),
  ];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidRif(form.rif_comprador)) return setError('RIF del comprador inválido');
    save.mutate({
      fecha_factura: form.fecha_factura,
      rif_comprador: form.rif_comprador,
      nombre_comprador: form.nombre_comprador,
      amounts_in: form.amounts_in,
      base_imponible: parseFloat(form.base_imponible) || 0,
      ventas_exentas: parseFloat(form.ventas_exentas) || 0,
      condicion: form.condicion,
      cobro_en: form.cobro_en,
      igtf_percibido_3: parseFloat(form.igtf_percibido_3) || 0,
      bcv_exchange_rate: rate,
    });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold">Ventas y Facturación</h1>
      {canEdit && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Emisión de Factura Fiscal">
          <form onSubmit={submit} className="space-y-4">
            <ErrorBox message={error} />
            {ok && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-2">{ok}</div>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha"><input type="date" className={inputCls} value={form.fecha_factura} onChange={(e) => setForm({ ...form, fecha_factura: e.target.value })} /></Field>
              <Field label="Tasa BCV"><input type="number" step="0.0001" className={inputCls} value={form.bcv_exchange_rate} onChange={(e) => setForm({ ...form, bcv_exchange_rate: e.target.value })} required /></Field>
              <Field label="RIF del comprador">
                <input className={inputCls} value={form.rif_comprador} onChange={(e) => setForm({ ...form, rif_comprador: e.target.value })} placeholder="J-12345678-9" required />
                {form.rif_comprador && !isValidRif(form.rif_comprador) && <span className="text-xs text-red-600">RIF inválido</span>}
              </Field>
              <Field label="Nombre / Razón Social"><input className={inputCls} value={form.nombre_comprador} onChange={(e) => setForm({ ...form, nombre_comprador: e.target.value })} required /></Field>
              <Field label="Montos expresados en">
                <select className={inputCls} value={form.amounts_in} onChange={(e) => setForm({ ...form, amounts_in: e.target.value as any })}>
                  <option value="USD">Divisas (USD)</option><option value="VES">Bolívares (VES)</option>
                </select>
              </Field>
              <Field label="Condición">
                <select className={inputCls} value={form.condicion} onChange={(e) => setForm({ ...form, condicion: e.target.value as any })}>
                  <option value="CONTADO">Contado</option><option value="CREDITO">Crédito</option>
                </select>
              </Field>
              {form.condicion === 'CONTADO' && (
                <Field label="Cobrado en">
                  <select className={inputCls} value={form.cobro_en} onChange={(e) => setForm({ ...form, cobro_en: e.target.value as any })}>
                    <option value="USD">Divisas (aplica IGTF)</option><option value="VES">Bolívares</option>
                  </select>
                </Field>
              )}
              <Field label={`Base imponible 16% (${form.amounts_in})`}><input type="number" step="0.01" className={inputCls} value={form.base_imponible} onChange={(e) => setForm({ ...form, base_imponible: e.target.value })} required /></Field>
              <Field label="Ventas exentas (Bs.)"><input type="number" step="0.01" className={inputCls} value={form.ventas_exentas} onChange={(e) => setForm({ ...form, ventas_exentas: e.target.value })} /></Field>
              <Field label="IGTF percibido 3% (Bs.)"><input type="number" step="0.01" className={inputCls} value={form.igtf_percibido_3} onChange={(e) => setForm({ ...form, igtf_percibido_3: e.target.value })} /></Field>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-sm flex justify-between font-semibold">
              <span>Total factura</span>
              <span>{fmtVes(totalVes)} · {fmtUsd(totalUsd)}</span>
            </div>
            <button className={btnPrimary + ' w-full'} disabled={save.isPending}>
              {save.isPending ? 'Registrando…' : 'Emitir factura con asiento automático'}
            </button>
          </form>
        </Card>

        <Card title="Asiento contable en tiempo real (VEN-NIF PYME)">
          <table className="w-full">
            <thead><tr><th className={thCls}>Cuenta</th><th className={thCls + ' text-right'}>Debe (Bs.)</th><th className={thCls + ' text-right'}>Haber (Bs.)</th></tr></thead>
            <tbody>
              {previewLines.map((l, i) => (
                <tr key={i}><td className={tdCls}>{l.acc}</td><td className={tdCls + ' text-right font-mono'}>{l.d ? fmtVes(l.d) : ''}</td><td className={tdCls + ' text-right font-mono'}>{l.c ? fmtVes(l.c) : ''}</td></tr>
              ))}
              <tr className="font-bold"><td className={tdCls}>Totales</td><td className={tdCls + ' text-right font-mono'}>{fmtVes(totalVes)}</td><td className={tdCls + ' text-right font-mono'}>{fmtVes(totalVes)}</td></tr>
            </tbody>
          </table>
        </Card>
      </div>
      )}

      <Card title="Libro de Ventas">
        {sales.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className={thCls}>Op.</th><th className={thCls}>Fecha</th><th className={thCls}>Factura</th><th className={thCls}>Control</th>
                <th className={thCls}>Comprador</th><th className={thCls + ' text-right'}>Base 16%</th><th className={thCls + ' text-right'}>IVA</th><th className={thCls + ' text-right'}>Total</th><th className={thCls + ' text-right'}>Tasa</th>
              </tr></thead>
              <tbody>
                {sales.data.map((s: any) => (
                  <tr key={s.sale_id}>
                    <td className={tdCls}>{s.numero_operacion}</td>
                    <td className={tdCls}>{s.fecha_factura}</td>
                    <td className={tdCls + ' font-mono'}>{s.numero_factura}</td>
                    <td className={tdCls + ' font-mono'}>{s.numero_control}</td>
                    <td className={tdCls}>{s.nombre_comprador}<br /><span className="text-xs text-slate-400">{s.rif_comprador}</span></td>
                    <td className={tdCls + ' text-right font-mono'}>{fmtVes(s.base_imponible_16)}</td>
                    <td className={tdCls + ' text-right font-mono'}>{fmtVes(s.debito_fiscal_16)}</td>
                    <td className={tdCls + ' text-right font-mono font-semibold'}>{fmtVes(s.total_ventas_con_iva)}</td>
                    <td className={tdCls + ' text-right font-mono'}>{s.bcv_exchange_rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState>No hay ventas registradas.</EmptyState>}
      </Card>
    </div>
  );
}
