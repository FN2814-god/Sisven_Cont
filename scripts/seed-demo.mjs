#!/usr/bin/env node
/**
 * Sisven Cont — Carga de datos de demostración
 *
 * Crea la empresa "Distribuidora El Roble, C.A." (SPE, retención IVA 75%)
 * con un mes de operaciones realistas de octubre 2026: ventas, compras con
 * retenciones IVA/ISLR, capital inicial, cuenta bancaria, extracto y libro
 * interno preparados para demostrar la conciliación de 4 fases EN VIVO
 * (la conciliación NO se ejecuta aquí: se corre durante la grabación).
 *
 * Uso:
 *   node scripts/seed-demo.mjs                 # contra http://localhost:3000/api/v1
 *   API_URL=http://host:port/api/v1 node scripts/seed-demo.mjs
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed-demo.mjs
 *
 * Es idempotente: si la empresa ya existe, aborta sin duplicar datos.
 */

const BASE = (process.env.API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const EMAIL = process.env.ADMIN_EMAIL || 'admin@sisven.local';
const PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
const TASA = 36.5;

async function req(method, path, body, token, tenant) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenant ? { 'X-Tenant-Id': tenant } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) {
    const msg = Array.isArray(json?.message) ? json.message.join(', ') : (json?.message || text);
    throw new Error(`${method} ${path} → ${res.status}: ${msg}`);
  }
  return json;
}

// RIFs válidos (dígito verificador Módulo 11 verificado)
const DEMO = {
  rif: 'J-31678900-4',
  razon_social: 'Distribuidora El Roble, C.A.',
  nombre_comercial: 'El Roble',
  es_contribuyente_especial: true,
  porcentaje_retencion_iva: 75,
};

const CLIENTES = {
  losAndes: { rif: 'J-40123456-9', nombre: 'Comercial Los Andes, C.A.' },
  bodegon: { rif: 'J-30567891-0', nombre: 'Bodegón La Esquina, C.A.' },
  caroni: { rif: 'J-41208765-7', nombre: 'Inversiones Caroní 2020, C.A.' },
  farmacia: { rif: 'J-29887123-7', nombre: 'Farmacia Santa Rosa, C.A.' },
  miniMarket: { rif: 'J-40331122-6', nombre: 'Mini Market El Sol, C.A.' },
};

const PROVEEDORES = {
  servicios: { rif: 'J-31445566-4', nombre: 'Servicios Generales del Zulia, C.A.' },
  alimentos: { rif: 'J-40777555-3', nombre: 'Alimentos del Centro, C.A.' },
  consultor: { rif: 'V-15432109-4', nombre: 'Juan Carlos Pérez (Consultor)' },
  papeleria: { rif: 'J-40199288-9', nombre: 'Papelería Moderna, C.A.' },
};

const r = (n) => Math.round(n * 100) / 100;
const igtf3 = (totalVes) => r(totalVes * 0.03);

const log = (...a) => console.log('  ', ...a);

async function main() {
  console.log(`Sisven Cont · seed demo → ${BASE}`);

  // 1. Login
  const login = await req('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
  const tok = login.access_token;
  log(`Login OK (${EMAIL})`);

  // 2. Empresa demo (idempotente)
  const tenants = await req('GET', '/tenants', undefined, tok);
  let tenant = tenants.find((t) => t.razon_social === DEMO.razon_social);
  if (tenant) {
    console.log(`\nLa empresa "${DEMO.razon_social}" ya existe (${tenant.tenant_id}).`);
    console.log('No se duplican datos. Si quieres recargar, bórrala de la BD primero.');
    return;
  }
  tenant = await req('POST', '/tenants', DEMO, tok);
  const T = tenant.tenant_id;
  log(`Empresa creada: ${tenant.razon_social} · ${tenant.rif}`);

  await req('PATCH', `/tenants/${T}/exchange-rate`, { tasa: TASA }, tok);
  log(`Tasa BCV manual fijada en ${TASA}`);

  // 3. Asiento de capital inicial (módulo MANUAL)
  const chart = await req('GET', '/chart-of-accounts', undefined, tok, T);
  const acc = (code) => chart.find((a) => a.code === code);
  await req('POST', '/journal-entries', {
    entry_date: '2026-10-01',
    concept: 'Constitución: aporte de capital social en cuenta corriente',
    bcv_exchange_rate: TASA,
    lines: [
      { account_id: acc('1.1.01.02.01.000').account_id, description: 'Depósito inicial Banco de Venezuela', debit_ves: 150000 },
      { account_id: acc('3.1.01.01.00.000').account_id, description: 'Capital social suscrito y pagado', credit_ves: 150000 },
    ],
  }, tok, T);
  log('Asiento de capital social: Bs. 150.000,00');

  // 4. Ventas de octubre
  const ventas = [
    { d: '2026-10-02', c: CLIENTES.losAndes, in: 'USD', base: 1200, ex: 0, cond: 'CONTADO', cobro: 'USD' },
    { d: '2026-10-06', c: CLIENTES.bodegon, in: 'VES', base: 18250, ex: 0, cond: 'CONTADO', cobro: 'VES' },
    { d: '2026-10-09', c: CLIENTES.caroni, in: 'USD', base: 2500, ex: 0, cond: 'CREDITO' },
    { d: '2026-10-17', c: CLIENTES.farmacia, in: 'VES', base: 9500, ex: 4500, cond: 'CONTADO', cobro: 'VES' },
    { d: '2026-10-23', c: CLIENTES.miniMarket, in: 'USD', base: 450, ex: 0, cond: 'CONTADO', cobro: 'USD' },
  ];
  for (const v of ventas) {
    const baseVes = v.in === 'USD' ? r(v.base * TASA) : v.base;
    const igtf = v.cobro === 'USD' ? igtf3(baseVes + r(baseVes * 0.16)) : 0;
    const res = await req('POST', '/sales', {
      fecha_factura: v.d, rif_comprador: v.c.rif, nombre_comprador: v.c.nombre,
      amounts_in: v.in, base_imponible: v.base, ventas_exentas: v.ex,
      condicion: v.cond, cobro_en: v.cobro, igtf_percibido_3: igtf,
      bcv_exchange_rate: TASA,
    }, tok, T);
    log(`Venta ${res.numero_factura} · ${v.c.nombre} · ${v.cond}`);
  }

  // 5. Compras de octubre (generan retenciones IVA + ISLR)
  const compras = [
    { d: '2026-10-03', p: PROVEEDORES.servicios, fac: 'F-11023', ctl: '00-011023', base: 20000, islr: '057', ben: 'PJ_DOM', desc: 'Flete y servicios de distribución' },
    { d: '2026-10-08', p: PROVEEDORES.alimentos, fac: 'F-88421', ctl: '00-088421', base: 60000, islr: null, desc: 'Compra de mercancía para reventa' },
    { d: '2026-10-14', p: PROVEEDORES.consultor, fac: 'F-0033', ctl: '00-000033', base: 12000, islr: '001', ben: 'PNR', ut: 9, desc: 'Honorarios profesionales consultoría' },
    { d: '2026-10-21', p: PROVEEDORES.papeleria, fac: 'F-334455', ctl: '00-334455', base: 4800, islr: null, desc: 'Útiles y material de oficina' },
  ];
  for (const c of compras) {
    const res = await req('POST', '/purchases', {
      fecha_factura: c.d, rif_proveedor: c.p.rif, nombre_proveedor: c.p.nombre,
      numero_factura: c.fac, numero_control: c.ctl,
      expense_description: c.desc, amounts_in: 'VES',
      base_imponible: c.base, bcv_exchange_rate: TASA,
      islr_concepto_codigo: c.islr ?? undefined,
      islr_beneficiary_type: c.ben, valor_ut: c.ut ?? 0,
    }, tok, T);
    log(`Compra ${c.fac} · ${c.p.nombre} · IVA ret. ${res.iva_retenido} · ISLR ${res.islr_retenido} · comp. ${res.comprobante_iva ?? '—'}`);
  }

  // 6. Banco: cuenta + extracto + libro interno (SIN conciliar, para el video)
  const bank = await req('POST', '/banks/accounts', {
    bank_name: 'Banco de Venezuela', account_number: '0102-0451-78-9100112233',
    currency: 'VES', description: 'Cuenta corriente principal',
  }, tok, T);
  const ACC = bank.account_id;
  log(`Cuenta bancaria: ${bank.bank_name} ···${bank.account_number.slice(-4)}`);

  const movimientos = [
    { d: '2026-10-05', ref: 'TRF-000458', concepto: 'Pago Servicios Generales del Zulia F-11023 (neto retenciones)', tipo: 'DEBITO', monto: 20400 },
    { d: '2026-10-12', ref: 'TRF-000466', concepto: 'Pago Alimentos del Centro F-88421', tipo: 'DEBITO', monto: 62400 },
    { d: '2026-10-26', ref: 'CHQ-000112', concepto: 'Cheque nómina 2da quincena octubre', tipo: 'DEBITO', monto: 24300 },
  ];
  for (const m of movimientos) {
    await req('POST', '/banks/movements', {
      bank_account_id: ACC, movement_date: m.d, reference_number: m.ref,
      concept: m.concepto, movement_type: m.tipo, amount: m.monto,
    }, tok, T);
  }
  log('Libro interno: 3 movimientos');

  const extracto = [
    { d: '2026-10-05', ref: 'TRF-000458', desc: 'TRANSFERENCIA A SU CUENTA', tipo: 'DEBITO', monto: 20400 },      // fase 1 exacta
    { d: '2026-10-13', ref: 'TRF-000470', desc: 'TRF PAGO PROVEEDOR', tipo: 'DEBITO', monto: 62400 },              // fase 2 temporal
    { d: '2026-10-16', ref: 'ABONO-7734', desc: 'TRANSFERENCIA RECIBIDA', tipo: 'CREDITO', monto: 41500 },         // fase 3 alerta
    { d: '2026-10-20', ref: 'DB-IGTF-221', desc: 'DB IGTF IMPUESTO 3% OPERACIONES CAMBIARIAS', tipo: 'DEBITO', monto: 1524.24 }, // fase 4 IGTF
    { d: '2026-10-22', ref: 'POS-8841', desc: 'COMISION PUNTO DE VENTA OCT', tipo: 'DEBITO', monto: 580 },          // fase 4 comisión
    { d: '2026-10-26', ref: 'CHQ-000112', desc: 'CHEQUE COMPENSADO', tipo: 'DEBITO', monto: 24300 },                // fase 1 exacta
  ];
  for (const s of extracto) {
    await req('POST', '/banks/statements', {
      bank_account_id: ACC, transaction_date: s.d, reference_number: s.ref,
      description: s.desc, movement_type: s.tipo, amount: s.monto,
    }, tok, T);
  }
  log('Extracto: 6 partidas (2 exactas, 1 temporal, 1 abono sin soporte, IGTF + comisión)');

  // 7. Verificación final
  const bs = await req('GET', '/reports/balance-sheet?as_of=2026-10-31', undefined, tok, T);
  const tb = await req('GET', '/reports/trial-balance?year=2026&period=10', undefined, tok, T);
  console.log('\n✔ Seed demo completo');
  console.log(`  Empresa: ${tenant.razon_social} · ${tenant.rif}`);
  console.log(`  Cuadre balance general (debe ser 0): ${bs.balance_check_ves}`);
  console.log(`  Movimientos oct: Debe ${tb.totals.movement_debit_ves} / Haber ${tb.totals.movement_credit_ves}`);
  console.log(`  RIF para la factura EN VIVO del video: ${CLIENTES.losAndes.rif} (Comercial Los Andes, C.A.)`);
  console.log('  La conciliación bancaria quedó PENDIENTE para ejecutarla en el video.');
}

main().catch((e) => { console.error('✘', e.message); process.exit(1); });
