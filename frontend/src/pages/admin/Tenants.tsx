import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { isValidRif } from '../../lib/format';
import {
  btnPrimary, btnSecondary, Card, ErrorBox, inputCls, tdCls, thCls,
} from '../../components/ui';

export default function AdminTenantsPage() {
  const { tenants, refreshMe } = useAuth();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editRate, setEditRate] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    rif: '', razon_social: '', nombre_comercial: '',
    es_contribuyente_especial: false, porcentaje_retencion_iva: 75,
  });

  const create = useMutation({
    mutationFn: () => api.post('/tenants', form),
    onSuccess: () => { setShowForm(false); refreshMe(); },
    onError: (e) => setError(apiError(e)),
  });
  const setRate = useMutation({
    mutationFn: ({ id, tasa }: { id: string; tasa: number }) =>
      api.patch(`/tenants/${id}/exchange-rate`, { tasa }),
    onSuccess: () => refreshMe(),
    onError: (e) => setError(apiError(e)),
  });
  const toggleSpe = useMutation({
    mutationFn: (t: any) => api.patch(`/tenants/${t.tenant_id}`, { es_contribuyente_especial: !t.es_contribuyente_especial }),
    onSuccess: () => { refreshMe(); qc.invalidateQueries(); },
    onError: (e) => setError(apiError(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidRif(form.rif)) return setError('RIF inválido según algoritmo Módulo 11');
    create.mutate();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empresas (Tenants)</h1>
          <p className="text-sm text-slate-500">Cada empresa tiene su plan de cuentas, libros y usuarios aislados</p>
        </div>
        <button className={btnPrimary} onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancelar' : 'Nueva empresa'}</button>
      </div>

      <ErrorBox message={error} />

      {showForm && (
        <Card title="Crear empresa — se genera el plan de cuentas VEN-NIF PYME automáticamente">
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">RIF</span>
              <input className={inputCls + ' mt-1'} placeholder="J-12345678-9" value={form.rif} required onChange={(e) => setForm({ ...form, rif: e.target.value })} />
              {form.rif && !isValidRif(form.rif) && <span className="text-xs text-red-600">RIF inválido</span>}
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Razón Social</span>
              <input className={inputCls + ' mt-1'} value={form.razon_social} required onChange={(e) => setForm({ ...form, razon_social: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Nombre comercial</span>
              <input className={inputCls + ' mt-1'} value={form.nombre_comercial} onChange={(e) => setForm({ ...form, nombre_comercial: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">% Retención de IVA</span>
              <select className={inputCls + ' mt-1'} value={form.porcentaje_retencion_iva} onChange={(e) => setForm({ ...form, porcentaje_retencion_iva: +e.target.value })}>
                <option value={75}>75%</option><option value={100}>100%</option>
              </select>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input type="checkbox" checked={form.es_contribuyente_especial} onChange={(e) => setForm({ ...form, es_contribuyente_especial: e.target.checked })} />
              <span>Es Sujeto Pasivo Especial (agente de retención de IVA)</span>
            </label>
            <button className={btnPrimary} disabled={create.isPending}>Crear empresa</button>
          </form>
        </Card>
      )}

      <Card>
        <table className="w-full">
          <thead><tr>
            <th className={thCls}>Empresa</th><th className={thCls}>RIF</th><th className={thCls}>SPE</th>
            <th className={thCls}>Ret. IVA</th><th className={thCls}>Tasa BCV manual</th><th className={thCls + ' text-right'}>Acciones</th>
          </tr></thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.tenant_id}>
                <td className={tdCls + ' font-semibold'}>{t.razon_social}<br /><span className="text-xs text-slate-400 font-normal">{t.nombre_comercial}</span></td>
                <td className={tdCls + ' font-mono'}>{t.rif}</td>
                <td className={tdCls}>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.es_contribuyente_especial ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {t.es_contribuyente_especial ? 'SPE' : 'No'}
                  </span>
                </td>
                <td className={tdCls}>{t.porcentaje_retencion_iva}%</td>
                <td className={tdCls}>
                  <div className="flex items-center space-x-1">
                    <input type="number" step="0.0001" className={inputCls + ' w-28'} value={editRate[t.tenant_id] ?? t.tasa_bcv_manual ?? ''} onChange={(e) => setEditRate({ ...editRate, [t.tenant_id]: e.target.value })} />
                    <button className={btnSecondary} onClick={() => setRate.mutate({ id: t.tenant_id, tasa: parseFloat(editRate[t.tenant_id] || '0') })}>Fijar</button>
                  </div>
                </td>
                <td className={tdCls + ' text-right'}>
                  <button className={btnSecondary} onClick={() => toggleSpe.mutate(t)}>
                    {t.es_contribuyente_especial ? 'Quitar SPE' : 'Marcar SPE'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
