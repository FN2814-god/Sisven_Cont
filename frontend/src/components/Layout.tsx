import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

type NavItem =
  | { to: string; label: string; roles: readonly string[] }
  | { section: string; roles?: readonly string[] };

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', roles: ['ADMIN', 'CONTADOR', 'CONSULTA'] },
  { to: '/ventas', label: 'Ventas', roles: ['ADMIN', 'CONTADOR', 'CONSULTA'] },
  { to: '/compras', label: 'Compras', roles: ['ADMIN', 'CONTADOR', 'CONSULTA'] },
  { to: '/fiscal', label: 'Libros SENIAT', roles: ['ADMIN', 'CONTADOR', 'CONSULTA'] },
  { section: 'Contabilidad' },
  { to: '/contabilidad/plan-cuentas', label: 'Plan de Cuentas', roles: ['ADMIN', 'CONTADOR', 'CONSULTA'] },
  { to: '/contabilidad/diario', label: 'Libro Diario', roles: ['ADMIN', 'CONTADOR', 'CONSULTA'] },
  { to: '/contabilidad/asientos', label: 'Asientos Manuales', roles: ['ADMIN', 'CONTADOR'] },
  { to: '/contabilidad/mayor', label: 'Libro Mayor', roles: ['ADMIN', 'CONTADOR', 'CONSULTA'] },
  { to: '/contabilidad/balance-comprobacion', label: 'Balance de Comprobación', roles: ['ADMIN', 'CONTADOR', 'CONSULTA'] },
  { to: '/contabilidad/estados', label: 'Estados Financieros', roles: ['ADMIN', 'CONTADOR', 'CONSULTA'] },
  { to: '/contabilidad/periodos', label: 'Períodos Fiscales', roles: ['ADMIN', 'CONTADOR', 'CONSULTA'] },
  { section: 'Tesorería' },
  { to: '/bancos', label: 'Conciliación Bancaria', roles: ['ADMIN', 'CONTADOR', 'CONSULTA'] },
  { section: 'Administración', roles: ['ADMIN'] },
  { to: '/admin/empresas', label: 'Empresas', roles: ['ADMIN'] },
  { to: '/admin/usuarios', label: 'Usuarios', roles: ['ADMIN'] },
];

export default function Layout() {
  const { user, tenants, tenant, selectTenant, logout, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500">Cargando sesión…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 text-slate-200 flex flex-col no-print">
        <div className="px-4 py-5 flex items-center space-x-3 border-b border-slate-700">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white">SC</div>
          <div>
            <p className="font-bold text-white text-sm">Sisven Cont</p>
            <p className="text-[10px] text-slate-400">VEN-NIF PYME · SENIAT</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map((item, i) => {
            if ('section' in item) {
              if (item.roles && !item.roles.includes(user.role)) return null;
              return (
                <p key={i} className="text-[10px] uppercase tracking-wider text-slate-500 font-bold px-3 pt-4 pb-1">
                  {item.section}
                </p>
              );
            }
            if (!item.roles.includes(user.role)) return null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-700 text-xs text-slate-400">
          <p className="font-semibold text-slate-200 truncate">{user.full_name}</p>
          <p className="truncate">{user.email}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold uppercase">{user.role}</span>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between no-print">
          <div className="flex items-center space-x-3">
            <label className="text-xs font-semibold text-slate-500 uppercase">Empresa</label>
            <select
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium bg-white"
              value={tenant?.tenant_id ?? ''}
              onChange={(e) => selectTenant(e.target.value)}
            >
              <option value="" disabled>Seleccione empresa…</option>
              {tenants.map((t) => (
                <option key={t.tenant_id} value={t.tenant_id}>{t.razon_social} ({t.rif})</option>
              ))}
            </select>
            {tenant?.es_contribuyente_especial && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                SPE · Retiene IVA {tenant.porcentaje_retencion_iva}%
              </span>
            )}
          </div>
          <button onClick={logout} className="text-sm text-slate-500 hover:text-red-600 font-medium">
            Cerrar sesión
          </button>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          {!tenant ? (
            <div className="max-w-lg mx-auto mt-20 bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
              <h2 className="text-lg font-bold">Seleccione una empresa</h2>
              <p className="text-sm text-slate-500 mt-2">
                Elija una empresa en el selector superior para comenzar a trabajar.
              </p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
