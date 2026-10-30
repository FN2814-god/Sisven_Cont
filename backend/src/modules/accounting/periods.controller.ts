import {
  BadRequestException, Body, Controller, Get, Param, Post, Query,
} from '@nestjs/common';
import { IsInt, Max, Min } from 'class-validator';
import { Roles, TenantId } from '../../common/decorators';
import { PeriodsService } from './periods.service';

class EnsureYearDto {
  @IsInt() @Min(2000) @Max(2100) year: number;
}

function requireTenant(t?: string): string {
  if (!t) throw new BadRequestException('Seleccione una empresa (X-Tenant-Id)');
  return t;
}

@Controller('fiscal-periods')
export class PeriodsController {
  constructor(private readonly svc: PeriodsService) {}

  @Get() list(@TenantId() t: string | undefined, @Query('year') year?: string) {
    return this.svc.list(requireTenant(t), year ? parseInt(year, 10) : undefined);
  }

  @Post('ensure')
  @Roles('ADMIN', 'CONTADOR')
  ensure(@TenantId() t: string | undefined, @Body() dto: EnsureYearDto) {
    return this.svc.ensureYear(requireTenant(t), dto.year);
  }

  @Post(':id/close')
  @Roles('ADMIN', 'CONTADOR')
  close(@TenantId() t: string | undefined, @Param('id') id: string) {
    return this.svc.setStatus(requireTenant(t), id, 'CERRADO');
  }

  @Post(':id/reopen')
  @Roles('ADMIN')
  reopen(@TenantId() t: string | undefined, @Param('id') id: string) {
    return this.svc.setStatus(requireTenant(t), id, 'ABIERTO');
  }
}
