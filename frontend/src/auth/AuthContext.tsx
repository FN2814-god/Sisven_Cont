import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';

export interface Tenant {
  tenant_id: string;
  rif: string;
  razon_social: string;
  nombre_comercial?: string;
  es_contribuyente_especial: boolean;
  porcentaje_retencion_iva: number;
  tasa_bcv_manual?: number | null;
}

export interface SessionUser {
  sub: string;
  email: string;
  role: 'ADMIN' | 'CONTADOR' | 'CONSULTA';
  full_name: string;
}

interface AuthState {
  user: SessionUser | null;
  tenants: Tenant[];
  tenant: Tenant | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: SessionUser; tenants: Tenant[] }>;
  logout: () => void;
  selectTenant: (tenantId: string) => void;
  refreshMe: () => Promise<void>;
}

const Ctx = createContext<AuthState>(null as unknown as AuthState);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(
    localStorage.getItem('sisven_tenant'),
  );
  const [loading, setLoading] = useState(!!localStorage.getItem('sisven_token'));

  const applyMe = useCallback((data: any) => {
    setUser({ sub: data.user_id ?? data.sub, email: data.email, role: data.role, full_name: data.full_name });
    setTenants(data.tenants ?? []);
    const stored = localStorage.getItem('sisven_tenant');
    if (stored && !(data.tenants ?? []).some((t: Tenant) => t.tenant_id === stored)) {
      localStorage.removeItem('sisven_tenant');
      setTenantId(null);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    applyMe(data);
  }, [applyMe]);

  useEffect(() => {
    if (!localStorage.getItem('sisven_token')) return;
    refreshMe().catch(() => undefined).finally(() => setLoading(false));
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('sisven_token', data.access_token);
    setUser(data.user);
    setTenants(data.tenants ?? []);
    return { user: data.user, tenants: data.tenants ?? [] };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sisven_token');
    localStorage.removeItem('sisven_tenant');
    setUser(null);
    setTenants([]);
    setTenantId(null);
    window.location.href = '/login';
  }, []);

  const selectTenant = useCallback((id: string) => {
    localStorage.setItem('sisven_tenant', id);
    setTenantId(id);
  }, []);

  const tenant = useMemo(
    () => tenants.find((t) => t.tenant_id === tenantId) ?? null,
    [tenants, tenantId],
  );

  const value = useMemo(
    () => ({ user, tenants, tenant, loading, login, logout, selectTenant, refreshMe }),
    [user, tenants, tenant, loading, login, logout, selectTenant, refreshMe],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
