#!/usr/bin/env bash
# ============================================================================
# Sisven Cont — Suite de pruebas end-to-end contra la API
#
# Uso:
#   ./scripts/smoke-test.sh                     # contra http://localhost:3000/api/v1
#   API_URL=http://host:port/api/v1 ./scripts/smoke-test.sh
#   ADMIN_EMAIL=... ADMIN_PASSWORD=... ./scripts/smoke-test.sh
#
# Requisito: backend corriendo (npm run dev -w backend) y python3 instalado.
# Sale con código != 0 si alguna prueba falla.
# ============================================================================
set -euo pipefail

API_URL="${API_URL:-http://localhost:3000/api/v1}" \
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@sisven.local}" \
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}" \
python3 <<'PYEOF'
import json, os, sys, urllib.request, urllib.error, uuid, re
from datetime import date

BASE = os.environ["API_URL"].rstrip("/")
EMAIL = os.environ["ADMIN_EMAIL"]
PASSWORD = os.environ["ADMIN_PASSWORD"]

passed = failed = 0
def ok(name, cond, extra=""):
    global passed, failed
    if cond: passed += 1; print(f"  PASS {name}" + (f" — {extra}" if extra else ""))
    else:    failed += 1; print(f"  FAIL {name}" + (f" — {extra}" if extra else ""))
    return cond

def req(method, path, body=None, token=None, tenant=None, expect=None, raw=False):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token:  r.add_header("Authorization", f"Bearer {token}")
    if tenant: r.add_header("X-Tenant-Id", tenant)
    try:
        with urllib.request.urlopen(r) as resp:
            code, payload = resp.status, resp.read()
    except urllib.error.HTTPError as e:
        code, payload = e.code, e.read()
    if expect is not None and code != expect:
        raise AssertionError(f"{method} {path} → {code} (esperado {expect}): {payload[:300]}")
    if raw: return code, payload
    try:    return code, json.loads(payload)
    except Exception: return code, payload

# ── Generador de RIF válido (Módulo 11) ────────────────────────────────────
PREFIX = {"V": 1, "E": 2, "J": 3, "P": 4, "G": 5, "C": 6}
def make_rif(prefix="J", body=None):
    body = body or "".join(str(uuid.uuid4().int)[-8:])
    weights = [3, 2, 7, 6, 5, 4, 3, 2]
    s = PREFIX[prefix] * 4 + sum(int(d) * w for d, w in zip(body, weights))
    rem = s % 11
    dv = 0 if rem <= 1 else 11 - rem
    return f"{prefix}-{body}-{dv}"

def section(t): print(f"\n== {t} " + "=" * max(0, 60 - len(t)))

# ═══════════════════════════════════════════════════════════════════════════
section("AUTH")
code, _ = req("POST", "/auth/login", {"email": EMAIL, "password": "clave-mala"})
ok("Login con contraseña incorrecta → 401", code == 401, f"HTTP {code}")

code, _ = req("GET", "/auth/me")
ok("Endpoint protegido sin token → 401", code == 401, f"HTTP {code}")

code, login = req("POST", "/auth/login", {"email": EMAIL, "password": PASSWORD})
TOK = login.get("access_token") if isinstance(login, dict) else None
ok("Login admin", code in (200, 201) and bool(TOK))
assert TOK, "Sin token no se puede continuar"

section("TENANTS")
code, bad = req("POST", "/tenants", {"rif": "J-99999999-9", "razon_social": "X"}, token=TOK)
ok("Crear empresa con RIF inválido → 400", code == 400, f"HTTP {code}")

rif_a = make_rif("J")
code, t1 = req("POST", "/tenants",
               {"rif": rif_a, "razon_social": "Smoke Test CA",
                "es_contribuyente_especial": True, "porcentaje_retencion_iva": 75},
               token=TOK)
ok("Crear empresa A (SPE 75%)", code in (200, 201), t1.get("rif", ""))
T1 = t1.get("tenant_id")

code, t2 = req("POST", "/tenants",
               {"rif": make_rif("J"), "razon_social": "Empresa Aislada CA"}, token=TOK)
ok("Crear empresa B", code in (200, 201))
T2 = t2.get("tenant_id")

section("PLAN DE CUENTAS")
code, chart = req("GET", "/chart-of-accounts", token=TOK, tenant=T1)
ok("Plan de cuentas sembrado (112)", code == 200 and len(chart) == 112, f"{len(chart)} cuentas")
sel = [a for a in chart if a.get("is_selectable")]
ok("Cuentas seleccionables existen", len(sel) >= 20, f"{len(sel)}")

code, dup = req("POST", "/chart-of-accounts",
                {"code": "1.1.01.01.00.000", "name": "Duplicada", "is_selectable": True},
                token=TOK, tenant=T1)
ok("Código duplicado → error", code in (400, 409, 500), f"HTTP {code}")

RATE = 36.50
code, _ = req("PATCH", f"/tenants/{T1}/exchange-rate", {"tasa": RATE}, token=TOK)
ok("Fijar tasa BCV manual", code == 200)

section("VENTAS")
code, sale = req("POST", "/sales", {
    "fecha_factura": "2026-10-15", "rif_comprador": make_rif("J"),
    "nombre_comprador": "Cliente Smoke CA", "amounts_in": "USD",
    "base_imponible": 1000.0, "ventas_exentas": 0.0,
    "condicion": "CONTADO", "cobro_en": "USD",
    "igtf_percibido_3": 1314.0, "bcv_exchange_rate": RATE,
}, token=TOK, tenant=T1)
ok("Crear factura", code in (200, 201), sale.get("numero_factura", ""))
E_SALE = sale.get("journal_entry_id")

code, sales = req("GET", "/sales", token=TOK, tenant=T1)
sale_id = sale.get("sale", {}).get("sale_id")
ok("Libro de ventas lista la factura", code == 200 and any(s.get("sale_id") == sale_id for s in sales))

code, entry = req("GET", f"/journal-entries/{E_SALE}", token=TOK, tenant=T1) if E_SALE else (404, {})
if E_SALE:
    bal = abs(entry["total_debit_ves"] - entry["total_credit_ves"]) < 0.01 and \
          abs(entry["total_debit_usd"] - entry["total_credit_usd"]) < 0.01
    ok("Asiento de venta cuadrado (Bs. y $)", code == 200 and bal,
       f"Debe={entry['total_debit_ves']} Haber={entry['total_credit_ves']}")

section("COMPRAS + RETENCIONES")
code, pur = req("POST", "/purchases", {
    "fecha_factura": "2026-10-10", "rif_proveedor": make_rif("J"),
    "nombre_proveedor": "Proveedor Smoke CA", "numero_factura": "F-9001",
    "numero_control": "00-009001", "amounts_in": "VES",
    "base_imponible": 36500.0, "bcv_exchange_rate": RATE,
    "islr_concepto_codigo": "057", "islr_beneficiary_type": "PJ_DOM",
}, token=TOK, tenant=T1)
ok("Crear compra (SPE)", code in (200, 201), str(pur.get("purchase_id", ""))[:8])

iva_esperado = round(36500 * 0.16 * 0.75, 2)
ok("Retención IVA 75% correcta", abs(pur.get("iva_retenido", 0) - iva_esperado) < 0.05,
   f"{pur.get('iva_retenido')} vs {iva_esperado}")
ok("Retención ISLR 2% (057 PJ)", abs(pur.get("islr_retenido", 0) - 36500 * 0.02) < 0.05,
   str(pur.get("islr_retenido")))
comp = pur.get("comprobante_iva", "")
ok("Comprobante IVA 14 dígitos AAAAMM+8", bool(re.fullmatch(r"202610\d{8}", comp)), comp)

section("ARCHIVOS SENIAT")
code, txt = req("GET", "/retentions/iva/txt?periodo=202610", token=TOK, tenant=T1, raw=True)
lines = [l for l in txt.decode().splitlines() if l.strip()]
ok("TXT IVA generado", code == 200 and len(lines) >= 1, f"{len(lines)} líneas")
ok("TXT: 16 campos tabulados por línea", all(len(l.split("\t")) == 16 for l in lines))

code, xml = req("GET", "/retentions/islr/xml?periodo=202610", token=TOK, tenant=T1, raw=True)
xs = xml.decode()
ok("XML ISLR válido", code == 200 and "RelacionRetencionesISLR" in xs or "relacionRetencionesISLR" in xs,
   xs[:80])

section("REPORTES")
code, tb = req("GET", "/reports/trial-balance?year=2026&period=10", token=TOK, tenant=T1)
t = tb.get("totals", {})
ok("Balance comprobación: movimientos cuadran",
   code == 200 and abs(t.get("movement_debit_ves", 0) - t.get("movement_credit_ves", 0)) < 0.01,
   f"Debe={t.get('movement_debit_ves')} Haber={t.get('movement_credit_ves')}")

code, bs = req("GET", "/reports/balance-sheet?as_of=2026-10-31", token=TOK, tenant=T1)
ok("Balance general: Activo = Pasivo + Patrimonio",
   code == 200 and bs.get("balance_check_ves") == 0, f"check={bs.get('balance_check_ves')}")

code, isr = req("GET", "/reports/income-statement?from=2026-01-01&to=2026-10-31", token=TOK, tenant=T1)
ok("Estado de resultados generado", code == 200 and "resultado_neto" in isr)

acc_id = sel[0]["account_id"]
code, lg = req("GET", f"/reports/ledger?account_id={acc_id}&from=2026-01-01&to=2026-10-31",
               token=TOK, tenant=T1)
ok("Libro mayor responde", code == 200 and "movements" in lg)

section("BANCOS — CONCILIACIÓN 4 FASES")
code, acc = req("POST", "/banks/accounts",
                {"bank_name": "Banco Smoke", "account_number": "0102-0000-00-0000000001"},
                token=TOK, tenant=T1)
ACC = acc.get("account_id")
ok("Crear cuenta bancaria", code in (200, 201) and bool(ACC))

# Fase 1: match exacto (misma fecha+referencia+monto, tipo opuesto)
req("POST", "/banks/statements", {"bank_account_id": ACC, "transaction_date": "2026-10-05",
    "reference_number": "REF-EXACTA", "description": "Pago factura 100",
    "movement_type": "DEBITO", "amount": 1000.0}, token=TOK, tenant=T1)
req("POST", "/banks/movements", {"bank_account_id": ACC, "movement_date": "2026-10-05",
    "reference_number": "REF-EXACTA", "concept": "Pago prov A",
    "movement_type": "DEBITO", "amount": 1000.0}, token=TOK, tenant=T1)

# Fase 2: match temporal/numérico (referencia distinta)
req("POST", "/banks/statements", {"bank_account_id": ACC, "transaction_date": "2026-10-06",
    "reference_number": "DEP-111", "description": "Depósito",
    "movement_type": "DEBITO", "amount": 500.0}, token=TOK, tenant=T1)
req("POST", "/banks/movements", {"bank_account_id": ACC, "movement_date": "2026-10-06",
    "reference_number": "N/D-222", "concept": "Pago prov B",
    "movement_type": "DEBITO", "amount": 500.0}, token=TOK, tenant=T1)

# Fase 3: abono en extracto sin soporte → alerta de riesgo fiscal
req("POST", "/banks/statements", {"bank_account_id": ACC, "transaction_date": "2026-10-07",
    "reference_number": "ABONO-X", "description": "Transferencia recibida",
    "movement_type": "CREDITO", "amount": 7777.0}, token=TOK, tenant=T1)

# Fase 4: cargo IGTF detectable
req("POST", "/banks/statements", {"bank_account_id": ACC, "transaction_date": "2026-10-08",
    "reference_number": "IGTF-1", "description": "DB IGTF IMPUESTO 3%",
    "movement_type": "DEBITO", "amount": 33.33}, token=TOK, tenant=T1)

code, rec = req("POST", "/banks/reconcile", {"bcv_rate": RATE}, token=TOK, tenant=T1)
s = rec.get("summary", {})
ok("Fase 1: match exacto", s.get("phase1ExactMatches", 0) >= 1, str(s.get("phase1ExactMatches")))
ok("Fase 2: match temporal/numérico", s.get("phase2TemporalMatches", 0) >= 1, str(s.get("phase2TemporalMatches")))
ok("Fase 3: alerta riesgo fiscal", s.get("fiscalAlertsCount", 0) >= 1, str(s.get("fiscalAlertsCount")))
ok("Fase 4: gastos auto-detectados", s.get("autoDetectedExpensesCount", 0) >= 1, str(s.get("autoDetectedExpensesCount")))

section("PERÍODOS FISCALES")
code, periods = req("GET", "/fiscal-periods?year=2026", token=TOK, tenant=T1)
ok("12 períodos sembrados", code == 200 and len(periods) == 12, f"{len(periods)}")
p9 = next((p for p in periods if p["fiscal_month"] == 9), None)
code, _ = req("POST", f"/fiscal-periods/{p9['period_id']}/close", token=TOK, tenant=T1)
ok("Cerrar septiembre", code in (200, 201))

code, acc_caja = (None, next((a for a in chart if a["code"] == "1.1.01.01.00.000"), None))
code, _ = req("POST", "/journal-entries", {
    "entry_date": "2026-09-15", "concept": "Asiento en mes cerrado",
    "bcv_exchange_rate": RATE,
    "lines": [
        {"account_id": acc_caja["account_id"], "debit_ves": 100},
        {"account_id": acc_caja["account_id"], "credit_ves": 100},
    ]}, token=TOK, tenant=T1)
ok("Asiento en período cerrado → rechazado", code in (400, 409), f"HTTP {code}")

code, _ = req("POST", f"/fiscal-periods/{p9['period_id']}/reopen", token=TOK, tenant=T1)
ok("Reabrir período (ADMIN)", code in (200, 201))

section("ROLES")
code, u = req("POST", "/users", {
    "email": f"consulta-{uuid.uuid4().hex[:6]}@smoke.test",
    "password": "Consulta123!", "full_name": "Usuario Consulta",
    "role": "CONSULTA", "tenant_ids": [T1]}, token=TOK)
ok("Crear usuario CONSULTA", code in (200, 201))

code, cu = req("POST", "/auth/login",
               {"email": u["email"], "password": "Consulta123!"})
TOK2 = cu.get("access_token")
code, _ = req("POST", "/sales", {
    "rif_comprador": make_rif("J"), "nombre_comprador": "X", "amounts_in": "VES",
    "base_imponible": 1, "condicion": "CONTADO", "bcv_exchange_rate": RATE},
    token=TOK2, tenant=T1)
ok("CONSULTA no puede crear venta → 403", code == 403, f"HTTP {code}")
code, _ = req("GET", "/sales", token=TOK2, tenant=T1)
ok("CONSULTA sí puede consultar → 200", code == 200)

section("AISLAMIENTO MULTI-EMPRESA")
code, sales_b = req("GET", "/sales", token=TOK, tenant=T2)
ok("Empresa B no ve ventas de A", code == 200 and sales_b == [])
code, chart_b = req("GET", "/chart-of-accounts", token=TOK, tenant=T2)
ok("Empresa B tiene su propio plan (112)", code == 200 and len(chart_b) == 112)

print(f"\n{'═' * 64}\nRESULTADO: {passed} PASS · {failed} FAIL")
sys.exit(1 if failed else 0)
PYEOF
