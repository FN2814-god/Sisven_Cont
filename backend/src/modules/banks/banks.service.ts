import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  BankAccount, BankMovement, BankReconciliation, BankStatement,
} from '../../entities/bank.entity';
import { Tenant } from '../../entities/tenant.entity';
import { BankReconciliationEngine } from '../../shared/accounting/bank-reconciliation-engine';
import {
  BankStatementLineItem, InternalBankMovement,
} from '../../shared/accounting/types';

@Injectable()
export class BanksService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(BankAccount) private readonly accounts: Repository<BankAccount>,
    @InjectRepository(BankStatement) private readonly statements: Repository<BankStatement>,
    @InjectRepository(BankMovement) private readonly movements: Repository<BankMovement>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
  ) {}

  // ── Cuentas bancarias ──────────────────────────────────────────
  listAccounts(tenantId: string) {
    return this.accounts.find({ where: { tenant_id: tenantId } });
  }

  createAccount(tenantId: string, dto: Partial<BankAccount>) {
    return this.accounts.save(this.accounts.create({ ...dto, tenant_id: tenantId }));
  }

  // ── Extracto bancario ─────────────────────────────────────────
  listStatements(tenantId: string, status?: string) {
    const where: any = { tenant_id: tenantId };
    if (status) where.status = status;
    return this.statements.find({ where, order: { transaction_date: 'DESC' }, take: 1000 });
  }

  addStatement(tenantId: string, dto: Partial<BankStatement>) {
    if (!dto.transaction_date || !dto.reference_number || !dto.amount) {
      throw new BadRequestException('Fecha, referencia y monto son requeridos');
    }
    return this.statements.save(this.statements.create({ ...dto, tenant_id: tenantId }));
  }

  // ── Libro interno de banco ────────────────────────────────────
  listMovements(tenantId: string, status?: string) {
    const where: any = { tenant_id: tenantId };
    if (status) where.status = status;
    return this.movements.find({ where, order: { movement_date: 'DESC' }, take: 1000 });
  }

  addMovement(tenantId: string, dto: Partial<BankMovement>) {
    if (!dto.movement_date || !dto.reference_number || !dto.amount) {
      throw new BadRequestException('Fecha, referencia y monto son requeridos');
    }
    return this.movements.save(this.movements.create({ ...dto, tenant_id: tenantId }));
  }

  /**
   * Ejecuta la conciliación en 4 fases sobre las partidas PENDIENTE/alerta
   * y persiste los emparejamientos con su auditoría.
   */
  async reconcile(tenantId: string, bankAccountId?: string, bcvRate?: number) {
    const tenant = await this.tenants.findOne({ where: { tenant_id: tenantId } });
    const rate = bcvRate ?? tenant?.tasa_bcv_manual ?? 0;
    if (!rate || rate <= 0) {
      throw new BadRequestException('Se requiere tasa BCV (parámetro bcv_rate o tasa manual)');
    }

    const stmtWhere: any = { tenant_id: tenantId };
    const movWhere: any = { tenant_id: tenantId };
    if (bankAccountId) {
      stmtWhere.bank_account_id = bankAccountId;
      movWhere.bank_account_id = bankAccountId;
    }
    const stmts = await this.statements.find({ where: stmtWhere });
    const movs = await this.movements.find({ where: movWhere });

    const stmtItems: BankStatementLineItem[] = stmts.map((s) => ({
      id: s.statement_id, date: s.transaction_date, reference: s.reference_number,
      description: s.description, movementType: s.movement_type, amount: s.amount,
      status: s.status, reconciledWithId: s.matched_movement_id ?? undefined,
      reconciliationType: s.reconciliation_type ?? undefined,
    }));
    const movItems: InternalBankMovement[] = movs.map((m) => ({
      id: m.movement_id, date: m.movement_date, reference: m.reference_number,
      description: m.concept, movementType: m.movement_type, amount: m.amount,
      status: m.status, salesInvoiceNumber: m.sales_invoice_number ?? undefined,
    }));

    const result = BankReconciliationEngine.executeReconciliation(stmtItems, movItems, rate);

    await this.ds.transaction(async (m) => {
      for (const s of result.reconciledStatements) {
        await m.getRepository(BankStatement).update(s.id, {
          status: s.status,
          matched_movement_id: s.reconciledWithId ?? null,
          reconciliation_type: s.reconciliationType ?? null,
        });
        if (s.status === 'CONCILIADO' && s.reconciledWithId) {
          await m.getRepository(BankReconciliation).save(
            m.getRepository(BankReconciliation).create({
              tenant_id: tenantId, statement_id: s.id, movement_id: s.reconciledWithId,
              reconciliation_type: (s.reconciliationType ?? 'MANUAL') as any,
            }),
          );
        }
      }
      for (const mov of result.reconciledInternalMovements) {
        await m.getRepository(BankMovement).update(mov.id, { status: mov.status });
      }
    });

    return {
      summary: result.summary,
      fiscal_cross_checks: result.fiscalCrossChecks,
      auto_detected_expenses: result.detectedExpenses.map((e) => ({
        ...e, suggestedJournalEntry: undefined,
        suggested_entry: e.suggestedJournalEntry,
      })),
    };
  }

  /** Conciliación manual de una partida de extracto con un movimiento */
  async manualMatch(tenantId: string, statementId: string, movementId: string) {
    const stmt = await this.statements.findOne({ where: { statement_id: statementId, tenant_id: tenantId } });
    const mov = await this.movements.findOne({ where: { movement_id: movementId, tenant_id: tenantId } });
    if (!stmt || !mov) throw new NotFoundException('Partida o movimiento no encontrado');
    await this.ds.transaction(async (m) => {
      await m.getRepository(BankStatement).update(statementId, {
        status: 'CONCILIADO', matched_movement_id: movementId, reconciliation_type: 'MANUAL',
      });
      await m.getRepository(BankMovement).update(movementId, { status: 'CONCILIADO' });
      await m.getRepository(BankReconciliation).save(m.getRepository(BankReconciliation).create({
        tenant_id: tenantId, statement_id: statementId, movement_id: movementId,
        reconciliation_type: 'MANUAL',
      }));
    });
    return { matched: true };
  }
}
