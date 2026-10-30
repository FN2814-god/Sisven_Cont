import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChartOfAccount, JournalEntry, JournalEntryLine,
} from '../../entities/accounting.entity';
import { BcvExchangeService } from '../../shared/seniat/bcv-service';

const r2 = (n: number) => BcvExchangeService.round(n, 2);

interface AggRow {
  account_id: string;
  code: string;
  name: string;
  nature: string;
  level: number;
  debit_ves: number;
  credit_ves: number;
  debit_usd: number;
  credit_usd: number;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(JournalEntry) private readonly entries: Repository<JournalEntry>,
    @InjectRepository(JournalEntryLine) private readonly lines: Repository<JournalEntryLine>,
    @InjectRepository(ChartOfAccount) private readonly chart: Repository<ChartOfAccount>,
  ) {}

  /** Agregación de líneas de asientos ASENTADO por cuenta auxiliar en un rango */
  private async aggregate(
    tenantId: string, from?: string, to?: string,
  ): Promise<AggRow[]> {
    const qb = this.lines
      .createQueryBuilder('l')
      .innerJoin(JournalEntry, 'e', 'e.entry_id = l.entry_id')
      .innerJoin(ChartOfAccount, 'a', 'a.account_id = l.account_id')
      .select('l.account_id', 'account_id')
      .addSelect('a.code', 'code')
      .addSelect('a.name', 'name')
      .addSelect('a.nature', 'nature')
      .addSelect('a.level', 'level')
      .addSelect('SUM(l.debit_ves)', 'debit_ves')
      .addSelect('SUM(l.credit_ves)', 'credit_ves')
      .addSelect('SUM(l.debit_usd)', 'debit_usd')
      .addSelect('SUM(l.credit_usd)', 'credit_usd')
      .where('l.tenant_id = :tenantId AND e.status = :st', { tenantId, st: 'ASENTADO' })
      .groupBy('l.account_id, a.code, a.name, a.nature, a.level');
    if (from) qb.andWhere('e.entry_date >= :from', { from });
    if (to) qb.andWhere('e.entry_date <= :to', { to });
    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      ...r,
      debit_ves: r2(+r.debit_ves), credit_ves: r2(+r.credit_ves),
      debit_usd: r2(+r.debit_usd), credit_usd: r2(+r.credit_usd),
    }));
  }

  private static net(row: { debit_ves: number; credit_ves: number }) {
    return r2(row.debit_ves - row.credit_ves);
  }
  private static netUsd(row: { debit_usd: number; credit_usd: number }) {
    return r2(row.debit_usd - row.credit_usd);
  }

  /** LIBRO DIARIO: asientos cronológicos del período con sus líneas */
  async journalBook(tenantId: string, year: number, period?: number) {
    const where: any = { tenant_id: tenantId, fiscal_year: year, status: 'ASENTADO' };
    if (period) where.fiscal_period = period;
    const entries = await this.entries.find({
      where, relations: ['lines'],
      order: { entry_number: 'ASC' },
    });
    for (const e of entries) {
      e.lines.sort((a, b) => b.debit_ves - a.debit_ves || a.account_code.localeCompare(b.account_code));
    }
    return { fiscal_year: year, fiscal_period: period ?? null, entries };
  }

  /** LIBRO MAYOR: saldo inicial + movimientos + saldo acumulado de una cuenta */
  async ledger(tenantId: string, accountId: string, from: string, to: string) {
    const account = await this.chart.findOne({
      where: { account_id: accountId, tenant_id: tenantId },
    });
    if (!account) throw new NotFoundException('Cuenta no encontrada');

    const [opening] = await this.aggregate(tenantId, undefined, this.prevDay(from))
      .then((rows) => rows.filter((r) => r.account_id === accountId));

    const openingNet = opening ? ReportsService.net(opening) : 0;
    const openingNetUsd = opening ? ReportsService.netUsd(opening) : 0;

    const movements = await this.lines
      .createQueryBuilder('l')
      .innerJoin(JournalEntry, 'e', 'e.entry_id = l.entry_id')
      .select('e.entry_date', 'entry_date')
      .addSelect('e.entry_number', 'entry_number')
      .addSelect('e.entry_id', 'entry_id')
      .addSelect('e.concept', 'concept')
      .addSelect('e.source_module', 'source_module')
      .addSelect('l.description', 'description')
      .addSelect('l.debit_ves', 'debit_ves')
      .addSelect('l.credit_ves', 'credit_ves')
      .addSelect('l.debit_usd', 'debit_usd')
      .addSelect('l.credit_usd', 'credit_usd')
      .addSelect('l.third_party_rif', 'third_party_rif')
      .where('l.tenant_id = :tenantId AND l.account_id = :accountId AND e.status = :st',
        { tenantId, accountId, st: 'ASENTADO' })
      .andWhere('e.entry_date BETWEEN :from AND :to', { from, to })
      .orderBy('e.entry_date', 'ASC')
      .addOrderBy('e.entry_number', 'ASC')
      .getRawMany();

    let running = openingNet;
    let runningUsd = openingNetUsd;
    const rows = movements.map((m) => {
      running = r2(running + m.debit_ves - m.credit_ves);
      runningUsd = r2(runningUsd + m.debit_usd - m.credit_usd);
      return {
        ...m,
        debit_ves: r2(+m.debit_ves), credit_ves: r2(+m.credit_ves),
        debit_usd: r2(+m.debit_usd), credit_usd: r2(+m.credit_usd),
        saldo_ves: running, saldo_usd: runningUsd,
      };
    });

    return {
      account: { account_id: account.account_id, code: account.code, name: account.name, nature: account.nature },
      from, to,
      opening_balance_ves: openingNet,
      opening_balance_usd: openingNetUsd,
      movements: rows,
      closing_balance_ves: running,
      closing_balance_usd: runningUsd,
    };
  }

  /** BALANCE DE COMPROBACIÓN: saldos anteriores, movimientos del mes, saldos actuales */
  async trialBalance(tenantId: string, year: number, month: number) {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = `${year}-${String(month).padStart(2, '0')}-${this.lastDay(year, month)}`;

    const [prev, current] = await Promise.all([
      this.aggregate(tenantId, undefined, this.prevDay(from)),
      this.aggregate(tenantId, from, to),
    ]);
    const prevByAcc = new Map(prev.map((r) => [r.account_id, r]));
    const accIds = new Set([...prev.map((r) => r.account_id), ...current.map((r) => r.account_id)]);

    const accounts = await this.chart.find({ where: { tenant_id: tenantId } });
    const byId = new Map(accounts.map((a) => [a.account_id, a]));

    const rows = [...accIds].map((id) => {
      const cur = current.find((r) => r.account_id === id);
      const prevRow = prevByAcc.get(id);
      const acc = byId.get(id) ?? cur ?? prevRow!;
      const openingNet = prevRow ? ReportsService.net(prevRow) : 0;
      const openingNetUsd = prevRow ? ReportsService.netUsd(prevRow) : 0;
      const closingNet = r2(openingNet + (cur ? ReportsService.net(cur) : 0));
      const closingNetUsd = r2(openingNetUsd + (cur ? ReportsService.netUsd(cur) : 0));
      return {
        account_id: id,
        code: (acc as any).code, name: (acc as any).name, nature: (acc as any).nature,
        // Saldos anteriores
        opening_debit_ves: openingNet > 0 ? openingNet : 0,
        opening_credit_ves: openingNet < 0 ? -openingNet : 0,
        opening_debit_usd: openingNetUsd > 0 ? openingNetUsd : 0,
        opening_credit_usd: openingNetUsd < 0 ? -openingNetUsd : 0,
        // Movimientos del período
        movement_debit_ves: cur?.debit_ves ?? 0,
        movement_credit_ves: cur?.credit_ves ?? 0,
        movement_debit_usd: cur?.debit_usd ?? 0,
        movement_credit_usd: cur?.credit_usd ?? 0,
        // Saldos actuales
        closing_debit_ves: closingNet > 0 ? closingNet : 0,
        closing_credit_ves: closingNet < 0 ? -closingNet : 0,
        closing_debit_usd: closingNetUsd > 0 ? closingNetUsd : 0,
        closing_credit_usd: closingNetUsd < 0 ? -closingNetUsd : 0,
      };
    }).sort((a, b) => a.code.localeCompare(b.code));

    const sum = (k: keyof (typeof rows)[number]) =>
      r2(rows.reduce((s, r) => s + (r[k] as number), 0));

    return {
      fiscal_year: year, fiscal_period: month, from, to, accounts: rows,
      totals: {
        opening_debit_ves: sum('opening_debit_ves'),
        opening_credit_ves: sum('opening_credit_ves'),
        movement_debit_ves: sum('movement_debit_ves'),
        movement_credit_ves: sum('movement_credit_ves'),
        closing_debit_ves: sum('closing_debit_ves'),
        closing_credit_ves: sum('closing_credit_ves'),
      },
    };
  }

  /** BALANCE GENERAL a una fecha de corte, agrupado por nivel 2 del plan */
  async balanceSheet(tenantId: string, asOf: string) {
    const yearStart = `${asOf.substring(0, 4)}-01-01`;
    const [all, results] = await Promise.all([
      this.aggregate(tenantId, undefined, asOf),
      this.aggregate(tenantId, yearStart, asOf),
    ]);

    // Valor presentable: positivo según la naturaleza de la clase
    const presentable = (r: AggRow, classPrefix: string) =>
      classPrefix === '1' ? ReportsService.net(r) : -ReportsService.net(r);

    const nodeFor = (rows: AggRow[], classPrefix: string) => {
      const groups = new Map<string, AggRow[]>();
      for (const r of rows.filter((x) => x.code.startsWith(classPrefix))) {
        const g = r.code.substring(0, 3);
        groups.set(g, [...(groups.get(g) ?? []), r]);
      }
      return [...groups.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([group, items]) => ({
          group,
          accounts: items.map((r) => ({
            code: r.code, name: r.name,
            net_ves: r2(presentable(r, classPrefix)),
            net_usd: r2(classPrefix === '1' ? ReportsService.netUsd(r) : -ReportsService.netUsd(r)),
          })),
          total_ves: r2(items.reduce((s, r) => s + presentable(r, classPrefix), 0)),
        }));
    };

    const activo = nodeFor(all, '1');
    const pasivo = nodeFor(all, '2');
    const patrimonio = nodeFor(all, '3');

    // Resultado del ejercicio = ingresos(4) − costos(5) − gastos(6) del año en curso
    const resultadoVes = r2(results
      .filter((r) => /^[456]/.test(r.code))
      .reduce((s, r) => s - ReportsService.net(r), 0));

    const total = (nodes: { total_ves: number }[]) =>
      r2(nodes.reduce((s, n) => s + n.total_ves, 0));
    const totalActivo = total(activo);
    const totalPasivo = total(pasivo);
    const totalPatrimonio = r2(total(patrimonio) + resultadoVes);

    return {
      as_of: asOf,
      activo: { groups: activo, total_ves: totalActivo },
      pasivo: { groups: pasivo, total_ves: totalPasivo },
      patrimonio: {
        groups: patrimonio,
        resultado_ejercicio_ves: resultadoVes,
        total_ves: totalPatrimonio,
      },
      pasivo_patrimonio_ves: r2(totalPasivo + totalPatrimonio),
      balance_check_ves: r2(totalActivo - totalPasivo - totalPatrimonio),
    };
  }

  /** ESTADO DE RESULTADOS en un rango (4.x ingresos − 5.x costos − 6.x gastos) */
  async incomeStatement(tenantId: string, from: string, to: string) {
    const rows = await this.aggregate(tenantId, from, to);
    // Cada sección se presenta con signo positivo según su naturaleza
    const section = (prefix: string, sign: 1 | -1) =>
      rows.filter((r) => r.code.startsWith(prefix)).map((r) => ({
        code: r.code, name: r.name,
        net_ves: r2(sign * ReportsService.net(r)),
        net_usd: r2(sign * ReportsService.netUsd(r)),
      }));

    const ingresos = section('4', -1);
    const costos = section('5', 1);
    const gastos = section('6', 1);
    const total = (items: { net_ves: number; net_usd: number }[]) => ({
      ves: r2(items.reduce((s, i) => s + i.net_ves, 0)),
      usd: r2(items.reduce((s, i) => s + i.net_usd, 0)),
    });

    const totIng = total(ingresos), totCos = total(costos), totGas = total(gastos);
    return {
      from, to,
      ingresos: { accounts: ingresos, total: totIng },
      costos: { accounts: costos, total: totCos },
      gastos: { accounts: gastos, total: totGas },
      utilidad_bruta: { ves: r2(totIng.ves - totCos.ves), usd: r2(totIng.usd - totCos.usd) },
      resultado_neto: {
        ves: r2(totIng.ves - totCos.ves - totGas.ves),
        usd: r2(totIng.usd - totCos.usd - totGas.usd),
      },
    };
  }

  private prevDay(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().substring(0, 10);
  }

  private lastDay(year: number, month: number): string {
    return String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0');
  }
}
