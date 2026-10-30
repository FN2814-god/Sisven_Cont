import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PurchasesBook, SalesBook, TaxRetentionIva, TaxRetentionIslr,
} from '../../entities/fiscal.entity';
import { BankStatement } from '../../entities/bank.entity';
import { Tenant } from '../../entities/tenant.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(SalesBook) private readonly sales: Repository<SalesBook>,
    @InjectRepository(PurchasesBook) private readonly purchases: Repository<PurchasesBook>,
    @InjectRepository(TaxRetentionIva) private readonly iva: Repository<TaxRetentionIva>,
    @InjectRepository(TaxRetentionIslr) private readonly islr: Repository<TaxRetentionIslr>,
    @InjectRepository(BankStatement) private readonly statements: Repository<BankStatement>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
  ) {}

  /** KPIs del dashboard: ventas/compras del mes, retenciones, partidas pendientes */
  async get(tenantId: string) {
    const now = new Date();
    const year = now.getFullYear();
    const period = now.getMonth() + 1;

    const salesRow = await this.sales
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.total_ventas_con_iva),0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('s.tenant_id = :t AND s.fiscal_year = :y AND s.fiscal_period = :p',
        { t: tenantId, y: year, p: period })
      .getRawOne();

    const purchasesRow = await this.purchases
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.total_compras_con_iva),0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('p.tenant_id = :t AND p.fiscal_year = :y AND p.fiscal_period = :p',
        { t: tenantId, y: year, p: period })
      .getRawOne();

    const retIva = await this.iva
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.monto_iva_retenido),0)', 'total')
      .where('r.tenant_id = :t', { t: tenantId })
      .getRawOne();

    const retIslr = await this.islr
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.monto_retenido),0)', 'total')
      .where('r.tenant_id = :t', { t: tenantId })
      .getRawOne();

    const pendingBank = await this.statements.count({
      where: { tenant_id: tenantId, status: 'PENDIENTE' },
    });

    const tenant = await this.tenants.findOne({ where: { tenant_id: tenantId } });

    return {
      fiscal_year: year,
      fiscal_period: period,
      total_sales_month_ves: +salesRow.total,
      sales_count_month: +salesRow.count,
      total_purchases_month_ves: +purchasesRow.total,
      purchases_count_month: +purchasesRow.count,
      iva_retenido_acumulado_ves: +retIva.total,
      islr_retenido_acumulado_ves: +retIslr.total,
      pending_bank_count: pendingBank,
      tenant: tenant
        ? {
            rif: tenant.rif,
            razon_social: tenant.razon_social,
            es_contribuyente_especial: tenant.es_contribuyente_especial,
            porcentaje_retencion_iva: tenant.porcentaje_retencion_iva,
          }
        : null,
    };
  }
}
