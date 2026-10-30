import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  ChartOfAccount, FiscalPeriod, JournalEntry, JournalEntryLine,
} from '../../entities/accounting.entity';
import { AutomaticJournalGenerator } from '../../shared/accounting/automatic-journal-generator';
import { JournalEntryDto, JournalEntryLineDto } from '../../shared/accounting/types';
import { BcvExchangeService } from '../../shared/seniat/bcv-service';

export interface ManualLineInput {
  account_code?: string;
  account_id?: string;
  description?: string;
  debit_ves?: number;
  credit_ves?: number;
  third_party_rif?: string;
  cost_center?: string;
}

@Injectable()
export class JournalService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(JournalEntry) private readonly entries: Repository<JournalEntry>,
    @InjectRepository(JournalEntryLine) private readonly lines: Repository<JournalEntryLine>,
    @InjectRepository(FiscalPeriod) private readonly periods: Repository<FiscalPeriod>,
    @InjectRepository(ChartOfAccount) private readonly chart: Repository<ChartOfAccount>,
  ) {}

  /** Valida que el período fiscal de la fecha esté ABIERTO (creándolo si falta) */
  async assertPeriodOpen(tenantId: string, dateStr: string, manager?: EntityManager) {
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(5, 7), 10);
    const repo = (manager ?? this.ds.manager).getRepository(FiscalPeriod);
    let period = await repo.findOne({
      where: { tenant_id: tenantId, fiscal_year: year, fiscal_month: month },
    });
    if (!period) {
      period = await repo.save(repo.create({
        tenant_id: tenantId, fiscal_year: year, fiscal_month: month, status: 'ABIERTO',
      }));
    }
    if (period.status === 'CERRADO') {
      throw new BadRequestException(
        `El período fiscal ${year}-${String(month).padStart(2, '0')} está CERRADO.`,
      );
    }
    return period;
  }

  /** Correlativo de comprobante por empresa y ejercicio */
  async nextEntryNumber(tenantId: string, year: number, manager?: EntityManager): Promise<number> {
    const repo = (manager ?? this.ds.manager).getRepository(JournalEntry);
    const row = await repo
      .createQueryBuilder('e')
      .select('COALESCE(MAX(e.entry_number), 0) + 1', 'next')
      .where('e.tenant_id = :tenantId AND e.fiscal_year = :year', { tenantId, year })
      .getRawOne();
    return parseInt(row.next, 10);
  }

  /** Persiste un JournalEntryDto generado por los motores, resolviendo account_id */
  async persistDto(dto: JournalEntryDto, userId: string | null, manager: EntityManager) {
    const codes = dto.lines.map((l) => l.accountCode);
    const accounts = await manager.getRepository(ChartOfAccount).find({
      where: codes.map((code) => ({ tenant_id: dto.tenantId, code })),
    });
    const idByCode = new Map(accounts.map((a) => [a.code, a.account_id]));

    const entry = manager.getRepository(JournalEntry).create({
      tenant_id: dto.tenantId,
      fiscal_year: dto.fiscalYear,
      fiscal_period: dto.fiscalPeriod,
      entry_number: dto.entryNumber,
      entry_date: dto.entryDate,
      concept: dto.concept,
      source_module: dto.sourceModule,
      source_document_id: dto.sourceDocumentId ?? null,
      status: dto.status,
      bcv_exchange_rate: dto.bcvExchangeRate,
      total_debit_ves: dto.totalDebitVes,
      total_credit_ves: dto.totalCreditVes,
      total_debit_usd: dto.totalDebitUsd,
      total_credit_usd: dto.totalCreditUsd,
      created_by: userId,
      lines: dto.lines
        .filter((l) => l.debitVes !== 0 || l.creditVes !== 0)
        .map((l) => ({
          tenant_id: dto.tenantId,
          account_id: idByCode.get(l.accountCode) ?? null,
          account_code: l.accountCode,
          account_name: l.accountName,
          description: l.description ?? null,
          debit_ves: l.debitVes,
          credit_ves: l.creditVes,
          debit_usd: l.debitUsd,
          credit_usd: l.creditUsd,
          bcv_rate: l.bcvRate,
          third_party_rif: l.thirdPartyRif ?? null,
          cost_center: l.costCenter ?? null,
        })),
    });
    return manager.getRepository(JournalEntry).save(entry);
  }

  async list(tenantId: string, q: { year?: number; period?: number; status?: string }) {
    const where: any = { tenant_id: tenantId };
    if (q.year) where.fiscal_year = q.year;
    if (q.period) where.fiscal_period = q.period;
    if (q.status) where.status = q.status;
    return this.entries.find({
      where, order: { entry_number: 'DESC' }, relations: ['lines'], take: 500,
    });
  }

  async get(tenantId: string, entryId: string) {
    const entry = await this.entries.findOne({
      where: { entry_id: entryId, tenant_id: tenantId }, relations: ['lines'],
    });
    if (!entry) throw new NotFoundException('Comprobante no encontrado');
    return entry;
  }

  /** Asiento manual: valida partida doble bimoneda, cuentas seleccionables y período abierto */
  async createManual(tenantId: string, userId: string, dto: {
    entry_date: string; concept: string; bcv_exchange_rate: number; lines: ManualLineInput[];
  }) {
    if (!dto.lines || dto.lines.length < 2) {
      throw new BadRequestException('El comprobante requiere al menos 2 líneas');
    }
    const rate = dto.bcv_exchange_rate;
    if (!rate || rate <= 0) throw new BadRequestException('Tasa BCV inválida');

    return this.ds.transaction(async (m) => {
      await this.assertPeriodOpen(tenantId, dto.entry_date, m);

      const accounts = await m.getRepository(ChartOfAccount).find({
        where: [
          ...dto.lines.filter((l) => l.account_id)
            .map((l) => ({ account_id: l.account_id, tenant_id: tenantId })),
          ...dto.lines.filter((l) => l.account_code)
            .map((l) => ({ code: l.account_code, tenant_id: tenantId })),
        ],
      });
      const byId = new Map(accounts.map((a) => [a.account_id, a]));
      const byCode = new Map(accounts.map((a) => [a.code, a]));

      const lines: JournalEntryLineDto[] = dto.lines.map((l, i) => {
        const acc = (l.account_id ? byId.get(l.account_id) : undefined)
          ?? (l.account_code ? byCode.get(l.account_code) : undefined);
        if (!acc) throw new BadRequestException(`Línea ${i + 1}: cuenta inexistente`);
        if (!acc.is_selectable) {
          throw new BadRequestException(`Línea ${i + 1}: la cuenta ${acc.code} no es seleccionable`);
        }
        const debit = BcvExchangeService.round(l.debit_ves ?? 0, 2);
        const credit = BcvExchangeService.round(l.credit_ves ?? 0, 2);
        return {
          accountCode: acc.code, accountName: acc.name,
          description: l.description ?? '', debitVes: debit, creditVes: credit,
          debitUsd: BcvExchangeService.convertVesToUsd(debit, rate),
          creditUsd: BcvExchangeService.convertVesToUsd(credit, rate),
          bcvRate: rate, thirdPartyRif: l.third_party_rif, costCenter: l.cost_center,
        };
      });

      try {
        AutomaticJournalGenerator.assertDoubleEntryBalance(lines);
      } catch (e: any) {
        throw new BadRequestException(e.message);
      }

      const year = parseInt(dto.entry_date.substring(0, 4), 10);
      const dtoEntry: JournalEntryDto = {
        tenantId,
        fiscalYear: year,
        fiscalPeriod: parseInt(dto.entry_date.substring(5, 7), 10),
        entryNumber: await this.nextEntryNumber(tenantId, year, m),
        entryDate: dto.entry_date,
        concept: dto.concept,
        sourceModule: 'MANUAL',
        status: 'ASENTADO',
        bcvExchangeRate: rate,
        lines,
        totalDebitVes: BcvExchangeService.round(lines.reduce((s, l) => s + l.debitVes, 0), 2),
        totalCreditVes: BcvExchangeService.round(lines.reduce((s, l) => s + l.creditVes, 0), 2),
        totalDebitUsd: BcvExchangeService.round(lines.reduce((s, l) => s + l.debitUsd, 0), 2),
        totalCreditUsd: BcvExchangeService.round(lines.reduce((s, l) => s + l.creditUsd, 0), 2),
      };
      return this.persistDto(dtoEntry, userId, m);
    });
  }

  /** Anula un comprobante (los datos fiscales no se eliminan — COT) */
  async void(tenantId: string, entryId: string) {
    const entry = await this.get(tenantId, entryId);
    if (entry.status === 'ANULADO') {
      throw new BadRequestException('El comprobante ya está anulado');
    }
    if (entry.source_module !== 'MANUAL') {
      throw new BadRequestException(
        'Sólo los asientos manuales pueden anularse directamente. Anule el documento origen.',
      );
    }
    await this.assertPeriodOpen(tenantId, entry.entry_date);
    entry.status = 'ANULADO';
    return this.entries.save(entry);
  }
}
