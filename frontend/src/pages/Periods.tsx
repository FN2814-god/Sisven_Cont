import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  btnPrimary, btnSecondary, Card, EmptyState, ErrorBox, tdCls, thCls,
} from '../components/ui';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function PeriodsPage() {
  const { tenant, user } = useAuth();
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);
  const canClose = user?.role === 'ADMIN' || user?.role === 'CONTADOR';

  const periods = useQuery({
    queryKey: ['periods', tenant?.tenant_id, year],
    queryFn: () => api.get(`/fiscal-periods?year=${year}`).then((r) => r.data),
    enabled: !!tenant,
  });

  const ensure = useMutation({
    mutationFn: () => api.post('/fiscal-periods/ensure', { year }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['periods'] }),
    onError: (e) => setError(apiError(e)),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'close' | 'reopen' }) =>
      api.post(`/fiscal-periods/${id}/${action}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['periods'] }),
    onError: (e) => setError(apiError(e)),
  });

  const rows: any[] = periods.data ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Períodos Fiscales</h1>
          <p className="text-sm text-slate-500">Cierre mensual: bloquea la carga y modificación de asientos</p>
        </div>
        <div className="flex space-x-2 items-center">
          <input type="number" className="border rounded-lg px-3 py-1.5 text-sm w-24" value={year} onChange={(e) => setYear(+e.target.value)} />
          {canClose && (
            <button className={btnPrimary} onClick={() => ensure.mutate()} disabled={ensure.isPending}>
              Crear ejercicio {year}
            </button>
          )}
        </div>
      </div>

      <ErrorBox message={error} />

      <Card>
        {rows.length ? (
          <table className="w-full">
            <thead><tr>
              <th className={thCls}>Período</th><th className={thCls}>Estado</th><th className={thCls + ' text-right'}>Acciones</th>
            </tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.period_id}>
                  <td className={tdCls + ' font-semibold'}>{MONTHS[p.fiscal_month - 1]} {p.fiscal_year}</td>
                  <td className={tdCls}>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'ABIERTO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className={tdCls + ' text-right'}>
                    {canClose && p.status === 'ABIERTO' && (
                      <button className={btnSecondary} onClick={() => setStatus.mutate({ id: p.period_id, action: 'close' })}>Cerrar período</button>
                    )}
                    {user?.role === 'ADMIN' && p.status === 'CERRADO' && (
                      <button className={btnSecondary} onClick={() => setStatus.mutate({ id: p.period_id, action: 'reopen' })}>Reabrir</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState>
            No hay períodos para {year}. {canClose && 'Pulse "Crear ejercicio" para generar los 12 meses.'}
          </EmptyState>
        )}
      </Card>
    </div>
  );
}
