import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tenant } from '../../entities/tenant.entity';
import { UserTenant } from '../../entities/user.entity';
import { SeedService } from '../../database/seed.service';
import { AuthService } from '../auth/auth.service';
import { RifValidator } from '../../shared/seniat/rif-validator';
import { BcvExchangeService } from '../../shared/seniat/bcv-service';

@Injectable()
export class TenantsService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(UserTenant) private readonly userTenants: Repository<UserTenant>,
    private readonly seeds: SeedService,
    private readonly auth: AuthService,
  ) {}

  list(user: { sub: string; role: string }) {
    return this.auth.accessibleTenants({ user_id: user.sub, role: user.role });
  }

  async get(user: { sub: string; role: string }, id: string) {
    const tenant = await this.tenants.findOne({ where: { tenant_id: id } });
    if (!tenant) throw new NotFoundException('Empresa no encontrada');
    if (user.role !== 'ADMIN') {
      const access = await this.userTenants.findOne({
        where: { user_id: user.sub, tenant_id: id },
      });
      if (!access) throw new ForbiddenException('Sin acceso a esta empresa');
    }
    return tenant;
  }

  async create(userId: string, dto: Partial<Tenant> & { rif: string; razon_social: string }) {
    if (!RifValidator.isValid(dto.rif)) {
      throw new BadRequestException(`RIF inválido (dígito verificador Módulo 11): ${dto.rif}`);
    }
    const rif = RifValidator.format(dto.rif);
    if (await this.tenants.findOne({ where: { rif } })) {
      throw new BadRequestException('Ya existe una empresa registrada con ese RIF');
    }
    return this.ds.transaction(async (m) => {
      const tenant = await m.save(Tenant, {
        rif,
        razon_social: dto.razon_social,
        nombre_comercial: dto.nombre_comercial || dto.razon_social,
        es_contribuyente_especial: !!dto.es_contribuyente_especial,
        porcentaje_retencion_iva: dto.es_contribuyente_especial
          ? (dto.porcentaje_retencion_iva ?? 75.0) : 0,
      });
      await this.seeds.seedTenant(tenant.tenant_id, m);
      await m.save(UserTenant, { user_id: userId, tenant_id: tenant.tenant_id });
      return tenant;
    });
  }

  async update(id: string, dto: Partial<Tenant>) {
    const tenant = await this.tenants.findOne({ where: { tenant_id: id } });
    if (!tenant) throw new NotFoundException('Empresa no encontrada');
    delete (dto as any).rif; // el RIF no se modifica
    Object.assign(tenant, dto);
    return this.tenants.save(tenant);
  }

  async setManualRate(id: string, tasa: number) {
    if (!tasa || tasa <= 0) throw new BadRequestException('La tasa debe ser mayor a cero');
    const tenant = await this.tenants.findOne({ where: { tenant_id: id } });
    if (!tenant) throw new NotFoundException('Empresa no encontrada');
    tenant.tasa_bcv_manual = tasa;
    return this.tenants.save(tenant);
  }

  /** Tasa oficial BCV vía API pública, con respaldo en la tasa manual del tenant */
  async bcvRate(tenantId?: string) {
    try {
      return await BcvExchangeService.fetchOfficialRate();
    } catch {
      if (tenantId) {
        const t = await this.tenants.findOne({ where: { tenant_id: tenantId } });
        if (t?.tasa_bcv_manual) {
          return { rate: t.tasa_bcv_manual, source: 'MANUAL_TENANT' };
        }
      }
      throw new BadRequestException(
        'No se pudo obtener la tasa BCV. Configure una tasa manual en la empresa.',
      );
    }
  }
}
