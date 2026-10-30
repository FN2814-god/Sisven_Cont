# Sisven Cont — Sistema Contable y Tributario Multi-empresa (VEN-NIF PYME / SENIAT)

Plataforma contable para empresas en Venezuela, adaptada a **VEN-NIF PYME (BA VEN-NIF 8)** y a las providencias del **SENIAT** (**PA SNAT/2011/00071**, **PA SNAT/2024/000102**, **PA SNAT/2025/000054**, **Decreto 1808** y **Ley IGTF**).

Contabilidad en **partida doble bimoneda** (Bs. y USD a tasa BCV), multi-empresa con usuarios y tres roles fijos (`ADMIN`, `CONTADOR`, `CONSULTA`), y exportación directa de los archivos oficiales del SENIAT.

> ⚠️ Herramienta de soporte contable. Antes de uso en producción debe ser validada por un contador público colegiado frente a la normativa vigente.

---

## Arquitectura

Monorepo TypeScript full-stack:

```
├── backend/           # API REST NestJS + TypeORM (SQLite por defecto / PostgreSQL opcional)
│   └── src/
│       ├── entities/         # Modelo relacional multi-tenant
│       ├── shared/           # Motores contables y fiscales (dominio puro, portado de legacy/src)
│       ├── modules/          # auth, tenants, users, accounting, reports, sales,
│       │                     # purchases, retentions, banks, stats
│       └── database/         # Plan de cuentas VEN-NIF PYME + seeds
├── frontend/          # SPA React 19 + Vite + Tailwind 4 (login, onboarding, dashboard, módulos)
├── docs/              # Especificaciones funcionales originales (Documento1/2.pdf)
└── legacy/            # Prototipo anterior (server.py, index/dashboard.html, motores TS, tests .mjs)
```

- **API**: `http://localhost:3000/api/v1` (JWT + cabecera `X-Tenant-Id`).
- **Frontend**: Vite dev server con proxy a la API (`http://localhost:5173`).

## Inicio rápido

```bash
npm install                      # instala workspaces backend + frontend
cp .env.example backend/.env     # configuración (SQLite por defecto)
npm run dev                      # levanta backend (3000) y frontend (5173) a la vez
```

1. Abre `http://localhost:5173`.
2. Inicia sesión con el administrador sembrado: `admin@sisven.local` / `Admin123!` (configurable vía `SEED_ADMIN_*`).
3. En el primer acceso, el onboarding crea la empresa; el **plan de cuentas VEN-NIF PYME (112 cuentas)** y los 12 períodos fiscales se generan automáticamente.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Backend (NestJS watch) + frontend (Vite) en paralelo |
| `npm run build` | Compila backend (`tsc` → `dist/`) y frontend (Vite → `dist/`) |
| `npm test` | Suite Jest del backend (motores fiscales, contables y reportes) |
| `npm start` | Sirve el backend compilado en producción |

## Configuración (`.env` en `backend/`)

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del API (def. `3000`) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Firma de tokens |
| `DB_TYPE` | `sqlite` (def.) ó `postgres` |
| `SQLITE_FILE` | Ruta del archivo SQLite (def. `./data/sisven.db`) |
| `DB_SYNC` | `true` sincroniza el esquema (desarrollo; en producción usar migraciones) |
| `DATABASE_URL` ó `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` | Conexión PostgreSQL |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Credenciales del administrador inicial |

## Funcionalidades

- **Núcleo contable**: plan de cuentas jerárquico de 6 niveles, comprobantes bimoneda con cuadre obligatorio, períodos fiscales con cierre/reapertura, anulación de asientos.
- **Reportes**: Libro Diario, Libro Mayor, Balance de Comprobación, Balance General (verifica `Activo = Pasivo + Patrimonio`) y Estado de Resultados.
- **Ventas**: libro de ventas con correlativo, IGTF 3%, asiento automático.
- **Compras**: libro de compras con crédito fiscal, retenciones de IVA (75%/100% si la empresa es SPE) e ISLR (Decreto 1808 con sustraendo), comprobante de retención de 14 dígitos.
- **SENIAT**: TXT de retenciones de IVA (16 campos tabulados) y XML de retenciones de ISLR descargables por período.
- **Bancos**: conciliación en 4 fases (exacta, numérica-temporal, cruce fiscal banco-factura, detección automática de IGTF y comisiones) con alertas de riesgo fiscal.
- **Tasa BCV**: consulta automática al servicio oficial con fallback a tasa manual por empresa.

## Pruebas

```bash
npm test
```

14 pruebas Jest cubren: validación de RIF (Módulo 11), conversión/redondeo BCV, retenciones IVA e ISLR, generación TXT/XML, partida doble, conciliación 4 fases y cuadre de los reportes con SQLite en memoria.

## Pruebas end-to-end y datos de demostración

```bash
./scripts/smoke-test.sh          # suite de 38 verificaciones vía API (backend debe estar arriba)
node scripts/seed-demo.mjs       # carga la empresa demo "Distribuidora El Roble, C.A." con datos realistas
./scripts/reset-demo-banco.sh    # revierte la conciliación bancaria a PENDIENTE (para re-grabar demos)
```

> `smoke-test.sh` crea empresas temporales de verificación ("Smoke Test CA"): usarlo sobre una base de datos de pruebas o antes de cargar la demo.

Documentación auxiliar:

- [`docs/CHECKLIST_PRUEBAS.md`](docs/CHECKLIST_PRUEBAS.md) — validación manual pantalla por pantalla.
- [`docs/GUION_VIDEO.md`](docs/GUION_VIDEO.md) — guion de demostración comercial (~5 min) con narración literal.
