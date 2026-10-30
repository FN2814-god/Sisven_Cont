import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, apiError } from '../api/client';
import { isValidRif } from '../lib/format';
import { btnPrimary, btnSecondary, inputCls, ErrorBox } from '../components/ui';

/** Wizard de 3 pasos: creación de la primera empresa */
export default function OnboardingPage() {
  const { user, refreshMe, selectTenant } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    rif: '', razon_social: '', nombre_comercial: '',
    es_contribuyente_especial: false, porcentaje_retencion_iva: 75,
  });

  if (!user) { nav('/login'); return null; }

  const rifOk = isValidRif(form.rif);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (step < 3) return setStep(step + 1);
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post('/tenants', form);
      await refreshMe();
      selectTenant(data.tenant_id);
      nav('/', { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white">
          <h1 className="text-xl font-bold">Bienvenido a Sisven Cont</h1>
          <p className="text-xs text-blue-100 mt-1">Asistente de Configuración Inicial · Paso {step} de 3</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">
          <ErrorBox message={error} />

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-bold">1. Identificación de la Empresa</h2>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">RIF (ej. J-00006372-9)</span>
                <input className={inputCls + ' mt-1'} value={form.rif} required
                  onChange={(e) => setForm({ ...form, rif: e.target.value })} />
                {form.rif && !rifOk && (
                  <span className="text-xs text-red-600">RIF inválido (dígito verificador Módulo 11)</span>
                )}
                {form.rif && rifOk && <span className="text-xs text-emerald-600">RIF válido</span>}
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Razón Social</span>
                <input className={inputCls + ' mt-1'} value={form.razon_social} required
                  onChange={(e) => setForm({ ...form, razon_social: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Nombre Comercial (opcional)</span>
                <input className={inputCls + ' mt-1'} value={form.nombre_comercial}
                  onChange={(e) => setForm({ ...form, nombre_comercial: e.target.value })} />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-bold">2. Condición Tributaria ante el SENIAT</h2>
              <label className="flex items-center space-x-3">
                <input type="checkbox" checked={form.es_contribuyente_especial}
                  onChange={(e) => setForm({ ...form, es_contribuyente_especial: e.target.checked })}
                  className="w-4 h-4" />
                <span className="text-sm">Es Sujeto Pasivo Especial (SPE) — Agente de Retención de IVA</span>
              </label>
              {form.es_contribuyente_especial && (
                <label className="block max-w-xs">
                  <span className="text-xs font-semibold text-slate-600">% de Retención de IVA</span>
                  <select className={inputCls + ' mt-1'} value={form.porcentaje_retencion_iva}
                    onChange={(e) => setForm({ ...form, porcentaje_retencion_iva: +e.target.value })}>
                    <option value={75}>75% (general)</option>
                    <option value={100}>100%</option>
                  </select>
                </label>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-bold">3. Confirmación</h2>
              <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
                <p><b>RIF:</b> {form.rif}</p>
                <p><b>Razón Social:</b> {form.razon_social}</p>
                <p><b>SPE:</b> {form.es_contribuyente_especial ? `Sí (${form.porcentaje_retencion_iva}%)` : 'No'}</p>
                <p className="text-xs text-slate-500 pt-2">
                  Se creará automáticamente el Plan de Cuentas estándar VEN-NIF PYME
                  y los períodos fiscales del ejercicio en curso.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button type="button" className={btnSecondary} disabled={step === 1}
              onClick={() => setStep(step - 1)}>Anterior</button>
            <button className={btnPrimary} disabled={busy || (step === 1 && !rifOk)}>
              {step < 3 ? 'Siguiente' : busy ? 'Creando…' : 'Crear Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
