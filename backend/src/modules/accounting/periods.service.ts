import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalPeriod } from '../../entities/accounting.entity';

@Injectable()
export class PeriodsService {
  constructor(
    @InjectRepository(FiscalPeriod)
    private readonly periods: Repository<FiscalPeriod>,
  ) {}

  list(tenantId: string, year?: number) {
    const where: any = { tenant_id: tenantId };
    if (year) where.fiscal_year = year;
    return this.periods.find({
      where, order: { fiscal_year: 'DESC', fiscal_month: 'ASC' },
    });
  }

  /** Garantiza los 12 períodos de un ejercicio */
  async ensureYear(tenantId: string, year: number) {
    const created: FiscalPeriod[] = [];
    for (let month = 1; month <= 12; month++) {
      const exists = await this.periods.findOne({
        where: { tenant_id: tenantId, fiscal_year: year, fiscal_month: month },
      });
      if (!exists) {
        created.push(await this.periods.save(this.periods.create({
          tenant_id: tenantId, fiscal_year: year, fiscal_month: month,
        })));
      }
    }
    return { ensured: 12, created: created.length };
  }

  async setStatus(tenantId: string, periodId: string, status: 'ABIERTO' | 'CERRADO') {
    const p = await this.periods.findOne({ where: { period_id: periodId, tenant_id: tenantId } });
    if (!p) throw new NotFoundException('Período no encontrado');
    if (p.status === status) throw new BadRequestException(`El período ya está ${status}`);
    p.status = status;
    return this.periods.save(p);
  }
}
