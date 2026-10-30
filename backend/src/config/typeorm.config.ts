import { DataSourceOptions } from 'typeorm';
import { join } from 'path';
import { mkdirSync } from 'fs';

/**
 * Configuración dual: SQLite (desarrollo/local) o PostgreSQL (producción).
 * Se selecciona con DB_TYPE en el entorno.
 */
export function buildDataSourceOptions(): DataSourceOptions {
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const synchronize = process.env.DB_SYNC === 'true';
  const entities = [join(__dirname, '..', 'entities', '*.entity.{ts,js}')];
  const logging = process.env.DB_LOGGING === 'true';

  if (dbType === 'postgres' || dbType === 'postgresql') {
    const url = process.env.DATABASE_URL;
    const base = {
      type: 'postgres' as const,
      entities,
      synchronize,
      logging,
    };
    return url
      ? { ...base, url }
      : {
          ...base,
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USER || 'sisven',
          password: process.env.DB_PASSWORD || 'sisven',
          database: process.env.DB_NAME || 'sisven',
        };
  }

  const file = process.env.SQLITE_FILE || './data/sisven.db';
  mkdirSync(join(process.cwd(), file, '..'), { recursive: true });
  return {
    type: 'better-sqlite3',
    database: join(process.cwd(), file),
    entities,
    synchronize,
    logging,
  } as DataSourceOptions;
}
