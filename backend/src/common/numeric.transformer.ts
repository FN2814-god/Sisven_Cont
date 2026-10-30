import { ValueTransformer } from 'typeorm';

/**
 * Normaliza columnas DECIMAL entre dialectos: PostgreSQL devuelve strings,
 * SQLite devuelve números. Siempre expone `number` a la aplicación.
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | number | null) =>
    value === null || value === undefined ? null : parseFloat(String(value)),
};

export const decimalColumn = (precision = 18, scale = 2) =>
  ({ type: 'decimal', precision, scale, transformer: numericTransformer }) as const;
