#!/usr/bin/env bash
# ============================================================================
# Sisven Cont — Verificación de despliegue (NO destructiva)
#
# Solo hace peticiones GET + un login. No escribe nada en la base de datos.
#
# Uso:
#   ./scripts/verify-deploy.sh                        # local: localhost:3000 + checks del VPS
#   URL=https://sisven.midominio.com ./scripts/verify-deploy.sh
#
# Credenciales (en local se leen de backend/.env si existen):
#   ADMIN_EMAIL=... ADMIN_PASSWORD=... ./scripts/verify-deploy.sh
#
# Salida: código 0 si todo PASS, != 0 si hay FAIL.
# ============================================================================
set -u

URL="${URL:-http://localhost:3000}"
URL="${URL%/}"          # sin slash final
API="${URL}/api/v1"
cd "$(dirname "$0")/.." 2>/dev/null || true   # raíz del repo si existe

# ── Credenciales: env > backend/.env > defaults del ejemplo ──
if [ -z "${ADMIN_EMAIL:-}" ] && [ -f backend/.env ]; then
  ADMIN_EMAIL=$(grep -E '^SEED_ADMIN_EMAIL=' backend/.env | cut -d= -f2-)
  ADMIN_PASSWORD=$(grep -E '^SEED_ADMIN_PASSWORD=' backend/.env | cut -d= -f2-)
fi
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@sisven.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}"

# ── ¿Modo local? (checks de host solo si la URL es esta máquina) ──
LOCAL=0
case "$URL" in
  *localhost*|*127.0.0.1*) LOCAL=1 ;;
esac

PASSED=0; FAILED=0; SKIPPED=0
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[1;34m'; NC='\033[0m'
pass() { PASSED=$((PASSED+1));  printf "  ${GREEN}PASS${NC} %s\n" "$1"; }
fail() { FAILED=$((FAILED+1));  printf "  ${RED}FAIL${NC} %s%s\n" "$1" "${2:+ — $2}"; }
skip() { SKIPPED=$((SKIPPED+1)); printf "  ${YELLOW}SKIP${NC} %s%s\n" "$1" "${2:+ — $2}"; }
section() { printf "\n${BLUE}== %s ==${NC}\n" "$1"; }

BODY_FILE=$(mktemp)
trap 'rm -f "$BODY_FILE"' EXIT

# code <curl-args...> → imprime el HTTP status, deja el body en $BODY_FILE
code() { curl -s -o "$BODY_FILE" -w '%{http_code}' --max-time 10 "$@" 2>/dev/null; }
body() { cat "$BODY_FILE"; }

section "HTTP — $URL"

C=$(code "$URL/")
if [ "$C" = "200" ] && grep -qi "<html" "$BODY_FILE"; then
  pass "GET / devuelve la app (200 + HTML)"
else
  fail "GET / devuelve la app" "HTTP $C"
fi

for route in "/login" "/dashboard/ruta/profunda"; do
  C=$(code "$URL$route")
  if [ "$C" = "200" ] && grep -qi "<html" "$BODY_FILE"; then
    pass "SPA fallback en $route"
  else
    fail "SPA fallback en $route" "HTTP $C"
  fi
done

C=$(code "$API/health")
if [ "$C" = "200" ] && grep -q '"status":"ok"' "$BODY_FILE"; then
  pass "GET /api/v1/health → status ok (API + DB viva)"
else
  fail "GET /api/v1/health" "HTTP $C $(body | head -c 80)"
fi

C=$(code "$API/stats")
[ "$C" = "401" ] && pass "Endpoint protegido sin token → 401" || fail "Endpoint protegido sin token → 401" "HTTP $C"

C=$(code -X POST -H 'Content-Type: application/json' \
      -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"clave-incorrecta-123\"}" "$API/auth/login")
[ "$C" = "401" ] && pass "Login con clave incorrecta → 401" || fail "Login con clave incorrecta → 401" "HTTP $C"

C=$(code -X POST -H 'Content-Type: application/json' \
      -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" "$API/auth/login")
TOKEN=$(body | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
if { [ "$C" = "200" ] || [ "$C" = "201" ]; } && [ -n "$TOKEN" ]; then
  pass "Login admin ($ADMIN_EMAIL) → token"
else
  fail "Login admin" "HTTP $C — ¿SEED_ADMIN_* correcto? (passa ADMIN_EMAIL/ADMIN_PASSWORD por env)"
fi

if [ -n "$TOKEN" ]; then
  C=$(code -H "Authorization: Bearer $TOKEN" "$API/auth/me")
  if [ "$C" = "200" ] && grep -q '"role":"ADMIN"' "$BODY_FILE"; then
    pass "GET /auth/me → rol ADMIN"
  else
    fail "GET /auth/me → rol ADMIN" "HTTP $C"
  fi

  C=$(code -H "Authorization: Bearer $TOKEN" "$API/tenants")
  if [ "$C" = "200" ] && grep -q '\[' "$BODY_FILE"; then
    pass "GET /tenants → lista (puede estar vacía pre-onboarding)"
  else
    fail "GET /tenants" "HTTP $C"
  fi
fi

section "Exposición de archivos sensibles"
# Nota: rutas inexistentes devuelven index.html (SPA fallback) — por eso
# verificamos el CONTENIDO, no solo el status code.
for p in "/.env" "/backend/.env" "/data/sisven.db" "/api/v1/../../backend/.env"; do
  C=$(code "$URL$p")
  if grep -qE "JWT_SECRET|SEED_ADMIN|BEGIN.*PRIVATE KEY|SQLite format" "$BODY_FILE"; then
    fail "$p expone contenido sensible!" "HTTP $C con datos reales"
  else
    pass "$p no expone secretos (HTTP $C, contenido inocuo)"
  fi
done

if [[ "$URL" == https://* ]]; then
  section "HTTPS"
  HTTP_URL="http://${URL#https://}"
  C=$(code -I "$HTTP_URL/")
  REDIR=$(curl -sI --max-time 10 -o /dev/null -w '%{redirect_url}' "$HTTP_URL/" 2>/dev/null)
  if [[ "$REDIR" == https://* ]]; then
    pass "http:// redirige a https:// ($REDIR)"
  else
    fail "http:// redirige a https://" "HTTP $C sin redirect"
  fi
fi

# ── Checks del host (solo modo local) ────────────────────────────────────────
if [ "$LOCAL" -eq 0 ]; then
  section "Checks de host — omitidos (URL remota)"
  skip "Ejecuta este script en el VPS para verificar pm2, DB, firewall, nginx"
else
  section "Host — proceso y base de datos"

  if command -v pm2 >/dev/null 2>&1; then
    if pm2 jlist 2>/dev/null | grep -q '"name":"sisven"' && pm2 jlist | grep -q '"status":"online"'; then
      pass "PM2: proceso 'sisven' online"
    else
      fail "PM2: proceso 'sisven' online" "pm2 status para diagnosticar"
    fi
  else
    skip "PM2 instalado" "pm2 no está en PATH"
  fi

  if [ -s backend/data/sisven.db ]; then
    pass "Base de datos existe (backend/data/sisven.db, $(du -h backend/data/sisven.db | cut -f1))"
  else
    fail "Base de datos existe" "backend/data/sisven.db vacía o ausente"
  fi

  APP_PORT=$(echo "$URL" | grep -oE ':[0-9]+' | tail -1 | tr -d ':')
  APP_PORT="${APP_PORT:-3000}"
  if command -v ss >/dev/null 2>&1; then
    ss -tln | grep -q ":${APP_PORT} " && pass "Puerto ${APP_PORT} escuchando" || fail "Puerto ${APP_PORT} escuchando"
  else
    skip "Puerto ${APP_PORT} escuchando" "ss no disponible"
  fi

  section "Host — seguridad de archivos"
  if [ -f backend/.env ]; then
    PERMS=$(stat -c '%a' backend/.env 2>/dev/null || stat -f '%Lp' backend/.env)
    if [ "$PERMS" -le 640 ] 2>/dev/null; then
      pass "backend/.env con permisos seguros ($PERMS)"
    else
      fail "backend/.env con permisos seguros" "chmod 640 backend/.env (actual: $PERMS)"
    fi
  else
    fail "backend/.env existe"
  fi

  if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
    N=$(git ls-files | grep -cE 'node_modules|/dist/|\.env$|\.db$')
    [ "$N" = "0" ] && pass "git no trackea secretos/builds ($N archivos indebidos)" \
                  || fail "git no trackea secretos/builds" "$N archivos indebidos en el índice"
  else
    skip "git no trackea secretos/builds" "no es un clone de git"
  fi

  section "Host — nginx, firewall, certificado"
  if command -v nginx >/dev/null 2>&1; then
    if sudo -n nginx -t >/dev/null 2>&1; then
      pass "nginx -t: configuración válida"
    else
      skip "nginx -t: configuración válida" "requiere sudo (corre: sudo nginx -t)"
    fi
  else
    skip "nginx instalado" "aún no instalado (ver DEPLOY.md sección 6)"
  fi

  if command -v ufw >/dev/null 2>&1; then
    STATUS=$(sudo -n ufw status 2>/dev/null || echo "sin-sudo")
    if [[ "$STATUS" == *"Status: active"* ]]; then
      if ! echo "$STATUS" | grep -qE '^3000\b.*ALLOW'; then
        pass "ufw activo y puerto 3000 NO expuesto"
      else
        fail "ufw activo y puerto 3000 NO expuesto" "3000 tiene regla ALLOW"
      fi
    elif [[ "$STATUS" == "sin-sudo" ]]; then
      skip "ufw activo" "requiere sudo (corre: sudo ufw status)"
    else
      fail "ufw activo" "está inactivo — ver DEPLOY.md sección 7"
    fi
  else
    skip "ufw instalado" "sin ufw (recomendado en DEPLOY.md sección 7)"
  fi

  if command -v certbot >/dev/null 2>&1; then
    if sudo -n certbot certificates 2>/dev/null | grep -q "Certificate Name"; then
      pass "certbot: existe certificado emitido"
    else
      skip "certbot: certificado emitido" "requiere sudo o aún no se emite"
    fi
  else
    skip "certbot instalado" "aún no instalado (ver DEPLOY.md sección 6)"
  fi

  # ¿El puerto 3000 responde desde fuera? (mala señal si ufw está puesto)
  EXT_IP=$(curl -s --max-time 3 https://ifconfig.me 2>/dev/null || true)
  if [ -n "$EXT_IP" ]; then
    C=$(code --max-time 3 "http://$EXT_IP:3000/")
    if [ "$C" = "000" ] || [ -z "$C" ]; then
      pass "Puerto 3000 NO accesible desde internet"
    else
      fail "Puerto 3000 NO accesible desde internet" "respondió HTTP $C — cerrar con ufw"
    fi
  else
    skip "Puerto 3000 accesible desde internet" "no se pudo obtener IP externa"
  fi
fi

printf "\n════════════════════════════════════════════════════\n"
printf "RESULTADO: ${GREEN}%d PASS${NC} · ${RED}%d FAIL${NC} · ${YELLOW}%d SKIP${NC}\n" \
  "$PASSED" "$FAILED" "$SKIPPED"
printf "════════════════════════════════════════════════════\n"
[ "$FAILED" -eq 0 ]
