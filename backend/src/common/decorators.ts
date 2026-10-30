import {
  createParamDecorator, ExecutionContext, SetMetadata,
} from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

export const IS_PUBLIC_KEY = 'isPublic';
/** Marca un endpoint como público (sin JWT) */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Restringe el endpoint a los roles indicados (ADMIN siempre pasa) */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** Usuario autenticado (payload JWT) */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);

/** tenant_id validado desde el header X-Tenant-Id */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.tenantId as string | undefined;
  },
);
