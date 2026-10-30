import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne,
  OneToMany, PrimaryGeneratedColumn, Unique,
} from 'typeorm';
import { decimalColumn } from '../common/numeric.transformer';

export type AccountNature = 'DEUDORA' | 'ACREEDORA';
export type PeriodStatus = 'ABIERTO' | 'CERRADO';
export type EntryStatus = 'BORRADOR' | 'ASENTADO' | 'ANULADO';
export type SourceModule = 'VENTAS' | 'COBROS' | 'COMPRAS' | 'BANCOS' | 'MANUAL';

/**
 * Plan de Cuentas VEN-NIF PYME (BA VEN-NIF 8), jerarquía de 6 niveles:
 * Clase.Grupo.Subgrupo.Rubro.Subcuenta.Auxiliar  →  N.N.NN.NN.NN.NNN
 */
@Entity('chart_of_accounts')
@Unique(['tenant_id', 'code'])
@Index(['tenant_id', 'parent_id'])
export class ChartOfAccount {
  @PrimaryGeneratedColumn('uuid')
  account_id: string;

  @Column()
  tenant_id: string;

  @Column({ length: 20 })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'int' })
  level: number;

  @Column({ type: 'varchar', nullable: true })
  parent_id: string | null;

  @Column({ type: 'varchar', length: 10 })
  nature: AccountNature;

  /** Sólo cuentas seleccionables (auxiliares) admiten movimientos */
  @Column({ type: 'boolean', default: false })
  is_selectable: boolean;

  @Column({ type: 'varchar', nullable: true })
  niif_classification: string | null;
}

@Entity('fiscal_periods')
@Unique(['tenant_id', 'fiscal_year', 'fiscal_month'])
export class FiscalPeriod {
  @PrimaryGeneratedColumn('uuid')
  period_id: string;

  @Column()
  tenant_id: string;

  @Column({ type: 'int' })
  fiscal_year: number;

  @Column({ type: 'int' })
  fiscal_month: number;

  @Column({ type: 'varchar', length: 10, default: 'ABIERTO' })
  status: PeriodStatus;
}

@Entity('journal_entries')
@Index(['tenant_id', 'fiscal_year', 'fiscal_period'])
@Index(['tenant_id', 'status'])
export class JournalEntry {
  @PrimaryGeneratedColumn('uuid')
  entry_id: string;

  @Column()
  tenant_id: string;

  @Column({ type: 'int' })
  fiscal_year: number;

  @Column({ type: 'int' })
  fiscal_period: number;

  /** Correlativo por empresa y ejercicio */
  @Column({ type: 'int' })
  entry_number: number;

  @Column({ type: 'date' })
  entry_date: string;

  @Column()
  concept: string;

  @Column({ type: 'varchar', length: 10 })
  source_module: SourceModule;

  @Column({ type: 'varchar', nullable: true })
  source_document_id: string | null;

  @Column({ type: 'varchar', length: 10, default: 'ASENTADO' })
  status: EntryStatus;

  @Column({ ...decimalColumn(18, 6) })
  bcv_exchange_rate: number;

  @Column(decimalColumn())
  total_debit_ves: number;

  @Column(decimalColumn())
  total_credit_ves: number;

  @Column(decimalColumn())
  total_debit_usd: number;

  @Column(decimalColumn())
  total_credit_usd: number;

  @Column({ type: 'varchar', nullable: true })
  created_by: string | null;

  @OneToMany(() => JournalEntryLine, (l) => l.entry, { cascade: true })
  lines: JournalEntryLine[];

  @CreateDateColumn()
  created_at: Date;
}

@Entity('journal_entry_lines')
@Index(['tenant_id', 'account_id'])
@Index(['entry_id'])
export class JournalEntryLine {
  @PrimaryGeneratedColumn('uuid')
  line_id: string;

  @Column()
  tenant_id: string;

  @Column()
  entry_id: string;

  @ManyToOne(() => JournalEntry, (e) => e.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entry_id' })
  entry: JournalEntry;

  @Column({ type: 'varchar', nullable: true })
  account_id: string | null;

  @Column({ length: 20 })
  account_code: string;

  @Column()
  account_name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({ ...decimalColumn(), default: 0 })
  debit_ves: number;

  @Column({ ...decimalColumn(), default: 0 })
  credit_ves: number;

  @Column({ ...decimalColumn(), default: 0 })
  debit_usd: number;

  @Column({ ...decimalColumn(), default: 0 })
  credit_usd: number;

  @Column({ ...decimalColumn(18, 6) })
  bcv_rate: number;

  @Column({ type: 'varchar', nullable: true })
  third_party_rif: string | null;

  @Column({ type: 'varchar', nullable: true })
  cost_center: string | null;
}
