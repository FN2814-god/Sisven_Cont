export const fmtVes = (n: number | null | undefined) =>
  `Bs. ${(n ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtUsd = (n: number | null | undefined) =>
  `$${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtRate = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export const fmtDate = (d?: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('es-VE') : '—';

/** Validador local de RIF (Módulo 11) — espejo del backend */
export function isValidRif(rif: string): boolean {
  const cleaned = rif.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!/^[VEJPGC]\d{9}$/.test(cleaned)) return false;
  const prefixValues: Record<string, number> = { V: 1, E: 2, J: 3, P: 4, G: 5, C: 6 };
  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  const body = cleaned.substring(1, 9);
  let sum = prefixValues[cleaned[0]] * 4;
  for (let i = 0; i < 8; i++) sum += parseInt(body[i], 10) * weights[i];
  const rem = sum % 11;
  const expected = rem <= 1 ? 0 : 11 - rem;
  return expected === parseInt(cleaned[9], 10);
}
