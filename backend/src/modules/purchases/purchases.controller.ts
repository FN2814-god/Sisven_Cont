import {
  BadRequestException, Body, Controller, Get, Post, Query,
} from '@nestjs/common';
import {
  IsIn, IsNumber, IsOptional, IsString, Length, Min,
} from 'class-validator';
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { JwtUserPayload } from '../../common/auth.guards';
import { PurchasesService, CreatePurchaseDto } from './purchases.service';
import { FiscalPersonType } from '../../shared/seniat/types';

class PurchaseDto implements CreatePurchaseDto {
  @IsOptional() @IsString() fecha_factura?: string;
  @IsString() rif_proveedor: string;
  @IsString() nombre_proveedor: string;
  @IsString() numero_factura: string;
  @IsString() numero_control: string;
  @IsOptional() @IsString() expense_account_code?: string;
  @IsOptional() @IsString() expense_description?: string;
  @IsIn(['USD', 'VES']) amounts_in: 'USD' | 'VES';
  @IsNumber() @Min(0) base_imponible: number;
  @IsOptional() @IsNumber() @Min(0) compras_exentas?: number;
  @IsNumber() bcv_exchange_rate: number;
  @IsOptional() @IsNumber() @Min(0) porcentaje_retencion_iva?: number;
  @IsOptional() @IsString() @Length(3, 3) islr_concepto_codigo?: string;
  @IsOptional() @IsIn(['PNR', 'PNNR', 'PJ_DOM', 'PJ_NODOM']) islr_beneficiary_type?: FiscalPersonType;
  @IsOptional() @IsNumber() @Min(0) valor_ut?: number;
}

function requireTenant(t?: string): string {
  if (!t) throw new BadRequestException('Seleccione una empresa (X-Tenant-Id)');
  return t;
}

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly svc: PurchasesService) {}

  @Get()
  list(@TenantId() t: string | undefined, @Query('year') year?: string, @Query('period') period?: string) {
    return this.svc.list(requireTenant(t),
      year ? parseInt(year, 10) : undefined,
      period ? parseInt(period, 10) : undefined);
  }

  @Post()
  @Roles('ADMIN', 'CONTADOR')
  create(@TenantId() t: string | undefined, @CurrentUser() u: JwtUserPayload, @Body() dto: PurchaseDto) {
    return this.svc.create(requireTenant(t), u.sub, dto);
  }
}
