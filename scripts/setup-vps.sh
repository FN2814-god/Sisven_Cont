#!/usr/bin/env bash
#
# Sisven Cont — Bootstrap de VPS (Ubuntu 22.04/24.04)
#
# Instala dependencias, genera backend/.env con un JWT_SECRET aleatorio,
# compila backend + frontend y levanta el servicio con PM2.
# Es idempotente: se puede correr varias veces sin romper nada.
#
# Uso (desde la raíz del repo ya clonado):
#   ./scripts/setup-vps.sh
#
# Después sigue la sección "nginx + HTTPS" de docs/DEPLOY.md.

set -euo pipefail

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33mAVISO: %s\033[0m\n' "$*"; }

cd "$(dirname "$0")/.."   # raíz del repo

# ── 1. sudo disponible ──────────────────────────────────────
if ! command -v sudo >/dev/null 2>&1; then
  echo "Este script necesita 'sudo'. Instálalo o corre como root." >&2
  exit 1
fi
sudo -v

# ── 2. Paquetes del sistema ─────────────────────────────────
log "Instalando paquetes del sistema (git, curl, compiladores)..."
sudo apt update -y
sudo apt install -y git curl build-essential python3

# ── 3. Node.js 22 LTS (si falta o es < 20) ──────────────────
NODE_OK=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR=$(node -e 'console.log(process.versions.node.split(".")[0])')
  [ "$NODE_MAJOR" -ge 20 ] && NODE_OK=1
fi
if [ "$NODE_OK" -eq 0 ]; then
  log "Instalando Node.js 22 LTS (NodeSource)..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs
else
  log "Node.js $(node --version) ya instalado. Omitiendo."
fi

# ── 4. PM2 ──────────────────────────────────────────────────
if ! command -v pm2 >/dev/null 2>&1; then
  log "Instalando PM2..."
  sudo npm install -g pm2
else
  log "PM2 ya instalado. Omitiendo."
fi

# ── 5. backend/.env (solo si no existe) ─────────────────────
if [ ! -f backend/.env ]; then
  log "Creando backend/.env con JWT_SECRET aleatorio..."
  cp .env.example backend/.env
  SECRET=$(openssl rand -hex 32)
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${SECRET}|" backend/.env
  warn "Edita backend/.env ANTES de usar el sistema: cambia SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD."
  warn "El usuario admin se crea solo en el primer arranque (con la base de datos vacía)."
else
  log "backend/.env ya existe. No se toca."
fi

# ── 6. Dependencias + build ─────────────────────────────────
log "Instalando dependencias (npm ci)..."
npm ci

log "Compilando backend y frontend..."
npm run build

# ── 7. Levantar con PM2 ─────────────────────────────────────
log "Levantando el servicio con PM2..."
if pm2 describe sisven >/dev/null 2>&1; then
  pm2 restart deploy/ecosystem.config.cjs
else
  pm2 start deploy/ecosystem.config.cjs
fi
pm2 save

cat <<'EOF'

════════════════════════════════════════════════════════════
  Sisven Cont está corriendo en http://localhost:3000

  Siguiente paso: exponerlo con tu dominio (nginx + HTTPS):
    docs/DEPLOY.md  →  sección "nginx + Certbot"

  Para que arranque solo tras reiniciar el servidor:
    pm2 startup     (copia y ejecuta el comando que imprime)

  Logs:  pm2 logs sisven
════════════════════════════════════════════════════════════
EOF
