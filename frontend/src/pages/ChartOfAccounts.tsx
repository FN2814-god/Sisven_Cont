import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  btnDanger, btnPrimary, btnSecondary, Card, EmptyState, ErrorBox, inputCls, tdCls, thCls,
} from '../components/ui';

export default function ChartPage() {
  const { tenant, user } = useAuth();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', niif_classification: '' });
  const canEdit = user?.role !== 'CONSULTA';

  const chart = useQuery({
    queryKey: ['chart', tenant?.tenant_id],
    queryFn: () => api.get('/chart-of-accounts').then((r) => r.data),
    enabled: !!tenant,
  });

  const create = useMutation({
    mutationFn: (dto: any) => api.post('/chart-of-accounts', dto).then((r) => r.data),
    onSuccess: () => {
      setShowForm(false);
      setForm({ code: '', name: '', niif_classification: '' });
      qc.invalidateQueries({ queryKey: ['chart'] });
    },
    onError: (e) => setError(apiError(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/chart-of-accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chart'] }),
    onError: (e) => setError(apiError(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate({ ...form, is_selectable: true });
  };

  const accounts: any[] = chart.data ?? [];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plan de Cuentas</h1>
          <p className="text-sm text-slate-500">Estructura VEN-NIF PYME · 6 niveles jerárquicos</p>
        </div>
        {canEdit && (
          <button className={btnPrimary} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Nueva cuenta'}
          </button>
        )}
      </div>

      <ErrorBox message={error} />

      {showForm && (
        <Card title="Nueva cuenta auxiliar">
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Código (N.N.NN.NN.NN.NNN)</span>
              <input className={inputCls + ' mt-1 font-mono'} value={form.code} required
                onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="1.1.01.01.00.001" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-slate-600">Nombre</span>
              <input className={inputCls + ' mt-1'} value={form.name} required
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <button className={btnPrimary} disabled={create.isPending}>Crear</button>
          </form>
        </Card>
      )}

      <Card>
        {accounts.length ? (
          <table className="w-full">
            <thead><tr>
              <th className={thCls}>Código</th><th className={thCls}>Nombre</th>
              <th className={thCls}>Naturaleza</th><th className={thCls}>Seleccionable</th>
              <th className={thCls}>Clasificación NIIF</th><th className={thCls}></th>
            </tr></thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.account_id} className={a.is_selectable ? '' : 'bg-slate-50 font-semibold'}>
                  <td className={tdCls + ' font-mono whitespace-nowrap'}>
                    <span style={{ paddingLeft: `${(a.level - 1) * 14}px` }}>{a.code}</span>
                  </td>
                  <td className={tdCls}>{a.name}</td>
                  <td className={tdCls}>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.nature === 'DEUDORA' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {a.nature}
                    </span>
                  </td>
                  <td className={tdCls}>{a.is_selectable ? 'Sí' : '—'}</td>
                  <td className={tdCls + ' text-xs text-slate-500'}>{a.niif_classification ?? '—'}</td>
                  <td className={tdCls + ' text-right'}>
                    {canEdit && a.level === 6 && (
                      <button className={btnDanger} onClick={() => remove.mutate(a.account_id)}>Eliminar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState>Plan de cuentas vacío.</EmptyState>}
      </Card>
    </div>
  );
}
