import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserTenant } from '../entities/user.entity';
import { ChartOfAccount, FiscalPeriod } from '../entities/accounting.entity';
import { buildStandardChart } from './standard-accounts';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async run(): Promise<void> {
    await this.seedAdminUser();
    await this.seedExtraUsers();
  }

  /**
   * Usuarios adicionales definidos en SEED_USERS (para demos/despliegues
   * donde se quiere personal pre-creado). Formato por usuario, separados
   * por ";":
   *   SEED_USERS=correo@x.com:Clave1:CONTADOR:Nombre Uno;correo2@x.com:Clave2:CONSULTA:Nombre Dos
   * Idempotente: omite correos que ya existen (corre en cada arranque).
   */
  private async seedExtraUsers(): Promise<void> {
    const raw = process.env.SEED_USERS;
    if (!raw?.trim()) return;

    for (const item of raw.split(';').map((s) => s.trim()).filter(Boolean)) {
      const [email, password, role, ...rest] = item.split(':');
      if (!email || !password || !role) {
        this.logger.warn(`SEED_USERS: entrada ignorada (formato inválido): ${item}`);
        continue;
      }
      const normalizedRole = role.trim().toUpperCase() as User['role'];
      if (!['ADMIN', 'CONTADOR', 'CONSULTA'].includes(normalizedRole)) {
        this.logger.warn(`SEED_USERS: rol inválido '${role}' en: ${item}`);
        continue;
      }
      const normalizedEmail = email.trim().toLowerCase();
      if (await this.users.findOne({ where: { email: normalizedEmail } })) {
        continue;
      }
      await this.users.save({
        email: normalizedEmail,
        password_hash: await bcrypt.hash(password.trim(), 10),
        full_name: rest.join(':').trim() || normalizedEmail,
        role: normalizedRole,
      });
      this.logger.log(`Usuario sembrado: ${normalizedEmail} (${normalizedRole})`);
    }
  }

  /** Usuario administrador inicial (solo si la tabla está vacía) */
  private async seedAdminUser(): Promise<void> {
    const count = await this.users.count();
    if (count > 0) return;

    const email = process.env.SEED_ADMIN_EMAIL || 'admin@sisven.local';
    const password = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
    await this.users.save({
      email,
      password_hash: await bcrypt.hash(password, 10),
      full_name: 'Administrador del Sistema',
      role: 'ADMIN',
    });
    this.logger.log(`Usuario administrador creado: ${email}`);
  }

  /**
   * Siembra en un tenant nuevo: plan de cuentas estándar VEN-NIF PYME
   * (con jerarquía de padres) y los 12 períodos fiscales del año en curso.
   */
  async seedTenant(tenantId: string, manager = this.ds.manager): Promise<void> {
    const chart = buildStandardChart();
    const idByCode = new Map<string, string>();

    for (const acc of chart) {
      const saved = await manager.save(ChartOfAccount, {
        tenant_id: tenantId,
        code: acc.code,
        name: acc.name,
        level: acc.level,
        parent_id: acc.parentCode ? (idByCode.get(acc.parentCode) ?? null) : null,
        nature: acc.nature,
        is_selectable: acc.isSelectable,
        niif_classification: acc.niif ?? null,
      });
      idByCode.set(acc.code, saved.account_id);
    }

    const year = new Date().getFullYear();
    for (let month = 1; month <= 12; month++) {
      await manager.save(FiscalPeriod, {
        tenant_id: tenantId,
        fiscal_year: year,
        fiscal_month: month,
        status: 'ABIERTO',
      });
    }
  }
}
