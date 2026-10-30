import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { fmtVes } from '../lib/format';
import { Card, EmptyState, tdCls, thCls } from '../components/ui';

export default function FiscalPage() {
  const { tenant } = useAuth();
  const now = new Date();
  const [periodo, setPeriodo] = useState(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`);

  const iva = useQuery({
    queryKey: ['ret-iva', tenant?.tenant_id, periodo],
    queryFn: () => api.get(`/retentions/iva?periodo=${periodo}`).then((r) => r.data),
    enabled: !!tenant,
  });
  const islr = useQuery({
    queryKey: ['ret-islr', tenant?.tenant_id, periodo],
    queryFn: () => api.get(`/retentions/islr?periodo=${periodo}`).then((r) => r.data),
    enabled: !!tenant,
  });

  const download = (path: string, filename: string) => {
    api.get(path, { responseType: 'blob' }).then((r) => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Retenciones y Archivos SENIAT</h1>
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-500">Período (AAAAMM)</label>
          <input className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-28"
            value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="Archivo TXT — Retenciones de IVA (PA 00054)">
          <p className="text-sm text-slate-500 mb-3">
            16 campos tabulados para la declaración quincenal en el portal SENIAT.
          </p>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            disabled={!iva.data?.length}
            onClick={() => download(`/retentions/iva/txt?periodo=${periodo}`, `retenciones_iva_${periodo}.txt`)}
          >
            Descargar TXT ({iva.data?.length ?? 0} registros)
          </button>
        </Card>
        <Card title="Archivo XML — Retenciones de ISLR (Decreto 1808)">
          <p className="text-sm text-slate-500 mb-3">
            Esquema XSD oficial para la declaración de retenciones de ISLR.
          </p>
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            disabled={!islr.data?.length}
            onClick={() => download(`/retentions/islr/xml?periodo=${periodo}`, `retenciones_islr_${periodo}.xml`)}
          >
            Descargar XML ({islr.data?.length ?? 0} registros)
          </button>
        </Card>
      </div>

      <Card title={`Retenciones de IVA practicadas — ${periodo}`}>
        {iva.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className={thCls}>Comprobante</th><th className={thCls}>Fecha</th><th className={thCls}>Proveedor retenido</th>
                <th className={thCls}>Factura</th><th className={thCls + ' text-right'}>Total c/IVA</th><th className={thCls + ' text-right'}>Base</th><th className={thCls + ' text-right'}>Retenido</th>
              </tr></thead>
              <tbody>
                {iva.data.map((r: any) => (
                  <tr key={r.retention_id}>
                    <td className={tdCls + ' font-mono'}>{r.numero_comprobante}</td>
                    <td className={tdCls}>{r.fecha_factura}</td>
                    <td className={tdCls + ' font-mono'}>{r.rif_retenido}</td>
                    <td className={tdCls + ' font-mono'}>{r.numero_factura}</td>
                    <td className={tdCls + ' text-right font-mono'}>{fmtVes(r.monto_total_con_iva)}</td>
                    <td className={tdCls + ' text-right font-mono'}>{fmtVes(r.base_imponible)}</td>
                    <td className={tdCls + ' text-right font-mono font-semibold'}>{fmtVes(r.monto_iva_retenido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState>Sin retenciones de IVA en el período.</EmptyState>}
      </Card>

      <Card title={`Retenciones de ISLR practicadas — ${periodo}`}>
        {islr.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className={thCls}>Fecha</th><th className={thCls}>Retenido</th><th className={thCls}>Factura</th>
                <th className={thCls}>Concepto</th><th className={thCls + ' text-right'}>Monto Op.</th>
                <th className={thCls + ' text-right'}>%</th><th className={thCls + ' text-right'}>Sustraendo</th><th className={thCls + ' text-right'}>Retenido</th>
              </tr></thead>
              <tbody>
                {islr.data.map((r: any) => (
                  <tr key={r.retention_id}>
                    <td className={tdCls}>{r.fecha_operacion}</td>
                    <td className={tdCls + ' font-mono'}>{r.rif_retenido}</td>
                    <td className={tdCls + ' font-mono'}>{r.numero_factura}</td>
                    <td className={tdCls + ' font-mono'}>{r.codigo_concepto}</td>
                    <td className={tdCls + ' text-right font-mono'}>{fmtVes(r.monto_operacion)}</td>
                    <td className={tdCls + ' text-right font-mono'}>{r.porcentaje_retencion}%</td>
                    <td className={tdCls + ' text-right font-mono'}>{fmtVes(r.monto_sustraendo)}</td>
                    <td className={tdCls + ' text-right font-mono font-semibold'}>{fmtVes(r.monto_retenido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState>Sin retenciones de ISLR en el período.</EmptyState>}
      </Card>
    </div>
  );
}
