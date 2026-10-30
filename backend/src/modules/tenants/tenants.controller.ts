import {
  Body, Controller, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import {
  IsBoolean, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { JwtUserPayload } from '../../common/auth.guards';
import { TenantsService } from './tenants.service';

class CreateTenantDto {
  @IsString() rif: string;
  @IsString() razon_social: string;
  @IsOptional() @IsString() nombre_comercial?: string;
  @IsOptional() @IsBoolean() es_contribuyente_especial?: boolean;
  @IsOptional() @IsNumber() porcentaje_retencion_iva?: number;
}

class UpdateTenantDto {
  @IsOptional() @IsString() razon_social?: string;
  @IsOptional() @IsString() nombre_comercial?: string;
  @IsOptional() @IsBoolean() es_contribuyente_especial?: boolean;
  @IsOptional() @IsNumber() porcentaje_retencion_iva?: number;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

class ManualRateDto {
  @IsNumber() @Min(0.000001) tasa: number;
}

@Controller('tenants')
export class TenantsController {
  constructor(private readonly svc: TenantsService) {}

  @Get() list(@CurrentUser() user: JwtUserPayload) { return this.svc.list(user); }

  @Post()
  @Roles('ADMIN', 'CONTADOR')
  create(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateTenantDto) {
    return this.svc.create(user.sub, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.svc.get(user, id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/exchange-rate')
  @Roles('ADMIN', 'CONTADOR')
  setRate(@Param('id') id: string, @Body() dto: ManualRateDto) {
    return this.svc.setManualRate(id, dto.tasa);
  }
}

@Controller('bcv')
export class BcvController {
  constructor(private readonly svc: TenantsService) {}

  @Get('rate')
  rate(@TenantId() tenantId?: string) {
    return this.svc.bcvRate(tenantId);
  }
}
