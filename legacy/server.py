#!/usr/bin/env python3
"""
Sisven Cont - Servidor Backend API REST y Servidor Web
Persistencia relacional real con SQLite (sisven.db) adaptada a VEN-NIF PYME y SENIAT.
"""

import http.server
import json
import os
import sqlite3
import sys
import urllib.parse
from datetime import datetime

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sisven.db')

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    
    # 1. Tenants (Empresas)
    c.execute('''
    CREATE TABLE IF NOT EXISTS tenants (
        tenant_id TEXT PRIMARY KEY,
        rif TEXT NOT NULL UNIQUE,
        razon_social TEXT NOT NULL,
        nombre_comercial TEXT,
        es_contribuyente_especial INTEGER NOT NULL DEFAULT 0,
        porcentaje_retencion_iva REAL NOT NULL DEFAULT 75.0,
        moneda_funcional TEXT NOT NULL DEFAULT 'VES',
        moneda_presentacion TEXT NOT NULL DEFAULT 'USD',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
    )
    ''')

    # 2. Plan de Cuentas
    c.execute('''
    CREATE TABLE IF NOT EXISTS chart_of_accounts (
        account_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        level INTEGER NOT NULL,
        nature TEXT NOT NULL,
        is_selectable INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
        UNIQUE (tenant_id, code)
    )
    ''')

    # 3. Asientos Contables
    c.execute('''
    CREATE TABLE IF NOT EXISTS journal_entries (
        entry_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        fiscal_year INTEGER NOT NULL,
        fiscal_period INTEGER NOT NULL,
        entry_number INTEGER NOT NULL,
        entry_date TEXT NOT NULL,
        concept TEXT NOT NULL,
        source_module TEXT NOT NULL,
        source_document_id TEXT,
        status TEXT NOT NULL DEFAULT 'ASENTADO',
        bcv_exchange_rate REAL NOT NULL,
        total_debit_ves REAL NOT NULL,
        total_credit_ves REAL NOT NULL,
        total_debit_usd REAL NOT NULL,
        total_credit_usd REAL NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
    )
    ''')

    # 4. Líneas de Asiento
    c.execute('''
    CREATE TABLE IF NOT EXISTS journal_entry_lines (
        line_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        entry_id TEXT NOT NULL,
        account_code TEXT NOT NULL,
        account_name TEXT NOT NULL,
        description TEXT,
        debit_ves REAL NOT NULL DEFAULT 0.0,
        credit_ves REAL NOT NULL DEFAULT 0.0,
        debit_usd REAL NOT NULL DEFAULT 0.0,
        credit_usd REAL NOT NULL DEFAULT 0.0,
        bcv_rate REAL NOT NULL,
        third_party_rif TEXT,
        FOREIGN KEY (entry_id) REFERENCES journal_entries(entry_id) ON DELETE CASCADE
    )
    ''')

    # 5. Libro de Ventas (SENIAT PA 00071 / PA 00093 / PA 00102)
    c.execute('''
    CREATE TABLE IF NOT EXISTS sales_book (
        sale_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        fiscal_year INTEGER NOT NULL,
        fiscal_period INTEGER NOT NULL,
        numero_operacion INTEGER NOT NULL,
        fecha_factura TEXT NOT NULL,
        rif_comprador TEXT NOT NULL,
        nombre_comprador TEXT NOT NULL,
        numero_factura TEXT NOT NULL,
        numero_control TEXT NOT NULL,
        total_ventas_con_iva REAL NOT NULL,
        ventas_exentas REAL NOT NULL DEFAULT 0.0,
        base_imponible_16 REAL NOT NULL,
        debito_fiscal_16 REAL NOT NULL,
        iva_retenido_terceros REAL NOT NULL DEFAULT 0.0,
        igtf_percibido_3 REAL NOT NULL DEFAULT 0.0,
        bcv_exchange_rate REAL NOT NULL,
        journal_entry_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
        UNIQUE (tenant_id, numero_factura, numero_control)
    )
    ''')

    # 6. Libro de Compras (SENIAT PA 00071 / PA 00093)
    c.execute('''
    CREATE TABLE IF NOT EXISTS purchases_book (
        purchase_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        fiscal_year INTEGER NOT NULL,
        fiscal_period INTEGER NOT NULL,
        numero_operacion INTEGER NOT NULL,
        fecha_factura TEXT NOT NULL,
        rif_proveedor TEXT NOT NULL,
        nombre_proveedor TEXT NOT NULL,
        numero_factura TEXT NOT NULL,
        numero_control TEXT NOT NULL,
        total_compras_con_iva REAL NOT NULL,
        base_imponible_16 REAL NOT NULL,
        credito_fiscal_16 REAL NOT NULL,
        iva_retenido REAL NOT NULL DEFAULT 0.0,
        numero_comprobante_ret_iva TEXT,
        islr_retenido REAL NOT NULL DEFAULT 0.0,
        islr_concepto_codigo TEXT,
        bcv_exchange_rate REAL NOT NULL,
        journal_entry_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
    )
    ''')

    # 7. Retenciones de IVA (Oficial TXT)
    c.execute('''
    CREATE TABLE IF NOT EXISTS tax_retentions_iva (
        retention_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        rif_agente TEXT NOT NULL,
        periodo_impositivo TEXT NOT NULL,
        fecha_factura TEXT NOT NULL,
        tipo_operacion TEXT NOT NULL DEFAULT 'C',
        tipo_documento TEXT NOT NULL DEFAULT '01',
        rif_retenido TEXT NOT NULL,
        numero_factura TEXT NOT NULL,
        numero_control TEXT NOT NULL,
        monto_total_con_iva REAL NOT NULL,
        base_imponible REAL NOT NULL,
        monto_iva_retenido REAL NOT NULL,
        numero_factura_afectada TEXT NOT NULL DEFAULT '0',
        numero_comprobante TEXT NOT NULL UNIQUE,
        monto_exento REAL NOT NULL DEFAULT 0.0,
        alicuota_aplicada REAL NOT NULL DEFAULT 16.0,
        numero_expediente TEXT NOT NULL DEFAULT '0',
        created_at TEXT NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
    )
    ''')

    # 8. Retenciones de ISLR (Oficial XML)
    c.execute('''
    CREATE TABLE IF NOT EXISTS tax_retentions_islr (
        retention_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        rif_agente TEXT NOT NULL,
        periodo_anomes TEXT NOT NULL,
        rif_retenido TEXT NOT NULL,
        numero_factura TEXT NOT NULL,
        numero_control TEXT NOT NULL,
        fecha_operacion TEXT NOT NULL,
        codigo_concepto TEXT NOT NULL,
        monto_operacion REAL NOT NULL,
        porcentaje_retencion REAL NOT NULL,
        monto_sustraendo REAL NOT NULL DEFAULT 0.0,
        monto_retenido REAL NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
    )
    ''')

    # 9. Conciliación Bancaria (Extracto y Libro Interno)
    c.execute('''
    CREATE TABLE IF NOT EXISTS bank_statements (
        statement_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        transaction_date TEXT NOT NULL,
        reference_number TEXT NOT NULL,
        description TEXT NOT NULL,
        movement_type TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDIENTE',
        matched_movement_id TEXT,
        reconciliation_type TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
    )
    ''')

    c.execute('''
    CREATE TABLE IF NOT EXISTS bank_movements (
        movement_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        movement_date TEXT NOT NULL,
        reference_number TEXT NOT NULL,
        concept TEXT NOT NULL,
        movement_type TEXT NOT NULL,
        amount REAL NOT NULL,
        sales_invoice_number TEXT,
        status TEXT NOT NULL DEFAULT 'PENDIENTE',
        created_at TEXT NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
    )
    ''')

    conn.commit()
    conn.close()

# Handler HTTP
class SisvenRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Tenant-Id')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def parse_body(self):
        length = int(self.headers.get('Content-Length', 0))
        if length > 0:
            return json.loads(self.rfile.read(length).decode('utf-8'))
        return {}

    def send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Responder a solicitudes del navegador para favicon y devtools
        if path == '/favicon.ico':
            self.send_response(200)
            self.send_header('Content-Type', 'image/svg+xml')
            self.end_headers()
            svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#2563eb"/><text x="50" y="65" font-size="50" font-family="sans-serif" font-weight="900" text-anchor="middle" fill="#fff">SC</text></svg>'
            self.wfile.write(svg.encode('utf-8'))
            return

        if path.startswith('/.well-known/'):
            self.send_response(204)
            self.end_headers()
            return

        if path.startswith('/api/'):
            conn = get_db()
            c = conn.cursor()
            tenant_id = self.headers.get('X-Tenant-Id') or (query.get('tenant_id', [''])[0])

            if path == '/api/tenants':
                c.execute('SELECT * FROM tenants WHERE is_active = 1 ORDER BY razon_social')
                rows = [dict(r) for r in c.fetchall()]
                conn.close()
                return self.send_json(200, rows)

            if path == '/api/sales':
                if not tenant_id:
                    conn.close()
                    return self.send_json(400, {'error': 'tenant_id es requerido'})
                c.execute('SELECT * FROM sales_book WHERE tenant_id = ? ORDER BY numero_operacion DESC', (tenant_id,))
                rows = [dict(r) for r in c.fetchall()]
                conn.close()
                return self.send_json(200, rows)

            if path == '/api/purchases':
                if not tenant_id:
                    conn.close()
                    return self.send_json(400, {'error': 'tenant_id es requerido'})
                c.execute('SELECT * FROM purchases_book WHERE tenant_id = ? ORDER BY numero_operacion DESC', (tenant_id,))
                rows = [dict(r) for r in c.fetchall()]
                conn.close()
                return self.send_json(200, rows)

            if path == '/api/retentions/iva':
                if not tenant_id:
                    conn.close()
                    return self.send_json(400, {'error': 'tenant_id es requerido'})
                period = query.get('periodo', [''])[0]
                sql = 'SELECT * FROM tax_retentions_iva WHERE tenant_id = ?'
                params = [tenant_id]
                if period:
                    sql += ' AND periodo_impositivo = ?'
                    params.append(period)
                c.execute(sql + ' ORDER BY fecha_factura DESC', tuple(params))
                rows = [dict(r) for r in c.fetchall()]
                conn.close()
                return self.send_json(200, rows)

            if path == '/api/retentions/islr':
                if not tenant_id:
                    conn.close()
                    return self.send_json(400, {'error': 'tenant_id es requerido'})
                period = query.get('periodo', [''])[0]
                sql = 'SELECT * FROM tax_retentions_islr WHERE tenant_id = ?'
                params = [tenant_id]
                if period:
                    sql += ' AND periodo_anomes = ?'
                    params.append(period)
                c.execute(sql + ' ORDER BY fecha_operacion DESC', tuple(params))
                rows = [dict(r) for r in c.fetchall()]
                conn.close()
                return self.send_json(200, rows)

            if path == '/api/bank/statements':
                if not tenant_id:
                    conn.close()
                    return self.send_json(400, {'error': 'tenant_id es requerido'})
                c.execute('SELECT * FROM bank_statements WHERE tenant_id = ? ORDER BY transaction_date DESC', (tenant_id,))
                rows = [dict(r) for r in c.fetchall()]
                conn.close()
                return self.send_json(200, rows)

            if path == '/api/bank/movements':
                if not tenant_id:
                    conn.close()
                    return self.send_json(400, {'error': 'tenant_id es requerido'})
                c.execute('SELECT * FROM bank_movements WHERE tenant_id = ? ORDER BY movement_date DESC', (tenant_id,))
                rows = [dict(r) for r in c.fetchall()]
                conn.close()
                return self.send_json(200, rows)

            if path == '/api/stats':
                if not tenant_id:
                    conn.close()
                    return self.send_json(400, {'error': 'tenant_id es requerido'})
                # Ventas del mes
                c.execute('SELECT COALESCE(SUM(total_ventas_con_iva), 0) as total_ves FROM sales_book WHERE tenant_id = ?', (tenant_id,))
                total_sales_ves = c.fetchone()['total_ves']
                # Retenciones IVA por enterar (emitidas a proveedores en compras)
                c.execute('SELECT COALESCE(SUM(monto_iva_retenido), 0) as total_ret_ves FROM tax_retentions_iva WHERE tenant_id = ?', (tenant_id,))
                total_ret_ves = c.fetchone()['total_ret_ves']
                # Movimientos pendientes de banco
                c.execute('SELECT COUNT(*) as pending FROM bank_statements WHERE tenant_id = ? AND status = "PENDIENTE"', (tenant_id,))
                pending_bank = c.fetchone()['pending']
                conn.close()
                return self.send_json(200, {
                    'total_sales_ves': total_sales_ves,
                    'total_ret_ves': total_ret_ves,
                    'pending_bank_count': pending_bank
                })

            conn.close()
            return self.send_json(404, {'error': 'Ruta de API no encontrada'})

        # Si no es /api/, servir archivo estático (index.html, dashboard.html, etc.)
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith('/api/'):
            body = self.parse_body()
            conn = get_db()
            c = conn.cursor()
            now_iso = datetime.now().isoformat()

            if path == '/api/tenants':
                # Crear nuevo Tenant
                import uuid
                tenant_id = body.get('tenant_id') or str(uuid.uuid4())
                rif = body.get('rif', '').strip().upper()
                razon_social = body.get('razon_social', '').strip()
                es_spe = 1 if body.get('es_contribuyente_especial') else 0
                pct_ret = float(body.get('porcentaje_retencion_iva', 75.0 if es_spe else 0.0))

                try:
                    c.execute('''
                    INSERT INTO tenants (tenant_id, rif, razon_social, nombre_comercial, es_contribuyente_especial, porcentaje_retencion_iva, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (tenant_id, rif, razon_social, body.get('nombre_comercial', razon_social), es_spe, pct_ret, now_iso))
                    conn.commit()
                    conn.close()
                    return self.send_json(201, {'tenant_id': tenant_id, 'message': 'Empresa creada con éxito'})
                except Exception as e:
                    conn.close()
                    return self.send_json(400, {'error': str(e)})

            if path == '/api/sales':
                # Registrar Factura de Venta Real
                import uuid
                sale_id = str(uuid.uuid4())
                tenant_id = body.get('tenant_id')
                if not tenant_id:
                    conn.close()
                    return self.send_json(400, {'error': 'tenant_id es requerido'})

                date_str = body.get('fecha_factura', datetime.now().strftime('%Y-%m-%d'))
                dt = datetime.strptime(date_str, '%Y-%m-%d')
                year, period = dt.year, dt.month

                c.execute('SELECT COALESCE(MAX(numero_operacion), 0) + 1 as next_op FROM sales_book WHERE tenant_id = ?', (tenant_id,))
                numero_operacion = c.fetchone()['next_op']

                c.execute('SELECT COALESCE(MAX(CAST(numero_factura AS INTEGER)), 0) + 1 as next_fac FROM sales_book WHERE tenant_id = ?', (tenant_id,))
                next_fac = c.fetchone()['next_fac']
                numero_factura = body.get('numero_factura') or f"{next_fac:06d}"
                numero_control = body.get('numero_control') or f"00-{next_fac:06d}"

                base_16 = float(body.get('base_imponible_16', 0.0))
                debito_16 = round(base_16 * 0.16, 2)
                igtf_3 = float(body.get('igtf_percibido_3', 0.0))
                iva_ret = float(body.get('iva_retenido_terceros', 0.0))
                total_con_iva = round(base_16 + debito_16 + igtf_3, 2)
                bcv_rate = float(body.get('bcv_exchange_rate', 36.5))

                # Asiento Contable Automático
                entry_id = str(uuid.uuid4())
                c.execute('SELECT COALESCE(MAX(entry_number), 0) + 1 as next_en FROM journal_entries WHERE tenant_id = ?', (tenant_id,))
                entry_number = c.fetchone()['next_en']

                total_usd = round(total_con_iva / bcv_rate, 2)
                base_usd = round(base_16 / bcv_rate, 2)
                debito_usd = round(debito_16 / bcv_rate, 2)
                igtf_usd = round(igtf_3 / bcv_rate, 2)

                c.execute('''
                INSERT INTO journal_entries (entry_id, tenant_id, fiscal_year, fiscal_period, entry_number, entry_date, concept, source_module, source_document_id, status, bcv_exchange_rate, total_debit_ves, total_credit_ves, total_debit_usd, total_credit_usd, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (entry_id, tenant_id, year, period, entry_number, date_str, f"Factura de Venta N° {numero_factura} a {body.get('nombre_comprador')}", 'VENTAS', sale_id, 'ASENTADO', bcv_rate, total_con_iva, total_con_iva, total_usd, total_usd, now_iso))

                # Líneas de Asiento
                c.execute('''
                INSERT INTO journal_entry_lines (line_id, tenant_id, entry_id, account_code, account_name, debit_ves, credit_ves, debit_usd, credit_usd, bcv_rate, third_party_rif)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (str(uuid.uuid4()), tenant_id, entry_id, '1.1.01.01.00.000', 'Caja / Banco Liquidación', total_con_iva, 0.0, total_usd, 0.0, bcv_rate, body.get('rif_comprador')))

                c.execute('''
                INSERT INTO journal_entry_lines (line_id, tenant_id, entry_id, account_code, account_name, debit_ves, credit_ves, debit_usd, credit_usd, bcv_rate, third_party_rif)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (str(uuid.uuid4()), tenant_id, entry_id, '4.1.01.01.01.000', 'Ventas de Mercancías Gravadas 16%', 0.0, base_16, 0.0, base_usd, bcv_rate, body.get('rif_comprador')))

                c.execute('''
                INSERT INTO journal_entry_lines (line_id, tenant_id, entry_id, account_code, account_name, debit_ves, credit_ves, debit_usd, credit_usd, bcv_rate, third_party_rif)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (str(uuid.uuid4()), tenant_id, entry_id, '2.1.02.01.01.000', 'Débito Fiscal IVA 16%', 0.0, debito_16, 0.0, debito_usd, bcv_rate, body.get('rif_comprador')))

                if igtf_3 > 0:
                    c.execute('''
                    INSERT INTO journal_entry_lines (line_id, tenant_id, entry_id, account_code, account_name, debit_ves, credit_ves, debit_usd, credit_usd, bcv_rate, third_party_rif)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (str(uuid.uuid4()), tenant_id, entry_id, '2.1.02.01.04.000', 'IGTF por Pagar / Enterar (3%)', 0.0, igtf_3, 0.0, igtf_usd, bcv_rate, body.get('rif_comprador')))

                # Guardar en Libro de Ventas
                c.execute('''
                INSERT INTO sales_book (sale_id, tenant_id, fiscal_year, fiscal_period, numero_operacion, fecha_factura, rif_comprador, nombre_comprador, numero_factura, numero_control, total_ventas_con_iva, base_imponible_16, debito_fiscal_16, iva_retenido_terceros, igtf_percibido_3, bcv_exchange_rate, journal_entry_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (sale_id, tenant_id, year, period, numero_operacion, date_str, body.get('rif_comprador'), body.get('nombre_comprador'), numero_factura, numero_control, total_con_iva, base_16, debito_16, iva_ret, igtf_3, bcv_rate, entry_id, now_iso))

                conn.commit()
                conn.close()
                return self.send_json(201, {'sale_id': sale_id, 'numero_factura': numero_factura, 'numero_operacion': numero_operacion, 'total_ventas_con_iva': total_con_iva})

            if path == '/api/purchases':
                # Registrar Factura de Compra Real con Retenciones de IVA e ISLR
                import uuid
                purchase_id = str(uuid.uuid4())
                tenant_id = body.get('tenant_id')
                if not tenant_id:
                    conn.close()
                    return self.send_json(400, {'error': 'tenant_id es requerido'})

                date_str = body.get('fecha_factura', datetime.now().strftime('%Y-%m-%d'))
                dt = datetime.strptime(date_str, '%Y-%m-%d')
                year, period = dt.year, dt.month

                c.execute('SELECT COALESCE(MAX(numero_operacion), 0) + 1 as next_op FROM purchases_book WHERE tenant_id = ?', (tenant_id,))
                numero_operacion = c.fetchone()['next_op']

                base_16 = float(body.get('base_imponible_16', 0.0))
                credito_16 = round(base_16 * 0.16, 2)
                total_con_iva = round(base_16 + credito_16, 2)
                bcv_rate = float(body.get('bcv_exchange_rate', 36.5))

                # Obtener condición SPE del comprador
                c.execute('SELECT es_contribuyente_especial, porcentaje_retencion_iva, rif FROM tenants WHERE tenant_id = ?', (tenant_id,))
                t_row = c.fetchone()
                es_spe = t_row['es_contribuyente_especial'] if t_row else 0
                pct_iva_ret = float(body.get('porcentaje_retencion_iva') or (t_row['porcentaje_retencion_iva'] if es_spe else 0.0))
                rif_agente = t_row['rif'].replace('-', '') if t_row else 'J000000000'

                iva_ret = round(credito_16 * (pct_iva_ret / 100.0), 2) if es_spe else 0.0

                # Comprobante IVA (14 dígitos: AAAAMM + 8 correlativos)
                c.execute('SELECT COUNT(*) + 1 as count_ret FROM tax_retentions_iva WHERE tenant_id = ?', (tenant_id,))
                seq_ret = c.fetchone()['count_ret']
                periodo_anomes = f"{year}{period:02d}"
                num_comprobante_iva = f"{periodo_anomes}{seq_ret:08d}"

                # Retención ISLR
                islr_concepto = body.get('islr_concepto_codigo', '057')
                pct_islr = float(body.get('islr_porcentaje', 2.0))
                islr_ret = round(base_16 * (pct_islr / 100.0), 2)

                # Guardar en purchases_book
                c.execute('''
                INSERT INTO purchases_book (purchase_id, tenant_id, fiscal_year, fiscal_period, numero_operacion, fecha_factura, rif_proveedor, nombre_proveedor, numero_factura, numero_control, total_compras_con_iva, base_imponible_16, credito_fiscal_16, iva_retenido, numero_comprobante_ret_iva, islr_retenido, islr_concepto_codigo, bcv_exchange_rate, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (purchase_id, tenant_id, year, period, numero_operacion, date_str, body.get('rif_proveedor'), body.get('nombre_proveedor'), body.get('numero_factura'), body.get('numero_control'), total_con_iva, base_16, credito_16, iva_ret, num_comprobante_iva if iva_ret > 0 else None, islr_ret, islr_concepto, bcv_rate, now_iso))

                # Si es SPE y retiene IVA, guardar en tax_retentions_iva
                if iva_ret > 0:
                    c.execute('''
                    INSERT INTO tax_retentions_iva (retention_id, tenant_id, rif_agente, periodo_impositivo, fecha_factura, rif_retenido, numero_factura, numero_control, monto_total_con_iva, base_imponible, monto_iva_retenido, numero_comprobante, alicuota_aplicada, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (str(uuid.uuid4()), tenant_id, rif_agente, periodo_anomes, date_str, body.get('rif_proveedor').replace('-', ''), body.get('numero_factura'), body.get('numero_control'), total_con_iva, base_16, iva_ret, num_comprobante_iva, 16.0, now_iso))

                # Si retiene ISLR, guardar en tax_retentions_islr
                if islr_ret > 0:
                    c.execute('''
                    INSERT INTO tax_retentions_islr (retention_id, tenant_id, rif_agente, periodo_anomes, rif_retenido, numero_factura, numero_control, fecha_operacion, codigo_concepto, monto_operacion, porcentaje_retencion, monto_sustraendo, monto_retenido, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (str(uuid.uuid4()), tenant_id, rif_agente, periodo_anomes, body.get('rif_proveedor').replace('-', ''), body.get('numero_factura'), body.get('numero_control'), date_str, islr_concepto, base_16, pct_islr, 0.0, islr_ret, now_iso))

                conn.commit()
                conn.close()
                return self.send_json(201, {'purchase_id': purchase_id, 'numero_operacion': numero_operacion, 'iva_retenido': iva_ret, 'comprobante_iva': num_comprobante_iva if iva_ret > 0 else None})

            if path == '/api/bank/statements':
                # Agregar línea de extracto bancario
                import uuid
                statement_id = str(uuid.uuid4())
                tenant_id = body.get('tenant_id')
                c.execute('''
                INSERT INTO bank_statements (statement_id, tenant_id, transaction_date, reference_number, description, movement_type, amount, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (statement_id, tenant_id, body.get('transaction_date'), body.get('reference_number'), body.get('description'), body.get('movement_type'), float(body.get('amount')), now_iso))
                conn.commit()
                conn.close()
                return self.send_json(201, {'statement_id': statement_id, 'message': 'Línea de extracto guardada'})

            conn.close()
            return self.send_json(404, {'error': 'Ruta de API no encontrada'})

        return super().do_POST()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    init_db()
    server = http.server.HTTPServer(('0.0.0.0', port), SisvenRequestHandler)
    print(f"Servidor Sisven Cont ejecutándose en http://localhost:{port}")
    print(f"Base de datos SQLite persistente: {DB_FILE}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        server.server_close()
