"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDataSourceOptions = buildDataSourceOptions;
const path_1 = require("path");
const fs_1 = require("fs");
function buildDataSourceOptions() {
    const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
    const synchronize = process.env.DB_SYNC === 'true';
    const entities = [(0, path_1.join)(__dirname, '..', 'entities', '*.entity.{ts,js}')];
    const logging = process.env.DB_LOGGING === 'true';
    if (dbType === 'postgres' || dbType === 'postgresql') {
        const url = process.env.DATABASE_URL;
        const base = {
            type: 'postgres',
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
    (0, fs_1.mkdirSync)((0, path_1.join)(process.cwd(), file, '..'), { recursive: true });
    return {
        type: 'better-sqlite3',
        database: (0, path_1.join)(process.cwd(), file),
        entities,
        synchronize,
        logging,
    };
}
//# sourceMappingURL=typeorm.config.js.map