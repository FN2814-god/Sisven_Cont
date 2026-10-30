import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import {
  btnPrimary, btnSecondary, Card, EmptyState, ErrorBox, inputCls, tdCls, thCls,
} from '../../components/ui';

export default function AdminUsersPage() {
  const { tenants } = useAuth();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'CONTADOR', tenant_ids: [] as string[] });

  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: () => api.post('/users', form),
    onSuccess: () => {
      setShowForm(false);
      setForm({ email: '', password: '', full_name: '', role: 'CONTADOR', tenant_ids: [] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => setError(apiError(e)),
  });

  const toggleActive = useMutation({
    mutationFn: (u: any) => api.patch(`/users/${u.user_id}`, { is_active: !u.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (e) => setError(apiError(e)),
  });

  const assign = useMutation({
    mutationFn: ({ id, tenant_ids }: { id: string; tenant_ids: string[] }) =>
      api.put(`/users/${id}/tenants`, { tenant_ids }),
    onSuccess: () => { setAssignId(null); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: (e) => setError(apiError(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuarios del Sistema</h1>
        <button className={btnPrimary} onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancelar' : 'Nuevo usuario'}</button>
      </div>

      <ErrorBox message={error} />

      {showForm && (
        <Card title="Crear usuario">
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={inputCls} type="email" placeholder="Correo" value={form.email} required onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className={inputCls} placeholder="Nombre completo" value={form.full_name} required onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <input className={inputCls} type="password" placeholder="Contraseña (mín. 6)" value={form.password} required minLength={6} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="ADMIN">ADMIN — acceso total</option>
              <option value="CONTADOR">CONTADOR — operaciones y reportes</option>
              <option value="CONSULTA">CONSULTA — solo lectura</option>
            </select>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-slate-600 mb-1">Empresas asignadas</p>
              <div className="flex flex-wrap gap-3">
                {tenants.map((t) => (
                  <label key={t.tenant_id} className="flex items-center space-x-1 text-sm">
                    <input type="checkbox" checked={form.tenant_ids.includes(t.tenant_id)}
                      onChange={(e) => setForm({ ...form, tenant_ids: e.target.checked ? [...form.tenant_ids, t.tenant_id] : form.tenant_ids.filter((x) => x !== t.tenant_id) })} />
                    <span>{t.razon_social}</span>
                  </label>
                ))}
              </div>
            </div>
            <button className={btnPrimary + ' sm:col-span-2'} disabled={create.isPending}>Crear usuario</button>
          </form>
        </Card>
      )}

      <Card>
        {users.data?.length ? (
          <table className="w-full">
            <thead><tr>
              <th className={thCls}>Usuario</th><th className={thCls}>Rol</th><th className={thCls}>Estado</th>
              <th className={thCls}>Empresas</th><th className={thCls + ' text-right'}>Acciones</th>
            </tr></thead>
            <tbody>
              {users.data.map((u: any) => (
                <tr key={u.user_id} className={u.is_active ? '' : 'opacity-50'}>
                  <td className={tdCls}><b>{u.full_name}</b><br /><span className="text-xs text-slate-400">{u.email}</span></td>
                  <td className={tdCls}><span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-full">{u.role}</span></td>
                  <td className={tdCls}>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td className={tdCls + ' text-xs'}>{(u.tenants ?? []).map((t: any) => t.rif ?? t).join(', ') || '—'}</td>
                  <td className={tdCls + ' text-right space-x-2'}>
                    <button className={btnSecondary} onClick={() => setAssignId(assignId === u.user_id ? null : u.user_id)}>Empresas</button>
                    <button className={btnSecondary} onClick={() => toggleActive.mutate(u)}>{u.is_active ? 'Desactivar' : 'Activar'}</button>
                    {assignId === u.user_id && (
                      <div className="mt-2 bg-slate-50 border rounded-lg p-3 text-left">
                        <AssignTenants user={u} tenants={tenants} onSave={(ids) => assign.mutate({ id: u.user_id, tenant_ids: ids })} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState>Sin usuarios.</EmptyState>}
      </Card>
    </div>
  );
}

function AssignTenants({ user, tenants, onSave }: { user: any; tenants: any[]; onSave: (ids: string[]) => void }) {
  const current: string[] = (user.tenants ?? []).map((t: any) => t.tenant_id ?? t);
  const [ids, setIds] = useState<string[]>(current);
  return (
    <div className="space-y-2">
      {tenants.map((t) => (
        <label key={t.tenant_id} className="flex items-center space-x-2 text-sm">
          <input type="checkbox" checked={ids.includes(t.tenant_id)}
            onChange={(e) => setIds(e.target.checked ? [...ids, t.tenant_id] : ids.filter((x) => x !== t.tenant_id))} />
          <span>{t.razon_social} ({t.rif})</span>
        </label>
      ))}
      <button className={btnPrimary + ' mt-2'} onClick={() => onSave(ids)}>Guardar asignación</button>
    </div>
  );
}
