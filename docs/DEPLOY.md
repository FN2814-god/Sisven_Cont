# Despliegue en VPS — Sisven Cont

Guía paso a paso para montar el sistema en un servidor propio y exponerlo con dominio + HTTPS.

**Lo que vas a montar**: un solo proceso (backend NestJS, puerto 3000) que sirve la API (`/api/v1`) y la aplicación web completa. Base de datos SQLite — no hay que instalar ningún motor de base de datos.

---

## 1. Requisitos

- VPS con **Ubuntu 22.04 o 24.04** (1–2 GB RAM es suficiente).
- Acceso **SSH con sudo**.
- Un dominio con posibilidad de crear un **registro A** (ej: `sisven.tudominio.com`).

## 2. DNS

En el panel de tu proveedor de dominio, crea un registro:

```
Tipo: A
Nombre: sisven        (o el subdominio que prefieras)
Valor:  <IP-DEL-VPS>
TTL:    300
```

Verifica que resuelva antes de seguir: `ping sisven.tudominio.com`.

## 3. Instalación

Conéctate al VPS por SSH y ejecuta:

```bash
git clone https://github.com/<usuario>/Sisven_Cont.git sisven
cd sisven
./scripts/setup-vps.sh
```

El script instala Node.js 22, PM2 y las herramientas de compilación, crea `backend/.env` con un `JWT_SECRET` aleatorio, compila todo y levanta el servicio. Es idempotente: se puede correr de nuevo sin problema.

## 4. Configurar `backend/.env`

**Antes de entrar al sistema por primera vez**, edita las credenciales del administrador:

```bash
nano backend/.env
```

| Variable | Qué poner |
|---|---|
| `JWT_SECRET` | Ya viene generado por el script. No tocar. |
| `SEED_ADMIN_EMAIL` | El correo del administrador real (ej: `admin@tuempresa.com`). |
| `SEED_ADMIN_PASSWORD` | Una clave fuerte. **Cámbiala: la del ejemplo es pública.** |
| `PORT` | `3000` (dejar así; nginx hace de puerta de entrada). |
| `DB_TYPE` / `SQLITE_FILE` | `sqlite` / `./data/sisven.db` — dejar así. |
| `DB_SYNC` | `true` — crea las tablas automáticamente en el primer arranque. |

> ⚠️ El usuario admin se crea **solo en el primer arranque** (cuando la tabla de usuarios está vacía). Si arrancaste antes de editar, ver "Resetear la base de datos" en la sección 9.

Si cambiaste el `.env`, reinicia: `pm2 restart sisven`.

## 5. Verificar que corre

```bash
pm2 logs sisven        # debe mostrar "Sisven Cont API ejecutándose..."
curl localhost:3000/   # debe devolver HTML (la página de login)
./scripts/verify-deploy.sh   # verificación automática completa (no destructiva)
```

👉 **Checklist completa de verificación**: [`VERIFICACION.md`](VERIFICACION.md) — incluye la prueba E2E de 38 checks en instancia desechable y el checklist de seguridad.

## 6. nginx + Certbot (HTTPS)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Edita el dominio en la plantilla antes de copiarla:
nano deploy/nginx-sisven.conf      # reemplaza sisven.TUDOMINIO.COM

sudo cp deploy/nginx-sisven.conf /etc/nginx/sites-available/sisven
sudo ln -s /etc/nginx/sites-available/sisven /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Certificado HTTPS gratuito (Let's Encrypt):
sudo certbot --nginx -d sisven.tudominio.com
```

Listo. **La URL para los contadores es `https://sisven.tudominio.com`** — la app y la API viven en la misma dirección.

## 7. Firewall (recomendado)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable          # responde "y"
sudo ufw status
```

El puerto 3000 queda cerrado al exterior; solo nginx accede a él localmente.

## 8. Primer uso (sistema limpio)

1. Abre `https://sisven.tudominio.com` e inicia sesión con `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
2. El **onboarding** te pedirá los datos de la empresa real. Al crearla, el sistema genera automáticamente el plan de cuentas VEN-NIF PYME y los 12 períodos fiscales del año — eso es configuración propia del sistema, no datos de prueba.
3. En **Administración → Usuarios**, crea un usuario para cada contador:
   - Rol `CONTADOR`: puede registrar operaciones.
   - Rol `CONSULTA`: solo lectura (recomendado si solo van a revisar).
4. Comparte la URL y las credenciales de cada usuario.

> � **No hay registro público**: nadie puede crearse una cuenta desde internet — solo el admin crea usuarios. Es a propósito, por seguridad.

> �🚫 **NO ejecutes** `scripts/seed-demo.mjs` ni `scripts/smoke-test.sh` — cargan datos ficticios. El despliegue debe quedar virgen.

## 9. Operación

### Backups

La base de datos es un único archivo — copiarlo es un backup completo:

```bash
cp backend/data/sisven.db ~/backups/sisven-$(date +%F).db
```

Automatizar diario (cron): `crontab -e` →

```cron
0 3 * * * cp /ruta/a/sisven/backend/data/sisven.db /ruta/backups/sisven-$(date +\%F).db
```

### Actualizar el sistema

```bash
cd sisven
git pull
npm ci
npm run build
pm2 restart sisven
```

### Logs y diagnóstico

```bash
pm2 logs sisven          # logs de la app
pm2 status               # estado del proceso
sudo nginx -t            # validar config de nginx
sudo tail -f /var/log/nginx/error.log
```

### Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `502 Bad Gateway` en el navegador | La app no corre o nginx no la alcanza | `pm2 status`, `pm2 logs sisven`, `curl localhost:3000/` |
| Login pide credenciales que no sé | Se arrancó antes de editar `SEED_ADMIN_*` | Resetear la DB (abajo) |
| Página en blanco / error 404 en rutas | Build del frontend viejo | `npm run build && pm2 restart sisven` |
| `certbot` falla | El DNS aún no propaga | Espera y reintenta; verifica `ping` al subdominio |

### Resetear la base de datos (volver a empezar de cero)

```bash
pm2 stop sisven
rm backend/data/sisven.db
pm2 start sisven
```

En el siguiente arranque se recrea todo: tablas + usuario admin según el `.env` actual.

## 10. Advertencias

- **Secretos del desarrollo**: versiones viejas del repo tuvieron `.env` en el historial de git. Este despliegue usa secretos **nuevos** y una base de datos **nueva**, así que no afecta — pero si el repo es público, considera hacerlo privado.
- **`DB_SYNC=true`** sincroniza el esquema automáticamente: cómodo para empezar. Para producción seria se recomienda migrar a PostgreSQL (`DB_TYPE=postgres` + `DATABASE_URL`) con migraciones formales.
- Herramienta de soporte contable: debe ser validada por un contador público colegiado antes de uso productivo real.
