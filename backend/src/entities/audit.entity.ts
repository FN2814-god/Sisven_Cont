import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn,
} from 'typeorm';

/** Bitácora de auditoría básica de operaciones mutantes */
@Entity('audit_log')
@Index(['tenant_id', 'created_at'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  audit_id: string;

  @Column({ type: 'varchar', nullable: true })
  user_id: string | null;

  @Column({ type: 'varchar', nullable: true })
  tenant_id: string | null;

  /** ej. 'POST /api/v1/sales' */
  @Column()
  action: string;

  @Column({ type: 'varchar', nullable: true })
  entity: string | null;

  @Column({ type: 'varchar', nullable: true })
  entity_id: string | null;

  /** Resumen JSON del payload (truncado) */
  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @CreateDateColumn()
  created_at: Date;
}
