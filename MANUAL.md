# Manual de instalación en servidor — Sisven Cont

Guía para montar el sistema en un VPS y dejarlo listo para usar.
**No necesitas conocer el código** — solo seguir los pasos en orden y copiar los comandos.

> Lo que vas a lograr: el sistema funcionando en `https://sisven.tudominio.com`, con la empresa creada y usuarios para los contadores.

---

## Lo que necesitas antes de empezar

| Requisito | Detalle |
|---|---|
| VPS | Ubuntu 22.04 o 24.04, 1–2 GB RAM (cualquier proveedor) |
| Dominio | Acceso al panel DNS para crear un subdominio |
| Acceso | SSH con usuario `sudo` o `root` |
| Repo | La URL de este repositorio en GitHub |

---

## Paso 1 — Apuntar el dominio al servidor

En el panel DNS de tu dominio, crea un registro:

```
Tipo: A
Nombre: sisven          → quedará sisven.tudominio.com
Valor:  <IP-DEL-VPS>
TTL:    300
```

Comprueba que funciona (puede tardar unos minutos):

```bash
ping sisven.tudominio.com
```

## Paso 2 — Entrar al servidor y clonar

```bash
ssh usuario@<IP-DEL-VPS>

git clone https://github.com/<USUARIO-GITHUB>/Sisven_Cont.git sisven
cd sisven
```

## Paso 3 — Instalación automática

```bash
./scripts/setup-vps.sh
```

Este script instala Node.js, las herramientas de compilación y PM2; crea el archivo de configuración `backend/.env` con un secreto aleatorio; compila el sistema y lo deja corriendo en el puerto 3000. Si algo ya está instalado, lo detecta y lo salta — puedes correrlo más de una vez sin problema.

## Paso 4 — Configurar las credenciales del administrador

```bash
nano backend/.env
```

Edita **solo estas dos líneas** (el resto déjalo igual):

```env
SEED_ADMIN_EMAIL=admin@tuempresa.com
SEED_ADMIN_PASSWORD=UnaClaveFuerte.2026!
```

> ⚠️ Hazlo **antes** de entrar al sistema por primera vez: el usuario administrador se crea solo en el primer arranque. Si ya arrancaste, mira "Resetear la base de datos" al final.

Guarda (`Ctrl+O`, Enter) y sal (`Ctrl+X`).

## Paso 5 — Comprobar que todo corre

```bash
./scripts/verify-deploy.sh
```

Debe terminar con **0 FAIL**. Los `SKIP` por herramientas no instaladas todavía (nginx, ufw, certbot) son normales en este punto.

## Paso 6 — Dominio y HTTPS

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Edita la plantilla y pon tu dominio real (reemplaza sisven.TUDOMINIO.COM):
nano deploy/nginx-sisven.conf

sudo cp deploy/nginx-sisven.conf /etc/nginx/sites-available/sisven
sudo ln -s /etc/nginx/sites-available/sisven /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d sisven.tudominio.com
```

Certbot emite el certificado HTTPS gratis y configura la redirección `http → https` solo.

## Paso 7 — Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable        # responde "y"
```

Con esto el puerto 3000 queda cerrado a internet; solo nginx lo usa internamente.

## Paso 8 — Crear la empresa (primer uso)

1. Abre `https://sisven.tudominio.com` en el navegador.
2. Inicia sesión con el `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` del Paso 4.
3. El sistema te pide los datos de la empresa (onboarding). Al crearla, genera automáticamente el **plan de cuentas** y los **12 períodos fiscales** — no hay que cargar nada más.

## Paso 9 — Crear los usuarios de los contadores

> 🔐 **No existe registro público**: nadie puede crearse una cuenta desde internet. Solo el administrador crea usuarios — es a propósito, por seguridad.

Para cada contador:

1. Entra como admin → **Administración → Usuarios** → Nuevo usuario.
2. Llena correo, nombre y una contraseña temporal.
3. Elige el rol:
   - **`CONTADOR`** — puede registrar ventas, compras, asientos y usar bancos.
   - **`CONSULTA`** — solo lectura (recomendado si solo van a revisar).
4. **Marca la empresa** en el checkbox de empresas asignadas (sin esto no verá nada).
5. Entrégale la URL, su correo y su clave por un canal seguro.

Para probarlo: cierra sesión y entra con esas credenciales — debe ver solo su empresa y sus permisos.

## Paso 10 — Verificación final

Desde tu propia PC:

```bash
URL=https://sisven.tudominio.com \
ADMIN_EMAIL=admin@tuempresa.com ADMIN_PASSWORD='tu-clave' \
./scripts/verify-deploy.sh
```

Todo en PASS = sistema listo. Entrega la URL a los contadores.

---

## Si algo falla

| Síntoma | Qué revisar |
|---|---|
| `502 Bad Gateway` | `pm2 logs sisven` — la app no corre; `pm2 restart sisven` |
| La página no carga | `ping` al dominio → ¿DNS propagado? `sudo nginx -t` |
| No entra el login | ¿Editaste `SEED_ADMIN_*` después del primer arranque? → "Resetear DB" abajo |
| `certbot` falla | El DNS aún no propaga; espera y reintenta |
| verify-deploy dice FAIL en login | Pasa las credenciales: `ADMIN_EMAIL=... ADMIN_PASSWORD=... ./scripts/verify-deploy.sh` |

**Resetear la base de datos** (empezar de cero, borra todo):

```bash
pm2 stop sisven
rm backend/data/sisven.db
pm2 start sisven
```

## Comandos útiles

```bash
pm2 status               # estado del servicio
pm2 logs sisven          # logs en vivo
pm2 restart sisven       # reiniciar
pm2 startup              # que arranque solo tras reboot (una sola vez)

# Backup de la base de datos (es un solo archivo):
cp backend/data/sisven.db ~/sisven-backup-$(date +%F).db

# Actualizar el sistema:
git pull && npm ci && npm run build && pm2 restart sisven
```

## Qué NO hacer en el servidor de producción

- 🚫 No corras `scripts/seed-demo.mjs` — carga datos ficticios.
- 🚫 No corras `scripts/smoke-test.sh` contra la base de producción (solo en la instancia de prueba de `docs/VERIFICACION.md`).
- 🚫 No abras el puerto 3000 al exterior — todo entra por nginx (80/443).
- 🚫 No subas `backend/.env` a git ni lo compartas.

---

## Documentación detallada (referencia técnica)

- [`docs/DEPLOY.md`](docs/DEPLOY.md) — despliegue paso a paso con explicaciones.
- [`docs/VERIFICACION.md`](docs/VERIFICACION.md) — checklist completa de verificación y seguridad.
