import {
  Column, CreateDateColumn, Entity, PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalColumn } from '../common/numeric.transformer';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  tenant_id: string;

  @Column({ unique: true })
  rif: string;

  @Column()
  razon_social: string;

  @Column({ type: 'varchar', nullable: true })
  nombre_comercial: string;

  /** Sujeto Pasivo Especial (SPE): agente de retención de IVA */
  @Column({ type: 'boolean', default: false })
  es_contribuyente_especial: boolean;

  @Column({ ...decimalColumn(5, 2), default: 75.0 })
  porcentaje_retencion_iva: number;

  @Column({ type: 'varchar', length: 3, default: 'VES' })
  moneda_funcional: string;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  moneda_presentacion: string;

  /** Tasa BCV manual de respaldo cuando la API no responde */
  @Column({ ...decimalColumn(18, 6), nullable: true })
  tasa_bcv_manual: number | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}
