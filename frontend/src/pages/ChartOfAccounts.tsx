import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  btnDanger, btnPrimary, btnSecondary, Card, EmptyState, ErrorBox, inputCls, tdCls, thCls,
} from '../components/ui';

const LEVEL_LENGTHS = [1, 3, 6, 9, 12, 16];
const levelOf = (code: string) => LEVEL_LENGTHS.indexOf(code.length) + 1;

export default function ChartPage() {
  const { tenant, user } = useAuth();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', niif_classification: '' });
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', niif_classification: '' });
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

  const update = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) =>
      api.patch(`/chart-of-accounts/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['chart'] });
    },
    onError: (e) => setError(apiError(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const level = levelOf(form.code);
    if (!level) {
      return setError('Código inválido: use el formato N.N.NN.NN.NN.NNN (niveles 1-6)');
    }
    // Solo las cuentas de nivel 6 (auxiliares) son seleccionables; los niveles
    // intermedios se crean como grupos.
    create.mutate({ ...form, is_selectable: level === 6 });
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
        <Card title="Nueva cuenta">
          <p className="text-xs text-slate-500 mb-3">
            Cree grupos intermedios si lo necesita (ej. <code>4.1.02</code> → <code>4.1.02.01</code>) y la
            auxiliar de nivel 6 al final (<code>4.1.02.01.01.000</code>). Solo las auxiliares reciben asientos.
          </p>
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
                  <td className={tdCls}>
                    {editing === a.account_id ? (
                      <input className={inputCls + ' py-1 text-sm'} value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} autoFocus />
                    ) : a.name}
                  </td>
                  <td className={tdCls}>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.nature === 'DEUDORA' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {a.nature}
                    </span>
                  </td>
                  <td className={tdCls}>{a.is_selectable ? 'Sí' : '—'}</td>
                  <td className={tdCls + ' text-xs text-slate-500'}>
                    {editing === a.account_id ? (
                      <input className={inputCls + ' py-1 text-xs'} value={editForm.niif_classification}
                        onChange={(e) => setEditForm({ ...editForm, niif_classification: e.target.value })}
                        placeholder="Clasificación NIIF" />
                    ) : (a.niif_classification ?? '—')}
                  </td>
                  <td className={tdCls + ' text-right'}>
                    {canEdit && editing === a.account_id ? (
                      <span className="space-x-2">
                        <button className="text-xs text-emerald-700 font-semibold"
                          onClick={() => update.mutate({ id: a.account_id, dto: editForm })}>Guardar</button>
                        <button className="text-xs text-slate-400" onClick={() => setEditing(null)}>Cancelar</button>
                      </span>
                    ) : canEdit ? (
                      <span className="space-x-2">
                        <button className="text-xs text-blue-600 font-semibold"
                          onClick={() => { setEditing(a.account_id); setEditForm({ name: a.name, niif_classification: a.niif_classification ?? '' }); }}>
                          Editar
                        </button>
                        {a.level === 6 && (
                          <button className={btnDanger} onClick={() => remove.mutate(a.account_id)}>Eliminar</button>
                        )}
                      </span>
                    ) : null}
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
