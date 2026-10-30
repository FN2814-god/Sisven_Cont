import type { ReactNode } from 'react';

export function Card({ title, children, actions }: {
  title?: string; children: ReactNode; actions?: ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      {(title || actions) && (
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          {title && <h3 className="font-bold text-slate-900 text-sm">{title}</h3>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Field({ label, children, hint }: {
  label: string; children: ReactNode; hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

export const btnPrimary =
  'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50';
export const btnSecondary =
  'px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors';
export const btnDanger =
  'px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-colors';

export const thCls = 'text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide px-3 py-2';
export const tdCls = 'px-3 py-2 text-sm text-slate-700 border-t border-slate-100';

export function ErrorBox({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
      {message}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-400 text-center py-6">{children}</p>;
}
