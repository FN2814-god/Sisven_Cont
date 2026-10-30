import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PosModule } from './PosModule';
import { SeniatFiscalModule } from './SeniatFiscalModule';
import { BankReconciliationModule } from './BankReconciliationModule';
import { BcvExchangeService } from '../seniat/bcv-service';

export interface TenantInfo {
  id: string;
  name: string;
  rif: string;
  isSpecialTaxpayer: boolean;
  vatRetentionRate: number; // 75.00 | 100.00 | 0.00
  salesMonthVes: number;
  retVatMonthVes: number;
}

export const SEED_TENANTS: Record<string, TenantInfo> = {
  'tenant-1': {
    id: 'tenant-1',
    name: 'Comercializadora El Sol C.A.',
    rif: 'J-30012345-0',
    isSpecialTaxpayer: true,
    vatRetentionRate: 75.0,
    salesMonthVes: 328500.0,
    retVatMonthVes: 39420.0,
  },
  'tenant-2': {
    id: 'tenant-2',
    name: 'Distribuidora Llanera C.A.',
    rif: 'J-40987654-2',
    isSpecialTaxpayer: false,
    vatRetentionRate: 0.0,
    salesMonthVes: 182500.0,
    retVatMonthVes: 0.0,
  },
  'tenant-3': {
    id: 'tenant-3',
    name: 'Servicios Industriales Tuy S.A.',
    rif: 'J-31122334-9',
    isSpecialTaxpayer: true,
    vatRetentionRate: 100.0,
    salesMonthVes: 450000.0,
    retVatMonthVes: 72000.0,
  },
};

export const SisvenDashboard: React.FC = () => {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('tenant-1');
  const [activeTab, setActiveTab] = useState<'pos' | 'seniat' | 'bank'>('pos');
  const [bcvRate, setBcvRate] = useState<number>(36.5);
  const [lastBcvUpdate, setLastBcvUpdate] = useState<string>('');
  const [isLoadingBcv, setIsLoadingBcv] = useState<boolean>(false);
  const [isBcvLive, setIsBcvLive] = useState<boolean>(false);

  const fetchRate = useCallback(async () => {
    setIsLoadingBcv(true);
    try {
      const result = await BcvExchangeService.fetchOfficialRate();
      setBcvRate(result.rate);
      setIsBcvLive(true);
      if (result.updatedAt) {
        const d = new Date(result.updatedAt);
        setLastBcvUpdate(d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.warn('Usando tasa fallback de BCV:', err);
      setIsBcvLive(false);
    } finally {
      setIsLoadingBcv(false);
    }
  }, []);

  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  const currentTenant = useMemo(() => SEED_TENANTS[selectedTenantId], [selectedTenantId]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased">
      {/* 1. BARRA SUPERIOR MULTI-TENANT */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/20">
                SC
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg text-slate-900 tracking-tight">Sisven Cont</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold border border-blue-200">
                    SaaS VEN-NIF
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">Motor Contable & Plataforma Tributaria SENIAT</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Widget Tasa Oficial BCV conectada a DolarApi */}
              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 shadow-inner space-x-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isBcvLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                  title={isBcvLive ? 'Sincronizado en vivo con DolarApi / BCV' : 'Tasa local / Modo offline'}
                />
                <div className="text-xs">
                  <span className="text-slate-500 font-medium hidden sm:inline">BCV Oficial:</span>
                  <span className="font-bold text-slate-800 ml-1">{bcvRate.toFixed(2)} VES/USD</span>
                  {lastBcvUpdate && (
                    <span className="text-[10px] text-slate-400 ml-1 hidden md:inline">({lastBcvUpdate})</span>
                  )}
                </div>
                <button
                  onClick={fetchRate}
                  disabled={isLoadingBcv}
                  title="Sincronizar tasa en vivo desde ve.dolarapi.com"
                  className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-blue-600 transition-colors"
                >
                  <svg
                    className={`w-3.5 h-3.5 ${isLoadingBcv ? 'animate-spin text-blue-600' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>

              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="bg-white border border-slate-300 text-slate-700 text-xs sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 font-medium shadow-sm cursor-pointer"
              >
                {Object.values(SEED_TENANTS).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.rif}) [{t.isSpecialTaxpayer ? `SPE ${t.vatRetentionRate}%` : 'Ordinario'}]
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* 2. KPIS FINANCIEROS Y FISCALES */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Ventas Netas (Mes)</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              Bs. {currentTenant.salesMonthVes.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-blue-600 font-medium mt-1">
              ≈ USD ${(currentTenant.salesMonthVes / bcvRate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Retenciones IVA por Enterar</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">
              Bs. {currentTenant.retVatMonthVes.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Declaración Quincenal SENIAT</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Movimientos por Conciliar</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">3 partidas</h3>
            <p className="text-xs text-rose-600 font-medium mt-1">1 Alerta de Riesgo Fiscal</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Régimen Tributario Activo</p>
            <h3 className="text-lg font-bold text-emerald-700 mt-1">
              {currentTenant.isSpecialTaxpayer ? 'Contribuyente Especial' : 'Contribuyente Ordinario'}
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-1">
              {currentTenant.isSpecialTaxpayer ? `Retención: ${currentTenant.vatRetentionRate}% IVA` : 'Sin retención'}
            </p>
          </div>
        </section>

        {/* NAVEGACIÓN DE PESTAÑAS */}
        <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 shadow-sm">
          <nav className="flex space-x-6">
            <button
              onClick={() => setActiveTab('pos')}
              className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pos'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              1. Facturación Rápida & Asiento Automático
            </button>
            <button
              onClick={() => setActiveTab('seniat')}
              className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'seniat'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              2. Módulo Fiscal SENIAT (Libros & Exportaciones)
            </button>
            <button
              onClick={() => setActiveTab('bank')}
              className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'bank'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              3. Conciliación Bancaria Automática
            </button>
          </nav>
        </div>

        {/* CONTENIDO DE PESTAÑAS */}
        {activeTab === 'pos' && <PosModule bcvRate={bcvRate} currentTenant={currentTenant} />}
        {activeTab === 'seniat' && <SeniatFiscalModule />}
        {activeTab === 'bank' && <BankReconciliationModule bcvRate={bcvRate} />}
      </main>
    </div>
  );
};
