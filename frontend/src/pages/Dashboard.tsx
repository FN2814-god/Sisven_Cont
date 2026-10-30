import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Card } from '../components/ui';
import { fmtRate, fmtVes } from '../lib/format';

export default function DashboardPage() {
  const { tenant } = useAuth();
  const stats = useQuery({
    queryKey: ['stats', tenant?.tenant_id],
    queryFn: () => api.get('/stats').then((r) => r.data),
    enabled: !!tenant,
  });
  const rate = useQuery({
    queryKey: ['bcv-rate'],
    queryFn: () => api.get('/bcv/rate').then((r) => r.data),
    retry: 0,
  });
  const s = stats.data;

  const kpis = [
    { label: `Ventas del mes (${s?.fiscal_year}-${String(s?.fiscal_period).padStart(2, '0')})`, value: fmtVes(s?.total_sales_month_ves), sub: `${s?.sales_count_month ?? 0} facturas` },
    { label: 'Compras del mes', value: fmtVes(s?.total_purchases_month_ves), sub: `${s?.purchases_count_month ?? 0} documentos` },
    { label: 'IVA retenido por enterar', value: fmtVes(s?.iva_retenido_acumulado_ves), sub: 'Agente de retención' },
    { label: 'Partidas bancarias pendientes', value: String(s?.pending_bank_count ?? 0), sub: 'por conciliar' },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel de Control</h1>
          <p className="text-sm text-slate-500">{tenant?.razon_social} · RIF {tenant?.rif}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 uppercase font-semibold">Tasa BCV</p>
          <p className="text-lg font-bold text-blue-700">
            {rate.data ? `Bs. ${fmtRate(rate.data.rate)} / USD` : 'No disponible'}
          </p>
          {rate.data?.source && <p className="text-[10px] text-slate-400">{rate.data.source}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">{k.label}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{stats.isLoading ? '…' : k.value}</p>
            <p className="text-[11px] text-slate-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Condición Tributaria">
          <ul className="text-sm space-y-2 text-slate-600">
            <li>
              <b>Contribuyente Especial (SPE):</b>{' '}
              {tenant?.es_contribuyente_especial ? 'Sí — agente de retención de IVA' : 'No'}
            </li>
            <li><b>Retención de IVA aplicable:</b> {tenant?.porcentaje_retencion_iva ?? 0}%</li>
            <li><b>ISLR retenido acumulado:</b> {fmtVes(s?.islr_retenido_acumulado_ves)}</li>
          </ul>
        </Card>
        <Card title="Accesos rápidos">
          <div className="flex flex-wrap gap-2">
            <a href="/ventas" className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100">Emitir factura</a>
            <a href="/compras" className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200">Registrar compra</a>
            <a href="/contabilidad/diario" className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200">Libro diario</a>
            <a href="/bancos" className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200">Conciliar banco</a>
            <a href="/fiscal" className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200">Archivos SENIAT</a>
          </div>
        </Card>
      </div>
    </div>
  );
}
