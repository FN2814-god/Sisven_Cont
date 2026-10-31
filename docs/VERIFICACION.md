# Verificación del despliegue — Sisven Cont

Checklist para confirmar que el sistema quedó **perfectamente instalado** en el VPS. Hazla después de seguir [`DEPLOY.md`](DEPLOY.md). Cada ítem tiene su criterio de éxito — si algo falla, consulta la sección de troubleshooting en DEPLOY.md.

> 🔐 **Importante**: los contadores **no pueden registrarse solos**. No existe registro público en el sistema (a propósito, por seguridad). El administrador crea cada usuario y le entrega sus credenciales.

---

## Fase 0 — Antes de empezar

- ☐ El subdominio resuelve a la IP del VPS: `ping sisven.tudominio.com` responde.
- ☐ Tienes acceso SSH con sudo al servidor.
- ☐ `scripts/setup-vps.sh` ya corrió y `backend/.env` tiene `SEED_ADMIN_*` definitivos.

## Fase 1 — Infraestructura (en el VPS)

```bash
cd sisven
./scripts/verify-deploy.sh
```

- ☐ El script termina con **0 FAIL** (los SKIP por herramientas aún no instaladas son aceptables si aún no configuras nginx/ufw).
- ☐ `pm2 logs sisven` muestra `Sisven Cont API ejecutándose...` sin errores.
- ☐ `pm2 startup` fue ejecutado (la app sobrevive reinicios del servidor).

## Fase 2 — HTTP público (desde tu PC/laptop)

```bash
URL=https://sisven.tudominio.com \
ADMIN_EMAIL=tu-correo@admin.com ADMIN_PASSWORD='tu-clave' \
./scripts/verify-deploy.sh
```

- ☐ Todos los checks HTTP en PASS.
- ☐ El navegador muestra el **candado HTTPS** en `https://sisven.tudominio.com`.
- ☐ `http://sisven.tudominio.com` redirige automáticamente a `https://`.

## Fase 3 — Prueba E2E completa (instancia desechable)

El `smoke-test.sh` ejecuta **38 verificaciones** de todas las funcionalidades (ventas, compras, retenciones IVA/ISLR, archivos SENIAT, reportes, conciliación bancaria, roles, multi-empresa). **Pero escribe datos**, así que corre contra una copia desechable — el mismo código compilado, otro puerto y otra base de datos. **Producción no se toca.**

En el VPS:

```bash
cd sisven/backend

# 1) Segunda instancia: puerto 3001, DB temporal en /tmp
PORT=3001 SQLITE_FILE=/tmp/sisven-prueba.db \
  SEED_ADMIN_EMAIL=prueba@test.local SEED_ADMIN_PASSWORD='Prueba123!' \
  node dist/main.js &
sleep 3

# 2) Las 38 verificaciones
API_URL=http://localhost:3001/api/v1 \
  ADMIN_EMAIL=prueba@test.local ADMIN_PASSWORD='Prueba123!' \
  ../scripts/smoke-test.sh

# 3) Apagar y borrar la instancia de prueba
kill %1 && rm -f /tmp/sisven-prueba.db
```

- ☐ Resultado: `38 PASS · 0 FAIL`.
- ☐ Producción intacta: `pm2 logs sisven` sin actividad nueva, `backend/data/sisven.db` solo con tu empresa real.

> Las variables de entorno del comando pisan las del `.env` — por eso la instancia desechable usa otra DB, otro puerto y otro admin sin tocar tu configuración.

## Fase 4 — Navegador (flujo real de usuarios)

- ☐ **Login admin**: `https://sisven.tudominio.com` → entra con `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` → llega al onboarding.
- ☐ **Onboarding**: crea la empresa real → el plan de cuentas VEN-NIF PYME (112 cuentas) y los 12 períodos fiscales se generan solos.
- ☐ **Crear contador**: Administración → Usuarios → Nuevo → rol `CONTADOR`, marcar la empresa → guardar.
- ☐ **Entrar como contador**: cierra sesión, entra con las credenciales del contador → ve la empresa, puede registrar operaciones, **no** ve el módulo de administración de usuarios.
- ☐ **Crear consultor**: mismo paso con rol `CONSULTA` → entra, navega y consulta, pero **no** puede crear nada (la API responde 403 si intenta).
- ☐ **Sesión**: cerrar sesión funciona; volver a entrar funciona.

## Fase 5 — Seguridad

- ☐ `curl http://IP-DEL-VPS:3000/` desde **otra red** (tu casa) → falla/timeout. Solo 80/443 abiertos.
- ☐ `https://sisven.tudominio.com/.env` → **no devuelve nada** (404). Igual para `/backend/.env` y `/data/sisven.db`.
- ☐ `https://sisven.tudominio.com/api/v1/health` → `{"status":"ok"}` sin datos sensibles.
- ☐ Login con clave errónea → error genérico 401, sin filtrar si el usuario existe.
- ☐ `JWT_SECRET` del servidor ≠ al del ejemplo; `SEED_ADMIN_PASSWORD` es fuerte y única.
- ☐ `ls -l backend/.env` → permisos `640` o más estrictos: `chmod 640 backend/.env` si no.
- ☐ El repo en GitHub está **privado** (versiones viejas tenían un `.env` en el historial).

## Fase 6 — Go-live / entrega

- ☐ Backup automático configurado (cron en DEPLOY.md sección 9).
- ☐ Credenciales de los contadores entregadas por canal seguro (no por chat en claro si es posible).
- ☐ Confirmado: **nadie corrió** `seed-demo.mjs` ni `smoke-test.sh` contra la base de producción (el smoke va solo en la instancia desechable de la Fase 3).
- ☐ URL final compartida: `https://sisven.tudominio.com`.

---

### Resumen rápido de comandos

| Qué | Comando |
|---|---|
| Verificación local completa | `./scripts/verify-deploy.sh` (en el VPS) |
| Verificación remota | `URL=https://... ADMIN_*=... ./scripts/verify-deploy.sh` |
| E2E 38 checks (desechable) | bloque de la Fase 3 |
| Logs de la app | `pm2 logs sisven` |
| Estado del servicio | `pm2 status` |
| Reiniciar | `pm2 restart sisven` |
