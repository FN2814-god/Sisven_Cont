import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { fmtVes } from '../lib/format';
import { Card, EmptyState, tdCls } from '../components/ui';

function BalanceSection({ title, node }: { title: string; node: any }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-700 uppercase mb-2">{title}</h3>
      <table className="w-full">
        <tbody>
          {node?.groups?.map((g: any) => (
            <>
              <tr key={g.group} className="bg-slate-50">
                <td className={tdCls + ' font-bold text-xs uppercase'} colSpan={2}>Grupo {g.group}</td>
              </tr>
              {g.accounts.map((a: any) => (
                <tr key={a.code}>
                  <td className={tdCls + ' pl-6'}><span className="font-mono text-xs mr-2">{a.code}</span>{a.name}</td>
                  <td className={tdCls + ' text-right font-mono w-44'}>{fmtVes(a.net_ves)}</td>
                </tr>
              ))}
              <tr key={g.group + '-t'} className="font-semibold">
                <td className={tdCls}>Subtotal {g.group}</td>
                <td className={tdCls + ' text-right font-mono'}>{fmtVes(g.total_ves)}</td>
              </tr>
            </>
          ))}
          <tr className="font-bold bg-slate-100"><td className={tdCls}>TOTAL {title.toUpperCase()}</td><td className={tdCls + ' text-right font-mono'}>{fmtVes(node?.total_ves)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function ResultSection({ title, sec }: { title: string; sec: any }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-700 uppercase mb-2">{title}</h3>
      <table className="w-full">
        <tbody>
          {sec?.accounts?.map((a: any) => (
            <tr key={a.code}>
              <td className={tdCls}><span className="font-mono text-xs mr-2">{a.code}</span>{a.name}</td>
              <td className={tdCls + ' text-right font-mono w-44'}>{fmtVes(a.net_ves)}</td>
            </tr>
          ))}
          <tr className="font-bold bg-slate-100"><td className={tdCls}>TOTAL {title.toUpperCase()}</td><td className={tdCls + ' text-right font-mono'}>{fmtVes(sec?.total?.ves)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

export default function StatementsPage() {
  const { tenant } = useAuth();
  const [dateTo, setDateTo] = useState(new Date().toISOString().substring(0, 10));
  const [submitted, setSubmitted] = useState(dateTo);

  const q = useQuery({
    queryKey: ['statements', tenant?.tenant_id, submitted],
    queryFn: () =>
      Promise.all([
        api.get(`/reports/balance-sheet?as_of=${submitted}`).then((r) => r.data),
        api.get(`/reports/income-statement?from=${submitted.slice(0, 4)}-01-01&to=${submitted}`).then((r) => r.data),
      ]).then(([bs, is]) => ({ bs, is })),
    enabled: !!tenant,
  });

  const bs = q.data?.bs;
  const is = q.data?.is;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estados Financieros</h1>
          <p className="text-sm text-slate-500">Balance General y Estado de Resultados — VEN-NIF PYME</p>
        </div>
        <div className="flex space-x-2 items-center">
          <input type="date" className="border rounded-lg px-3 py-1.5 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <button className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold" onClick={() => setSubmitted(dateTo)}>Generar</button>
        </div>
      </div>

      {q.data && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card title={`Balance General al ${bs.as_of}`}>
            <div className="space-y-6">
              <BalanceSection title="Activos" node={bs.activo} />
              <BalanceSection title="Pasivos" node={bs.pasivo} />
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase mb-2">Patrimonio</h3>
                <table className="w-full"><tbody>
                  {bs.patrimonio?.groups?.flatMap((g: any) => [
                    ...g.accounts.map((a: any) => (
                      <tr key={a.code}><td className={tdCls + ' pl-6'}><span className="font-mono text-xs mr-2">{a.code}</span>{a.name}</td><td className={tdCls + ' text-right font-mono w-44'}>{fmtVes(a.net_ves)}</td></tr>
                    )),
                  ])}
                  <tr><td className={tdCls + ' pl-6 italic'}>Resultado del ejercicio</td><td className={tdCls + ' text-right font-mono'}>{fmtVes(bs.patrimonio?.resultado_ejercicio_ves)}</td></tr>
                  <tr className="font-bold bg-slate-100"><td className={tdCls}>TOTAL PATRIMONIO</td><td className={tdCls + ' text-right font-mono'}>{fmtVes(bs.patrimonio?.total_ves)}</td></tr>
                </tbody></table>
              </div>
              <div className={`border rounded-lg p-3 text-sm font-bold flex justify-between ${bs.balance_check_ves === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                <span>Activo − (Pasivo + Patrimonio) · {fmtVes(bs.pasivo_patrimonio_ves)}</span>
                <span className="font-mono">{fmtVes(bs.balance_check_ves)}</span>
              </div>
            </div>
          </Card>
          <Card title={`Estado de Resultados ${is.from} → ${is.to}`}>
            <div className="space-y-6">
              <ResultSection title="Ingresos" sec={is.ingresos} />
              <ResultSection title="Costos" sec={is.costos} />
              <div className="border rounded-lg p-3 text-sm font-bold flex justify-between bg-blue-50 text-blue-700 border-blue-200">
                <span>Utilidad bruta</span><span className="font-mono">{fmtVes(is.utilidad_bruta?.ves)}</span>
              </div>
              <ResultSection title="Gastos" sec={is.gastos} />
              <div className={`border rounded-lg p-3 font-bold flex justify-between ${is.resultado_neto?.ves >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                <span>Utilidad (pérdida) neta del ejercicio</span>
                <span className="font-mono">{fmtVes(is.resultado_neto?.ves)}</span>
              </div>
            </div>
          </Card>
        </div>
      )}
      {!q.data && <EmptyState>Seleccione la fecha de corte.</EmptyState>}
    </div>
  );
}
