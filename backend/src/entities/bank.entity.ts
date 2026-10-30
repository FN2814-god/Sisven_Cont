import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalColumn } from '../common/numeric.transformer';

export type MovementType = 'DEBITO' | 'CREDITO';
export type ReconciliationState =
  | 'PENDIENTE'
  | 'CONCILIADO'
  | 'DISCREPANCIA'
  | 'IDENTIFICACION_REQUERIDA';
export type ReconciliationType =
  | 'EXACTA_NIVEL_1'
  | 'NUMERICA_TEMPORAL'
  | 'AGRUPADA_POS'
  | 'MANUAL';

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  account_id: string;

  @Column()
  tenant_id: string;

  @Column()
  bank_name: string;

  @Column()
  account_number: string;

  @Column({ type: 'varchar', length: 3, default: 'VES' })
  currency: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}

/** Líneas del extracto bancario importadas */
@Entity('bank_statements')
@Index(['tenant_id', 'transaction_date'])
export class BankStatement {
  @PrimaryGeneratedColumn('uuid')
  statement_id: string;

  @Column()
  tenant_id: string;

  @Column({ type: 'varchar', nullable: true })
  bank_account_id: string | null;

  @Column({ type: 'date' })
  transaction_date: string;

  @Column()
  reference_number: string;

  @Column()
  description: string;

  @Column({ type: 'varchar', length: 10 })
  movement_type: MovementType;

  @Column(decimalColumn())
  amount: number;

  @Column({ type: 'varchar', length: 30, default: 'PENDIENTE' })
  status: ReconciliationState;

  @Column({ type: 'varchar', nullable: true })
  matched_movement_id: string | null;

  @Column({ type: 'varchar', nullable: true })
  reconciliation_type: string | null;

  @CreateDateColumn()
  created_at: Date;
}

/** Libro interno de banco (operaciones registradas en el ERP) */
@Entity('bank_movements')
@Index(['tenant_id', 'movement_date'])
export class BankMovement {
  @PrimaryGeneratedColumn('uuid')
  movement_id: string;

  @Column()
  tenant_id: string;

  @Column({ type: 'varchar', nullable: true })
  bank_account_id: string | null;

  @Column({ type: 'date' })
  movement_date: string;

  @Column()
  reference_number: string;

  @Column()
  concept: string;

  @Column({ type: 'varchar', length: 10 })
  movement_type: MovementType;

  @Column(decimalColumn())
  amount: number;

  @Column({ type: 'varchar', nullable: true })
  sales_invoice_number: string | null;

  @Column({ type: 'varchar', length: 30, default: 'PENDIENTE' })
  status: ReconciliationState;

  @CreateDateColumn()
  created_at: Date;
}

/** Auditoría de emparejamientos de conciliación */
@Entity('bank_reconciliations')
export class BankReconciliation {
  @PrimaryGeneratedColumn('uuid')
  reconciliation_id: string;

  @Column()
  tenant_id: string;

  @Column()
  statement_id: string;

  @Column({ type: 'varchar', nullable: true })
  movement_id: string | null;

  @Column({ type: 'varchar', length: 30 })
  reconciliation_type: ReconciliationType;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  matched_at: Date;
}
