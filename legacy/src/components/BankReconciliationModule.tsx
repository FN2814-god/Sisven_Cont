import React, { useState } from 'react';

interface BankReconciliationModuleProps {
  bcvRate: number;
}

export const BankReconciliationModule: React.FC<BankReconciliationModuleProps> = ({ bcvRate }) => {
  const [hasRun, setHasRun] = useState(false);

  const [statements, setStatements] = useState([
    { id: 'st-1', date: '2026-03-03', ref: '000101', desc: 'TRANSFERENCIA INGRESO MERCADOLIBRE', amount: 43435.0, type: 'CREDITO', status: 'PENDIENTE' },
    { id: 'st-2', date: '2026-03-09', ref: '998120', desc: 'PAGO PROVEEDOR POLAR COMPRA', amount: 51000.0, type: 'DEBITO', status: 'PENDIENTE' },
    { id: 'st-3', date: '2026-03-12', ref: 'DEP-7761', desc: 'DEPOSITO EFECTIVO NO IDENTIFICADO', amount: 95000.0, type: 'CREDITO', status: 'PENDIENTE' },
    { id: 'st-4', date: '2026-03-14', ref: 'DEB-001', desc: 'CARGO IGTF BANCARIO TRANS. DIVISA', amount: 1500.0, type: 'DEBITO', status: 'PENDIENTE' },
    { id: 'st-5', date: '2026-03-15', ref: 'POS-88', desc: 'COMISION PTO.VENTA LIQUIDACION', amount: 116.0, type: 'DEBITO', status: 'PENDIENTE' },
  ]);

  const [internalMovements, setInternalMovements] = useState([
    { id: 'mv-1', date: '2026-03-02', ref: '101', concept: 'Cobro Factura 000101 MercadoLibre', amount: 43435.0, type: 'CREDITO', status: 'PENDIENTE' },
    { id: 'mv-2', date: '2026-03-08', ref: '998120', concept: 'Pago Proveedor Factura 99812', amount: 51000.0, type: 'DEBITO', status: 'PENDIENTE' },
  ]);

  const runReconciliation = () => {
    setStatements((prev) =>
      prev.map((s) => {
        if (s.id === 'st-1' || s.id === 'st-2') return { ...s, status: 'CONCILIADO' };
        if (s.id === 'st-3') return { ...s, status: 'RIESGO_FISCAL' };
        if (s.id === 'st-4' || s.id === 'st-5') return { ...s, status: 'GASTO_AUTO' };
        return s;
      })
    );

    setInternalMovements((prev) =>
      prev.map((m) => ({ ...m, status: 'CONCILIADO' }))
    );

    setHasRun(true);
  };

  return (
    <div className="space-y-6">
      {/* Control y Ejecución */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Motor de Conciliación Bancaria Automatizada</h3>
          <p className="text-xs text-slate-500">Comparación progresiva en 4 fases: Coincidencia Exacta, Temporal, Validación Fiscal y Detección de Gastos</p>
        </div>
        <button
          onClick={runReconciliation}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 flex items-center space-x-2 transition-all"
        >
          <span>Ejecutar Conciliación Automática</span>
        </button>
      </div>

      {/* Resultados de la Ejecución */}
      {hasRun && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
            <p className="text-xs font-bold text-emerald-800 uppercase">Fase 1: Coincidencia Exacta</p>
            <p className="text-xl font-black text-emerald-700 mt-1">1 Movimiento Conciliado</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Monto idéntico + Referencia normalizada</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
            <p className="text-xs font-bold text-blue-800 uppercase">Fase 2: Coincidencia Temporal</p>
            <p className="text-xl font-black text-blue-700 mt-1">1 Movimiento Conciliado</p>
            <p className="text-[11px] text-blue-600 mt-0.5">Monto idéntico en ventana de 5 días</p>
          </div>
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl">
            <p className="text-xs font-bold text-rose-800 uppercase">Fase 3: Alertas Riesgo Fiscal</p>
            <p className="text-xl font-black text-rose-700 mt-1">1 Depósito sin Factura</p>
            <p className="text-[11px] text-rose-600 mt-0.5">Abono en banco no soportado ante el SENIAT</p>
          </div>
        </div>
      )}

      {/* Interfaz de 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna A: Extracto Bancario */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Columna A: Extracto Bancario Oficial</h4>
              <p className="text-xs text-slate-500">Banco Mercantil (Cta Cte ...9012)</p>
            </div>
            <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 font-semibold rounded">Importado OFX</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase font-semibold">
                <tr>
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Referencia</th>
                  <th className="p-2 font-sans">Descripción</th>
                  <th className="p-2 text-right">Monto (Bs.)</th>
                  <th className="p-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {statements.map((s) => {
                  let badgeClass = 'bg-slate-100 text-slate-600';
                  let badgeText = 'PENDIENTE';
                  let rowBg = '';

                  if (s.status === 'CONCILIADO') {
                    badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300';
                    badgeText = 'CONCILIADO ✓';
                    rowBg = 'bg-emerald-50/70';
                  } else if (s.status === 'RIESGO_FISCAL') {
                    badgeClass = 'bg-rose-100 text-rose-800 border border-rose-300';
                    badgeText = 'RIESGO FISCAL ⚠';
                    rowBg = 'bg-rose-50/80';
                  } else if (s.status === 'GASTO_AUTO') {
                    badgeClass = 'bg-indigo-100 text-indigo-800 border border-indigo-300';
                    badgeText = 'AUTO-GASTO';
                    rowBg = 'bg-indigo-50/70';
                  }

                  return (
                    <tr key={s.id} className={rowBg}>
                      <td className="p-2">{s.date}</td>
                      <td className="p-2 font-bold">{s.ref}</td>
                      <td className="p-2 font-sans truncate max-w-[150px]">{s.desc}</td>
                      <td className={`p-2 text-right font-bold ${s.type === 'CREDITO' ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {s.type === 'CREDITO' ? '+' : '-'} Bs. {s.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeClass}`}>{badgeText}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Columna B: Libro de Bancos Interno */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Columna B: Libro de Banco Interno (Sisven)</h4>
              <p className="text-xs text-slate-500">Cobros y Pagos registrados en contabilidad</p>
            </div>
            <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 font-semibold rounded">Módulo Contable</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase font-semibold">
                <tr>
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Referencia</th>
                  <th className="p-2 font-sans">Concepto Interno</th>
                  <th className="p-2 text-right">Monto (Bs.)</th>
                  <th className="p-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {internalMovements.map((m) => {
                  const isConciliated = m.status === 'CONCILIADO';
                  return (
                    <tr key={m.id} className={isConciliated ? 'bg-emerald-50/70' : ''}>
                      <td className="p-2">{m.date}</td>
                      <td className="p-2 font-bold">{m.ref}</td>
                      <td className="p-2 font-sans truncate max-w-[150px]">{m.concept}</td>
                      <td className="p-2 text-right font-bold text-slate-800">
                        Bs. {m.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isConciliated
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isConciliated ? 'CONCILIADO ✓' : 'PENDIENTE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Fase 4: Auto-detección de Comisiones e IGTF */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Fase 4: Débitos Bancarios con Generación Automática de Gasto</h4>
            <p className="text-xs text-slate-500">Detección léxica mediante RegEx de IGTF Bancario y Comisiones POS con Crédito Fiscal IVA</p>
          </div>
          <span className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 font-bold rounded-full">2 Gastos Identificados</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
            <div className="flex justify-between items-center font-bold text-slate-800">
              <span>CARGO IGTF BANCARIO (Transacción Divisas)</span>
              <span className="text-rose-600 font-mono">Bs. 1,500.00</span>
            </div>
            <p className="text-slate-500">Asiento sugerido: Débito a <code className="font-mono bg-slate-200 px-1 rounded">6.1.02.01.02.000 Gastos Impuesto IGTF Bancario</code> (Gasto no deducible) contra Banco.</p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
            <div className="flex justify-between items-center font-bold text-slate-800">
              <span>COMISIÓN PUNTO DE VENTA (Liquidación)</span>
              <span className="text-rose-600 font-mono">Bs. 116.00</span>
            </div>
            <p className="text-slate-500">Desglose Fiscal: Base Comisión <code className="font-mono">Bs. 100.00</code> + Crédito Fiscal IVA 16% <code class="font-mono">Bs. 16.00</code> registrado automáticamente.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
