import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import OnboardingPage from './pages/Onboarding';
import DashboardPage from './pages/Dashboard';
import SalesPage from './pages/Sales';
import PurchasesPage from './pages/Purchases';
import FiscalPage from './pages/Fiscal';
import ChartPage from './pages/ChartOfAccounts';
import JournalPage from './pages/Journal';
import NewEntryPage from './pages/NewEntry';
import LedgerPage from './pages/Ledger';
import TrialBalancePage from './pages/TrialBalance';
import StatementsPage from './pages/Statements';
import PeriodsPage from './pages/Periods';
import BanksPage from './pages/Banks';
import AdminUsersPage from './pages/admin/Users';
import AdminTenantsPage from './pages/admin/Tenants';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="ventas" element={<SalesPage />} />
        <Route path="compras" element={<PurchasesPage />} />
        <Route path="fiscal" element={<FiscalPage />} />
        <Route path="contabilidad/plan-cuentas" element={<ChartPage />} />
        <Route path="contabilidad/diario" element={<JournalPage />} />
        <Route path="contabilidad/asientos" element={<NewEntryPage />} />
        <Route path="contabilidad/mayor" element={<LedgerPage />} />
        <Route path="contabilidad/balance-comprobacion" element={<TrialBalancePage />} />
        <Route path="contabilidad/estados" element={<StatementsPage />} />
        <Route path="contabilidad/periodos" element={<PeriodsPage />} />
        <Route path="bancos" element={<BanksPage />} />
        <Route path="admin/usuarios" element={<AdminUsersPage />} />
        <Route path="admin/empresas" element={<AdminTenantsPage />} />
      </Route>
    </Routes>
  );
}
