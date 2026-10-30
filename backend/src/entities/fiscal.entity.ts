import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique,
} from 'typeorm';
import { decimalColumn } from '../common/numeric.transformer';

/** Libro de Ventas — PA SNAT/2011/00071, PA 00102, PA 00093 (registro bimoneda) */
@Entity('sales_book')
@Unique(['tenant_id', 'numero_factura', 'numero_control'])
@Index(['tenant_id', 'fiscal_year', 'fiscal_period'])
export class SalesBook {
  @PrimaryGeneratedColumn('uuid')
  sale_id: string;

  @Column()
  tenant_id: string;

  @Column({ type: 'int' })
  fiscal_year: number;

  @Column({ type: 'int' })
  fiscal_period: number;

  @Column({ type: 'int' })
  numero_operacion: number;

  @Column({ type: 'date' })
  fecha_factura: string;

  @Column()
  rif_comprador: string;

  @Column()
  nombre_comprador: string;

  @Column()
  numero_factura: string;

  @Column()
  numero_control: string;

  @Column(decimalColumn())
  total_ventas_con_iva: number;

  @Column({ ...decimalColumn(), default: 0 })
  ventas_exentas: number;

  @Column(decimalColumn())
  base_imponible_16: number;

  @Column(decimalColumn())
  debito_fiscal_16: number;

  /** IVA retenido por el comprador cuando éste es agente de retención */
  @Column({ ...decimalColumn(), default: 0 })
  iva_retenido_terceros: number;

  /** IGTF 3% percibido en cobros en divisas */
  @Column({ ...decimalColumn(), default: 0 })
  igtf_percibido_3: number;

  @Column({ ...decimalColumn(18, 6) })
  bcv_exchange_rate: number;

  @Column({ type: 'varchar', nullable: true })
  journal_entry_id: string | null;

  @CreateDateColumn()
  created_at: Date;
}

/** Libro de Compras — PA SNAT/2011/00071, PA 00093 */
@Entity('purchases_book')
@Index(['tenant_id', 'fiscal_year', 'fiscal_period'])
export class PurchasesBook {
  @PrimaryGeneratedColumn('uuid')
  purchase_id: string;

  @Column()
  tenant_id: string;

  @Column({ type: 'int' })
  fiscal_year: number;

  @Column({ type: 'int' })
  fiscal_period: number;

  @Column({ type: 'int' })
  numero_operacion: number;

  @Column({ type: 'date' })
  fecha_factura: string;

  @Column()
  rif_proveedor: string;

  @Column()
  nombre_proveedor: string;

  @Column()
  numero_factura: string;

  @Column()
  numero_control: string;

  @Column(decimalColumn())
  total_compras_con_iva: number;

  @Column({ ...decimalColumn(), default: 0 })
  compras_exentas: number;

  @Column(decimalColumn())
  base_imponible_16: number;

  @Column(decimalColumn())
  credito_fiscal_16: number;

  @Column({ ...decimalColumn(), default: 0 })
  iva_retenido: number;

  @Column({ type: 'varchar', nullable: true })
  numero_comprobante_ret_iva: string | null;

  @Column({ ...decimalColumn(), default: 0 })
  islr_retenido: number;

  @Column({ type: 'varchar', nullable: true })
  islr_concepto_codigo: string | null;

  @Column({ ...decimalColumn(18, 6) })
  bcv_exchange_rate: number;

  @Column({ type: 'varchar', nullable: true })
  journal_entry_id: string | null;

  @CreateDateColumn()
  created_at: Date;
}

/** Retenciones de IVA practicadas — exportación TXT oficial (PA 00054/00093) */
@Entity('tax_retentions_iva')
@Unique(['tenant_id', 'numero_comprobante'])
export class TaxRetentionIva {
  @PrimaryGeneratedColumn('uuid')
  retention_id: string;

  @Column()
  tenant_id: string;

  @Column()
  rif_agente: string;

  /** AAAAMM */
  @Column({ length: 6 })
  periodo_impositivo: string;

  @Column({ type: 'date' })
  fecha_factura: string;

  @Column({ type: 'varchar', length: 1, default: 'C' })
  tipo_operacion: string;

  /** '01' Factura | '02' ND | '03' NC */
  @Column({ type: 'varchar', length: 2, default: '01' })
  tipo_documento: string;

  @Column()
  rif_retenido: string;

  @Column()
  numero_factura: string;

  @Column()
  numero_control: string;

  @Column(decimalColumn())
  monto_total_con_iva: number;

  @Column(decimalColumn())
  base_imponible: number;

  @Column(decimalColumn())
  monto_iva_retenido: number;

  @Column({ default: '0' })
  numero_factura_afectada: string;

  /** 14 dígitos: AAAAMM + 8 correlativos (único por empresa) */
  @Column({ length: 14 })
  numero_comprobante: string;

  @Column({ ...decimalColumn(), default: 0 })
  monto_exento: number;

  @Column({ ...decimalColumn(5, 2), default: 16.0 })
  alicuota_aplicada: number;

  @Column({ default: '0' })
  numero_expediente: string;

  @CreateDateColumn()
  created_at: Date;
}

/** Retenciones de ISLR practicadas — exportación XML oficial (Decreto 1808 / PA 00102) */
@Entity('tax_retentions_islr')
export class TaxRetentionIslr {
  @PrimaryGeneratedColumn('uuid')
  retention_id: string;

  @Column()
  tenant_id: string;

  @Column()
  rif_agente: string;

  /** AAAAMM */
  @Column({ length: 6 })
  periodo_anomes: string;

  @Column()
  rif_retenido: string;

  @Column()
  numero_factura: string;

  @Column()
  numero_control: string;

  @Column({ type: 'date' })
  fecha_operacion: string;

  /** Código de concepto Decreto 1808 (3 dígitos, ej. '057') */
  @Column({ length: 3 })
  codigo_concepto: string;

  @Column(decimalColumn())
  monto_operacion: number;

  @Column({ ...decimalColumn(6, 2) })
  porcentaje_retencion: number;

  @Column({ ...decimalColumn(), default: 0 })
  monto_sustraendo: number;

  @Column(decimalColumn())
  monto_retenido: number;

  @CreateDateColumn()
  created_at: Date;
}
