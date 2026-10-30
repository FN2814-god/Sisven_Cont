-- =========================================================================================
-- SISVEN CONT: ESQUEMA DE BASE DE DATOS POSTGRESQL MULTI-TENANT (SAAS)
-- Marco Normativo: VEN-NIF PYME | SENIAT (PA 00071, PA 00093, PA 00102, D-1808, Ley IVA)
-- Versión: 2.0 Production-Ready
-- =========================================================================================

-- Habilitación de extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================================
-- TIPOS ENUMERADOS DEL SISTEMA
-- =========================================================================================

CREATE TYPE account_nature_enum AS ENUM ('DEUDORA', 'ACREEDORA');

CREATE TYPE account_niif_class_enum AS ENUM (
    'ACTIVO_CORRIENTE',
    'ACTIVO_NO_CORRIENTE',
    'PASIVO_CORRIENTE',
    'PASIVO_NO_CORRIENTE',
    'PATRIMONIO',
    'INGRESOS_OPERACIONALES',
    'COSTO_DE_VENTAS',
    'GASTOS_OPERACIONALES',
    'OTROS_INGRESOS_GASTOS',
    'IMPUESTO_SOBRE_LA_RENTA',
    'ORDEN'
);

CREATE TYPE entry_status_enum AS ENUM ('BORRADOR', 'ASENTADO', 'ANULADO');

CREATE TYPE fiscal_doc_type_enum AS ENUM (
    '01_FACTURA',
    '02_NOTA_DEBITO',
    '03_NOTA_CREDITO',
    '04_CERTIFICADO_EXPORTACION',
    '05_LIQUIDACION_ADUANERA'
);

CREATE TYPE fiscal_transaction_type_enum AS ENUM ('01_REG', '02_COMP', '03_ANUL');

CREATE TYPE bank_movement_type_enum AS ENUM ('DEBITO', 'CREDITO');

CREATE TYPE reconciliation_status_enum AS ENUM ('PENDIENTE', 'CONCILIADO', 'DISCREPANCIA');

-- =========================================================================================
-- 1. MULTI-TENANCY Y DESPACHOS CONTABLES
-- =========================================================================================

CREATE TABLE despachos (
    despacho_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rif VARCHAR(12) NOT NULL UNIQUE,
    razon_social VARCHAR(200) NOT NULL,
    correo_contacto VARCHAR(120) NOT NULL,
    telefono_contacto VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_despacho_rif_format CHECK (rif ~* '^[JVEG]-[0-9]{8}-[0-9]$')
);

COMMENT ON TABLE despachos IS 'Entidad administradora del despacho contable que gestiona múltiples empresas/clientes.';

CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    despacho_id UUID REFERENCES despachos(despacho_id) ON DELETE SET NULL,
    rif VARCHAR(12) NOT NULL UNIQUE,
    razon_social VARCHAR(200) NOT NULL,
    nombre_comercial VARCHAR(200),
    es_contribuyente_especial BOOLEAN NOT NULL DEFAULT FALSE,
    porcentaje_retencion_iva NUMERIC(5, 2) NOT NULL DEFAULT 75.00,
    moneda_funcional VARCHAR(3) NOT NULL DEFAULT 'VES',
    moneda_presentacion VARCHAR(3) NOT NULL DEFAULT 'USD',
    ejercicio_fiscal_inicio_mes SMALLINT NOT NULL DEFAULT 1,
    direccion_fiscal TEXT,
    telefono VARCHAR(30),
    email VARCHAR(120),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tenant_rif_format CHECK (rif ~* '^[JVEG]-[0-9]{8}-[0-9]$'),
    CONSTRAINT chk_tenant_ret_iva_pct CHECK (porcentaje_retencion_iva IN (75.00, 100.00)),
    CONSTRAINT chk_tenant_fiscal_month CHECK (ejercicio_fiscal_inicio_mes BETWEEN 1 AND 12)
);

COMMENT ON TABLE tenants IS 'Clientes/Empresas operativas del despacho contable bajo modelo multi-tenant SaaS.';
COMMENT ON COLUMN tenants.es_contribuyente_especial IS 'Indica designación por Providencia del SENIAT como Sujeto Pasivo Especial (Agente de Retención).';
COMMENT ON COLUMN tenants.porcentaje_retencion_iva IS 'Porcentaje estándar de retención de IVA según providencia SENIAT (75% general o 100% especial).';

-- =========================================================================================
-- FUNCIÓN HELPER DE SESIÓN PARA RLS
-- =========================================================================================

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =========================================================================================
-- 2. MÓDULO CONTABLE (VEN-NIF PYME / BA VEN-NIF 8)
-- =========================================================================================

CREATE TABLE chart_of_accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(200) NOT NULL,
    level INTEGER NOT NULL,
    nature account_nature_enum NOT NULL,
    niif_classification account_niif_class_enum NOT NULL,
    parent_id UUID REFERENCES chart_of_accounts(account_id) ON DELETE RESTRICT,
    is_selectable BOOLEAN NOT NULL DEFAULT TRUE,
    requires_third_party BOOLEAN NOT NULL DEFAULT FALSE,
    requires_cost_center BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_tenant_account_code UNIQUE (tenant_id, code),
    CONSTRAINT chk_account_level CHECK (level BETWEEN 1 AND 6)
);

COMMENT ON TABLE chart_of_accounts IS 'Catálogo de cuentas VEN-NIF PYME estructurado en 6 niveles jerárquicos (Clase, Grupo, Subgrupo, Rubro, Subcuenta, Auxiliar).';
COMMENT ON COLUMN chart_of_accounts.code IS 'Formato jerárquico VEN-NIF: X.X.XX.XX.XX.XXX';
COMMENT ON COLUMN chart_of_accounts.is_selectable IS 'Indica si la cuenta acepta asientos directos (Nivel 6 / Auxiliar) o es cuenta totalizadora de acumulación.';

CREATE TABLE journal_entries (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    fiscal_period SMALLINT NOT NULL,
    entry_number BIGINT NOT NULL,
    entry_date DATE NOT NULL,
    concept TEXT NOT NULL,
    source_module VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
    source_document_id UUID,
    status entry_status_enum NOT NULL DEFAULT 'BORRADOR',
    bcv_exchange_rate NUMERIC(14, 4) NOT NULL,
    is_closing_entry BOOLEAN NOT NULL DEFAULT FALSE,
    is_adjustment_entry BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID,
    approved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_tenant_entry_number UNIQUE (tenant_id, fiscal_year, entry_number),
    CONSTRAINT chk_fiscal_period CHECK (fiscal_period BETWEEN 1 AND 12),
    CONSTRAINT chk_bcv_rate_positive CHECK (bcv_exchange_rate > 0)
);

COMMENT ON TABLE journal_entries IS 'Comprobantes y asientos contables de diario con registro cronológico bimoneda.';

CREATE TABLE journal_entry_lines (
    line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    entry_id UUID NOT NULL REFERENCES journal_entries(entry_id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(account_id) ON DELETE RESTRICT,
    line_number INTEGER NOT NULL,
    third_party_rif VARCHAR(12),
    description VARCHAR(255),
    debit_amount_ves NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    credit_amount_ves NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    debit_amount_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    credit_amount_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    bcv_exchange_rate NUMERIC(14, 4) NOT NULL,
    cost_center_code VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_tenant_entry_line UNIQUE (tenant_id, entry_id, line_number),
    CONSTRAINT chk_amounts_non_negative CHECK (
        debit_amount_ves >= 0.00 AND credit_amount_ves >= 0.00 AND
        debit_amount_usd >= 0.00 AND credit_amount_usd >= 0.00
    ),
    CONSTRAINT chk_balanced_movement CHECK (
        (debit_amount_ves > 0.00 AND credit_amount_ves = 0.00) OR
        (credit_amount_ves > 0.00 AND debit_amount_ves = 0.00) OR
        (debit_amount_ves = 0.00 AND credit_amount_ves = 0.00)
    )
);

COMMENT ON TABLE journal_entry_lines IS 'Líneas de comprobante contable registradas en bimoneda (VES y USD de presentación al BCV).';

-- =========================================================================================
-- 3. MÓDULO FISCAL SENIAT (LIBROS Y RETENCIONES)
-- =========================================================================================

-- 3.1. Libro de Ventas (PA SNAT/2011/00071, PA SNAT/2024/000102 y PA SNAT/2026/00093)
CREATE TABLE sales_book (
    sale_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    fiscal_period SMALLINT NOT NULL,
    numero_operacion BIGINT NOT NULL,
    fecha_factura DATE NOT NULL,
    tipo_documento fiscal_doc_type_enum NOT NULL DEFAULT '01_FACTURA',
    rif_comprador VARCHAR(12) NOT NULL,
    nombre_comprador VARCHAR(200) NOT NULL,
    numero_factura VARCHAR(20) NOT NULL,
    numero_control VARCHAR(20) NOT NULL,
    numero_nota_debito VARCHAR(20),
    numero_nota_credito VARCHAR(20),
    tipo_transaccion fiscal_transaction_type_enum NOT NULL DEFAULT '01_REG',
    factura_afectada VARCHAR(20),
    total_ventas_con_iva NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    ventas_exentas_no_gravadas NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    base_imponible_16 NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    alicuota_16 NUMERIC(5, 2) NOT NULL DEFAULT 16.00,
    debito_fiscal_16 NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    base_imponible_8 NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    alicuota_8 NUMERIC(5, 2) NOT NULL DEFAULT 8.00,
    debito_fiscal_8 NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    base_imponible_31 NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    alicuota_31 NUMERIC(5, 2) NOT NULL DEFAULT 31.00,
    debito_fiscal_31 NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    iva_retenido_terceros NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    numero_comprobante_ret_recibido VARCHAR(20),
    fecha_comprobante_ret DATE,
    monto_cobrado_divisas NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    base_imponible_igtf NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    alicuota_igtf NUMERIC(5, 2) NOT NULL DEFAULT 3.00,
    igtf_percibido_3 NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    bcv_exchange_rate NUMERIC(14, 4) NOT NULL,
    journal_entry_id UUID REFERENCES journal_entries(entry_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_tenant_sales_operation UNIQUE (tenant_id, fiscal_year, fiscal_period, numero_operacion),
    CONSTRAINT uk_tenant_sales_invoice UNIQUE (tenant_id, tipo_documento, numero_factura, numero_control),
    CONSTRAINT chk_sales_period CHECK (fiscal_period BETWEEN 1 AND 12)
);

COMMENT ON TABLE sales_book IS 'Libro de Ventas Fiscal bajo normas SENIAT PA 00071, 00093 y 00102 con desglose de IVA e IGTF 3%.';

-- 3.2. Libro de Compras (PA SNAT/2011/00071 y PA SNAT/2026/00093)
CREATE TABLE purchases_book (
    purchase_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    fiscal_period SMALLINT NOT NULL,
    numero_operacion BIGINT NOT NULL,
    fecha_factura DATE NOT NULL,
    fecha_recepcion DATE NOT NULL,
    tipo_documento fiscal_doc_type_enum NOT NULL DEFAULT '01_FACTURA',
    rif_proveedor VARCHAR(12) NOT NULL,
    nombre_proveedor VARCHAR(200) NOT NULL,
    numero_factura VARCHAR(20) NOT NULL,
    numero_control VARCHAR(20) NOT NULL,
    numero_nota_debito VARCHAR(20),
    numero_nota_credito VARCHAR(20),
    tipo_transaccion fiscal_transaction_type_enum NOT NULL DEFAULT '01_REG',
    factura_afectada VARCHAR(20),
    numero_planilla_importacion VARCHAR(30),
    numero_expediente_import VARCHAR(30),
    total_compras_con_iva NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    compras_sin_credito_fiscal NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    base_imponible_16 NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    alicuota_16 NUMERIC(5, 2) NOT NULL DEFAULT 16.00,
    credito_fiscal_16 NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    base_imponible_8 NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    alicuota_8 NUMERIC(5, 2) NOT NULL DEFAULT 8.00,
    credito_fiscal_8 NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    base_imponible_31 NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    alicuota_31 NUMERIC(5, 2) NOT NULL DEFAULT 31.00,
    credito_fiscal_31 NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    porcentaje_retencion_aplicado NUMERIC(5, 2) NOT NULL DEFAULT 75.00,
    iva_retenido_proveedor NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    numero_comprobante_ret VARCHAR(14),
    bcv_exchange_rate NUMERIC(14, 4) NOT NULL,
    journal_entry_id UUID REFERENCES journal_entries(entry_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_tenant_purchase_operation UNIQUE (tenant_id, fiscal_year, fiscal_period, numero_operacion),
    CONSTRAINT uk_tenant_purchase_doc UNIQUE (tenant_id, rif_proveedor, tipo_documento, numero_factura, numero_control),
    CONSTRAINT chk_purchases_period CHECK (fiscal_period BETWEEN 1 AND 12)
);

COMMENT ON TABLE purchases_book IS 'Libro de Compras Fiscal bajo normas SENIAT PA 00071 y 00093 con soporte de crédito fiscal y retenciones aplicadas.';

-- 3.3. Retenciones de IVA (Exportación TXT Oficial SENIAT - Providencia SNAT/2025/000054 / PA 00093)
CREATE TABLE tax_retentions_iva (
    retention_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    purchase_id UUID REFERENCES purchases_book(purchase_id) ON DELETE SET NULL,
    rif_agente VARCHAR(10) NOT NULL,
    periodo_impositivo VARCHAR(6) NOT NULL,
    fecha_factura DATE NOT NULL,
    tipo_operacion VARCHAR(1) NOT NULL DEFAULT 'C',
    tipo_documento VARCHAR(2) NOT NULL,
    rif_retenido VARCHAR(10) NOT NULL,
    numero_factura VARCHAR(20) NOT NULL,
    numero_control VARCHAR(20) NOT NULL,
    monto_total_con_iva NUMERIC(18, 2) NOT NULL,
    base_imponible NUMERIC(18, 2) NOT NULL,
    monto_iva_retenido NUMERIC(18, 2) NOT NULL,
    numero_factura_afectada VARCHAR(20) NOT NULL DEFAULT '0',
    numero_comprobante VARCHAR(14) NOT NULL,
    monto_exento NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    alicuota_aplicada NUMERIC(5, 2) NOT NULL DEFAULT 16.00,
    numero_expediente_importacion VARCHAR(30) NOT NULL DEFAULT '0',
    status_declaracion VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    fecha_emision_comprobante DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_tenant_ret_iva_comp UNIQUE (tenant_id, numero_comprobante),
    CONSTRAINT chk_periodo_impositivo_format CHECK (periodo_impositivo ~ '^[0-9]{6}$'),
    CONSTRAINT chk_rif_agente_txt CHECK (rif_agente ~ '^[JVEG][0-9]{9}$'),
    CONSTRAINT chk_rif_retenido_txt CHECK (rif_retenido ~ '^[JVEG][0-9]{9}$'),
    CONSTRAINT chk_num_comprobante_len CHECK (length(numero_comprobante) = 14)
);

COMMENT ON TABLE tax_retentions_iva IS 'Retenciones de IVA emitidas estructuradas conforme a los 16 campos exactos del archivo TXT delimitado por tabulaciones para el portal del SENIAT.';
COMMENT ON COLUMN tax_retentions_iva.numero_comprobante IS 'Formato legal estricto de 14 dígitos: AAAAMM (6 dígitos) + 8 dígitos correlativos (ej. 20260300000001).';

-- 3.4. Retenciones de ISLR (Exportación XML Oficial SENIAT - Decreto 1808 / PA 00102)
CREATE TABLE tax_retentions_islr (
    retention_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    purchase_id UUID REFERENCES purchases_book(purchase_id) ON DELETE SET NULL,
    rif_agente VARCHAR(10) NOT NULL,
    periodo_anomes VARCHAR(6) NOT NULL,
    rif_retenido VARCHAR(10) NOT NULL,
    numero_factura VARCHAR(20) NOT NULL,
    numero_control VARCHAR(20) NOT NULL,
    fecha_operacion DATE NOT NULL,
    codigo_concepto VARCHAR(3) NOT NULL,
    monto_operacion NUMERIC(18, 2) NOT NULL,
    porcentaje_retencion NUMERIC(5, 2) NOT NULL,
    monto_sustraendo NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    monto_retenido NUMERIC(18, 2) NOT NULL,
    numero_comprobante VARCHAR(20) NOT NULL,
    status_declaracion VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_tenant_ret_islr_comp UNIQUE (tenant_id, numero_comprobante),
    CONSTRAINT chk_periodo_islr_format CHECK (periodo_anomes ~ '^[0-9]{6}$'),
    CONSTRAINT chk_codigo_concepto_3d CHECK (codigo_concepto ~ '^[0-9]{3}$'),
    CONSTRAINT chk_rif_agente_islr CHECK (rif_agente ~ '^[JVEG][0-9]{9}$'),
    CONSTRAINT chk_rif_retenido_islr CHECK (rif_retenido ~ '^[JVEG][0-9]{9}$')
);

COMMENT ON TABLE tax_retentions_islr IS 'Retenciones de ISLR practicadas bajo el Decreto 1808 y PA 00102, formateadas para compilación del archivo XML para el SENIAT.';

-- =========================================================================================
-- 4. MÓDULO DE CONCILIACIÓN BANCARIA Y CONTROL DE FLUJO
-- =========================================================================================

CREATE TABLE bank_accounts (
    bank_account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(account_id) ON DELETE RESTRICT,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(20) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'VES',
    description VARCHAR(150),
    current_balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_tenant_bank_account_num UNIQUE (tenant_id, account_number),
    CONSTRAINT chk_bank_num_format CHECK (account_number ~ '^[0-9]{20}$')
);

COMMENT ON TABLE bank_accounts IS 'Cuentas bancarias de la empresa (formato estricto cuenta nacional de 20 dígitos).';

-- 4.1. Líneas importadas del extracto bancario (OFX / CSV / API bancaria)
CREATE TABLE bank_statements (
    statement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(bank_account_id) ON DELETE CASCADE,
    import_batch_id UUID NOT NULL,
    transaction_date DATE NOT NULL,
    value_date DATE NOT NULL,
    reference_number VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    movement_type bank_movement_type_enum NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    balance_after_transaction NUMERIC(18, 2),
    reconciliation_status reconciliation_status_enum NOT NULL DEFAULT 'PENDIENTE',
    reconciled_at TIMESTAMP WITH TIME ZONE,
    matched_movement_id UUID,
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_statement_amount_pos CHECK (amount > 0)
);

COMMENT ON TABLE bank_statements IS 'Líneas físicas importadas de estados de cuenta bancarios (OFX/CSV/Excel/API).';

-- 4.2. Libro de Banco interno (Operaciones registradas en el sistema ERP/Contable)
CREATE TABLE bank_movements (
    movement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(bank_account_id) ON DELETE CASCADE,
    journal_entry_id UUID REFERENCES journal_entries(entry_id) ON DELETE SET NULL,
    movement_date DATE NOT NULL,
    reference_number VARCHAR(50) NOT NULL,
    beneficiary_or_payer VARCHAR(200) NOT NULL,
    movement_type bank_movement_type_enum NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    bcv_exchange_rate NUMERIC(14, 4) NOT NULL,
    concept TEXT NOT NULL,
    reconciliation_status reconciliation_status_enum NOT NULL DEFAULT 'PENDIENTE',
    statement_line_id UUID REFERENCES bank_statements(statement_id) ON DELETE SET NULL,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    discrepancy_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_movement_amount_pos CHECK (amount > 0)
);

COMMENT ON TABLE bank_movements IS 'Libro auxiliar de bancos interno generado a partir de cobros, pagos, transferencias y cheques.';

-- 4.3. Tabla de Auditoría y Emparejamiento de Conciliaciones
CREATE TABLE bank_reconciliations (
    reconciliation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    statement_id UUID NOT NULL REFERENCES bank_statements(statement_id) ON DELETE CASCADE,
    movement_id UUID NOT NULL REFERENCES bank_movements(movement_id) ON DELETE CASCADE,
    reconciliation_type VARCHAR(30) NOT NULL, -- 'EXACTA_NIVEL_1', 'NUMERICA_TEMPORAL', 'AGRUPADA_POS', 'MANUAL'
    matched_amount NUMERIC(18, 2) NOT NULL,
    difference_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    reconciled_by UUID,
    reconciled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    CONSTRAINT uk_reconciled_statement UNIQUE (statement_id)
);

COMMENT ON TABLE bank_reconciliations IS 'Historial y evidencia formal de conciliaciones automáticas y manuales.';

-- Actualizar clave foránea diferida en bank_statements hacia bank_movements
ALTER TABLE bank_statements
    ADD CONSTRAINT fk_statement_matched_mov
    FOREIGN KEY (matched_movement_id)
    REFERENCES bank_movements(movement_id)
    ON DELETE SET NULL;

-- =========================================================================================
-- ÍNDICES DE RENDIMIENTO (OPTIMIZACIÓN SAAS Y CONSULTAS CRÍTICAS)
-- =========================================================================================

-- Índices Contables
CREATE INDEX idx_chart_accounts_tenant_parent ON chart_of_accounts (tenant_id, parent_id);
CREATE INDEX idx_chart_accounts_tenant_code ON chart_of_accounts (tenant_id, code);
CREATE INDEX idx_journal_entries_lookup ON journal_entries (tenant_id, fiscal_year, fiscal_period, entry_date);
CREATE INDEX idx_journal_entries_status ON journal_entries (tenant_id, status);
CREATE INDEX idx_journal_lines_account ON journal_entry_lines (tenant_id, account_id, created_at);
CREATE INDEX idx_journal_lines_entry ON journal_entry_lines (entry_id);

-- Índices Fiscales SENIAT
CREATE INDEX idx_sales_book_period ON sales_book (tenant_id, fiscal_year, fiscal_period, fecha_factura);
CREATE INDEX idx_sales_book_rif_doc ON sales_book (tenant_id, rif_comprador, numero_factura);
CREATE INDEX idx_purchases_book_period ON purchases_book (tenant_id, fiscal_year, fiscal_period, fecha_factura);
CREATE INDEX idx_purchases_book_rif_doc ON purchases_book (tenant_id, rif_proveedor, numero_factura);
CREATE INDEX idx_ret_iva_export ON tax_retentions_iva (tenant_id, periodo_impositivo, status_declaracion);
CREATE INDEX idx_ret_islr_export ON tax_retentions_islr (tenant_id, periodo_anomes, status_declaracion);

-- Índices de Conciliación Bancaria
CREATE INDEX idx_bank_stmt_matching ON bank_statements (tenant_id, bank_account_id, reconciliation_status, value_date, amount);
CREATE INDEX idx_bank_stmt_ref ON bank_statements (tenant_id, reference_number);
CREATE INDEX idx_bank_mov_matching ON bank_movements (tenant_id, bank_account_id, reconciliation_status, movement_date, amount);
CREATE INDEX idx_bank_mov_ref ON bank_movements (tenant_id, reference_number);

-- =========================================================================================
-- CONFIGURACIÓN DE ROW-LEVEL SECURITY (RLS) ESTRICTA
-- =========================================================================================

-- Habilitar RLS en cada tabla de datos operativos del tenant
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_retentions_iva ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_retentions_islr ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;

-- Forzar RLS incluso para propietarios de tablas en modo producción
ALTER TABLE chart_of_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE journal_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE sales_book FORCE ROW LEVEL SECURITY;
ALTER TABLE purchases_book FORCE ROW LEVEL SECURITY;
ALTER TABLE tax_retentions_iva FORCE ROW LEVEL SECURITY;
ALTER TABLE tax_retentions_islr FORCE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE bank_statements FORCE ROW LEVEL SECURITY;
ALTER TABLE bank_movements FORCE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliations FORCE ROW LEVEL SECURITY;

-- Creación de Políticas de Aislamiento Tenant (Políticas RLS)
CREATE POLICY rls_chart_of_accounts ON chart_of_accounts
    FOR ALL USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY rls_journal_entries ON journal_entries
    FOR ALL USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY rls_journal_entry_lines ON journal_entry_lines
    FOR ALL USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY rls_sales_book ON sales_book
    FOR ALL USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY rls_purchases_book ON purchases_book
    FOR ALL USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY rls_tax_retentions_iva ON tax_retentions_iva
    FOR ALL USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY rls_tax_retentions_islr ON tax_retentions_islr
    FOR ALL USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY rls_bank_accounts ON bank_accounts
    FOR ALL USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY rls_bank_statements ON bank_statements
    FOR ALL USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY rls_bank_movements ON bank_movements
    FOR ALL USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY rls_bank_reconciliations ON bank_reconciliations
    FOR ALL USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

-- =========================================================================================
-- DISPARADORES Y REGLAS DE INTEGRIDAD FINANCIERA (TRIGGERS)
-- =========================================================================================

-- Trigger para validar el cuadre estricto de partida doble antes de asentar un comprobante
CREATE OR REPLACE FUNCTION fn_verify_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_total_debit_ves NUMERIC(18, 2);
    v_total_credit_ves NUMERIC(18, 2);
    v_total_debit_usd NUMERIC(18, 2);
    v_total_credit_usd NUMERIC(18, 2);
    v_line_count INTEGER;
BEGIN
    IF NEW.status = 'ASENTADO' AND (OLD.status IS NULL OR OLD.status != 'ASENTADO') THEN
        SELECT 
            COALESCE(SUM(debit_amount_ves), 0.00),
            COALESCE(SUM(credit_amount_ves), 0.00),
            COALESCE(SUM(debit_amount_usd), 0.00),
            COALESCE(SUM(credit_amount_usd), 0.00),
            COUNT(*)
        INTO 
            v_total_debit_ves,
            v_total_credit_ves,
            v_total_debit_usd,
            v_total_credit_usd,
            v_line_count
        FROM journal_entry_lines
        WHERE entry_id = NEW.entry_id AND tenant_id = NEW.tenant_id;

        IF v_line_count < 2 THEN
            RAISE EXCEPTION 'El comprobante % debe tener al menos 2 líneas para cumplir la partida doble.', NEW.entry_number;
        END IF;

        IF v_total_debit_ves <> v_total_credit_ves THEN
            RAISE EXCEPTION 'Descuadre contable en VES para el comprobante %: Débito=%, Crédito=%, Diferencia=%',
                NEW.entry_number, v_total_debit_ves, v_total_credit_ves, (v_total_debit_ves - v_total_credit_ves);
        END IF;

        IF v_total_debit_usd <> v_total_credit_usd THEN
            RAISE EXCEPTION 'Descuadre contable en USD para el comprobante %: Débito=%, Crédito=%, Diferencia=%',
                NEW.entry_number, v_total_debit_usd, v_total_credit_usd, (v_total_debit_usd - v_total_credit_usd);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_verify_journal_entry_balance
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION fn_verify_journal_entry_balance();
