import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiError } from '../api/client';
import { btnPrimary, inputCls, ErrorBox } from '../components/ui';

export default function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      nav('/', { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-2xl">SC</div>
          <div>
            <h1 className="text-xl font-bold">Sisven Cont</h1>
            <p className="text-xs text-blue-100">Sistema Contable y Tributario · VEN-NIF PYME · SENIAT</p>
          </div>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <ErrorBox message={error} />
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Correo electrónico</span>
            <input className={inputCls + ' mt-1'} type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="usuario@empresa.com" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Contraseña</span>
            <input className={inputCls + ' mt-1'} type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className={btnPrimary + ' w-full'} disabled={busy}>
            {busy ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
