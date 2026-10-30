import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IS_PUBLIC_KEY, ROLES_KEY } from './decorators';
import { UserRole, UserTenant } from '../entities/user.entity';

export interface JwtUserPayload {
  sub: string;
  email: string;
  role: UserRole;
  full_name: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers['authorization'] || '';
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token de acceso requerido');
    }
    try {
      req.user = await this.jwt.verifyAsync<JwtUserPayload>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!user) return true; // rutas públicas
    if (user.role === 'ADMIN' || required.includes(user.role)) return true;
    throw new ForbiddenException('Su rol no tiene permiso para esta operación');
  }
}

/**
 * Resuelve el header X-Tenant-Id y valida que el usuario tenga acceso
 * a la empresa (ADMIN accede a todas). Expone req.tenantId.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @InjectRepository(UserTenant)
    private readonly userTenants: Repository<UserTenant>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const tenantId: string | undefined =
      req.headers['x-tenant-id'] || req.query?.tenant_id;
    if (!tenantId || !req.user) return true;

    if (req.user.role !== 'ADMIN') {
      const access = await this.userTenants.findOne({
        where: { user_id: req.user.sub, tenant_id: tenantId },
      });
      if (!access) {
        throw new ForbiddenException('No tiene acceso a la empresa indicada');
      }
    }
    req.tenantId = tenantId;
    return true;
  }
}
