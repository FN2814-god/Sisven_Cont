import {
  BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post,
} from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { Roles, TenantId } from '../../common/decorators';
import { ChartService } from './chart.service';
import { AccountNature } from '../../entities/accounting.entity';

class CreateAccountDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsIn(['DEUDORA', 'ACREEDORA']) nature?: AccountNature;
  @IsOptional() @IsBoolean() is_selectable?: boolean;
  @IsOptional() @IsString() niif_classification?: string;
}

class UpdateAccountDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsIn(['DEUDORA', 'ACREEDORA']) nature?: AccountNature;
  @IsOptional() @IsBoolean() is_selectable?: boolean;
  @IsOptional() @IsString() niif_classification?: string;
}

function requireTenant(t?: string): string {
  if (!t) throw new BadRequestException('Seleccione una empresa (X-Tenant-Id)');
  return t;
}

@Controller('chart-of-accounts')
export class ChartController {
  constructor(private readonly svc: ChartService) {}

  @Get() list(@TenantId() t?: string) { return this.svc.list(requireTenant(t)); }

  @Post()
  @Roles('ADMIN', 'CONTADOR')
  create(@TenantId() t: string | undefined, @Body() dto: CreateAccountDto) {
    return this.svc.create(requireTenant(t), dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'CONTADOR')
  update(@TenantId() t: string | undefined, @Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.svc.update(requireTenant(t), id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'CONTADOR')
  remove(@TenantId() t: string | undefined, @Param('id') id: string) {
    return this.svc.remove(requireTenant(t), id);
  }
}
