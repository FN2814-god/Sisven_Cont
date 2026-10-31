import {
  BadRequestException, Controller, Get, Query,
} from '@nestjs/common';
import { TenantId } from '../../common/decorators';
import { ReportsService } from './reports.service';

function requireTenant(t?: string): string {
  if (!t) throw new BadRequestException('Seleccione una empresa (X-Tenant-Id)');
  return t;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function requireDate(v: string | undefined, name: string): string {
  if (!v || !DATE_RE.test(v)) throw new BadRequestException(`${name} debe ser YYYY-MM-DD`);
  return v;
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  /** Libro Diario legal */
  @Get('journal-book')
  journalBook(@TenantId() t: string | undefined, @Query('year') year?: string, @Query('period') period?: string) {
    if (!year) throw new BadRequestException('year es requerido');
    return this.svc.journalBook(requireTenant(t), parseInt(year, 10), period ? parseInt(period, 10) : undefined);
  }

  /** Libro Mayor de una cuenta en un rango */
  @Get('ledger')
  ledger(@TenantId() t: string | undefined, @Query('account_id') accountId?: string,
         @Query('from') from?: string, @Query('to') to?: string) {
    if (!accountId) throw new BadRequestException('account_id es requerido');
    return this.svc.ledger(requireTenant(t), accountId, requireDate(from, 'from'), requireDate(to, 'to'));
  }

  /** Libro Mayor analítico: todas las cuentas del rango con sus movimientos */
  @Get('analytical-ledger')
  analyticalLedger(@TenantId() t: string | undefined,
                   @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.analyticalLedger(
      requireTenant(t), requireDate(from, 'from'), requireDate(to, 'to'));
  }

  /** Balance de Comprobación del mes */
  @Get('trial-balance')
  trialBalance(@TenantId() t: string | undefined, @Query('year') year?: string, @Query('period') period?: string) {
    if (!year || !period) throw new BadRequestException('year y period son requeridos');
    return this.svc.trialBalance(requireTenant(t), parseInt(year, 10), parseInt(period, 10));
  }

  /** Balance General a fecha de corte */
  @Get('balance-sheet')
  balanceSheet(@TenantId() t: string | undefined, @Query('as_of') asOf?: string) {
    return this.svc.balanceSheet(requireTenant(t), requireDate(asOf, 'as_of'));
  }

  /** Estado de Resultados en un rango */
  @Get('income-statement')
  incomeStatement(@TenantId() t: string | undefined, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.incomeStatement(requireTenant(t), requireDate(from, 'from'), requireDate(to, 'to'));
  }
}
