import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserTenant } from '../../entities/user.entity';
import { Tenant } from '../../entities/tenant.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserTenant) private readonly userTenants: Repository<UserTenant>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
  ) {}

  async findAll() {
    const users = await this.users.find({ order: { full_name: 'ASC' } });
    const links = await this.userTenants.find();
    return users.map(({ password_hash: _ph, ...u }) => ({
      ...u,
      tenant_ids: links.filter((l) => l.user_id === u.user_id).map((l) => l.tenant_id),
    }));
  }

  async create(dto: {
    email: string; password: string; full_name: string;
    role: UserRole; tenant_ids?: string[];
  }) {
    const email = dto.email.toLowerCase().trim();
    if (await this.users.findOne({ where: { email } })) {
      throw new BadRequestException('Ya existe un usuario con ese correo');
    }
    return this.ds.transaction(async (m) => {
      const user = await m.save(User, {
        email,
        password_hash: await bcrypt.hash(dto.password, 10),
        full_name: dto.full_name,
        role: dto.role,
      });
      await this.assignTenants(user.user_id, dto.tenant_ids ?? [], m);
      const { password_hash: _ph, ...safe } = user;
      return safe;
    });
  }

  async update(id: string, dto: Partial<{
    full_name: string; role: UserRole; is_active: boolean; password: string;
  }>) {
    const user = await this.users.findOne({ where: { user_id: id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (dto.full_name) user.full_name = dto.full_name;
    if (dto.role) user.role = dto.role;
    if (dto.is_active !== undefined) user.is_active = dto.is_active;
    if (dto.password) user.password_hash = await bcrypt.hash(dto.password, 10);
    const saved = await this.users.save(user);
    const { password_hash: _ph, ...safe } = saved;
    return safe;
  }

  /** Reemplaza las empresas asignadas al usuario */
  async assignTenants(userId: string, tenantIds: string[], m?: any) {
    const manager = m ?? this.ds.manager;
    for (const tid of tenantIds) {
      const t = await manager.findOne(Tenant, { where: { tenant_id: tid } });
      if (!t) throw new BadRequestException(`Empresa inexistente: ${tid}`);
    }
    await manager.delete(UserTenant, { user_id: userId });
    for (const tid of tenantIds) {
      await manager.save(UserTenant, { user_id: userId, tenant_id: tid });
    }
    return { assigned: tenantIds.length };
  }
}
