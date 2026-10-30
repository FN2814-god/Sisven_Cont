import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserTenant } from '../../entities/user.entity';
import { Tenant } from '../../entities/tenant.entity';
import { JwtUserPayload } from '../../common/auth.guards';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserTenant) private readonly userTenants: Repository<UserTenant>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const payload: JwtUserPayload = {
      sub: user.user_id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    };
    const access_token = await this.jwt.signAsync(payload);
    return { access_token, user: payload, tenants: await this.accessibleTenants(user) };
  }

  /** Empresas accesibles: ADMIN ve todas, el resto sólo las asignadas */
  async accessibleTenants(user: { user_id: string; role: string }): Promise<Tenant[]> {
    if (user.role === 'ADMIN') {
      return this.tenants.find({ where: { is_active: true }, order: { razon_social: 'ASC' } });
    }
    const links = await this.userTenants.find({ where: { user_id: user.user_id } });
    if (!links.length) return [];
    return this.tenants.find({
      where: { tenant_id: In(links.map((l) => l.tenant_id)), is_active: true },
      order: { razon_social: 'ASC' },
    });
  }

  async me(userId: string) {
    const user = await this.users.findOne({ where: { user_id: userId } });
    if (!user) throw new UnauthorizedException();
    const { password_hash: _ph, ...safe } = user;
    return { ...safe, tenants: await this.accessibleTenants(user) };
  }
}
