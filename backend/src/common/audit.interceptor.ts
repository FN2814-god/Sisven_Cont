import {
  CallHandler, ExecutionContext, Injectable, NestInterceptor,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, tap } from 'rxjs';
import { AuditLog } from '../entities/audit.entity';

/** Bitácora básica: registra toda petición mutante autenticada */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private readonly audit: Repository<AuditLog>,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    if (!mutating || !req.user) return next.handle();

    return next.handle().pipe(
      tap(() => {
        this.audit.save({
          user_id: req.user.sub,
          tenant_id: req.tenantId ?? null,
          action: `${req.method} ${req.originalUrl}`,
          detail: JSON.stringify(req.body ?? {}).substring(0, 4000),
        }).catch(() => undefined);
      }),
    );
  }
}
