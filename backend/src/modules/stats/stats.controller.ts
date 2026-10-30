import { BadRequestException, Controller, Get } from '@nestjs/common';
import { TenantId } from '../../common/decorators';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly svc: StatsService) {}

  @Get()
  stats(@TenantId() tenantId?: string) {
    if (!tenantId) throw new BadRequestException('Seleccione una empresa (X-Tenant-Id)');
    return this.svc.get(tenantId);
  }
}
