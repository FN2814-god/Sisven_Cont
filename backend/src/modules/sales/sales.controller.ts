import {
  BadRequestException, Body, Controller, Get, Post, Query,
} from '@nestjs/common';
import {
  IsIn, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { JwtUserPayload } from '../../common/auth.guards';
import { SalesService, CreateSaleDto } from './sales.service';

class SaleDto implements CreateSaleDto {
  @IsOptional() @IsString() fecha_factura?: string;
  @IsString() rif_comprador: string;
  @IsString() nombre_comprador: string;
  @IsOptional() @IsString() numero_factura?: string;
  @IsOptional() @IsString() numero_control?: string;
  @IsIn(['USD', 'VES']) amounts_in: 'USD' | 'VES';
  @IsNumber() @Min(0) base_imponible: number;
  @IsOptional() @IsNumber() @Min(0) ventas_exentas?: number;
  @IsIn(['CONTADO', 'CREDITO']) condicion: 'CONTADO' | 'CREDITO';
  @IsOptional() @IsIn(['USD', 'VES']) cobro_en?: 'USD' | 'VES';
  @IsOptional() @IsNumber() @Min(0) igtf_percibido_3?: number;
  @IsOptional() @IsNumber() @Min(0) iva_retenido_terceros?: number;
  @IsNumber() bcv_exchange_rate: number;
}

function requireTenant(t?: string): string {
  if (!t) throw new BadRequestException('Seleccione una empresa (X-Tenant-Id)');
  return t;
}

@Controller('sales')
export class SalesController {
  constructor(private readonly svc: SalesService) {}

  @Get()
  list(@TenantId() t: string | undefined, @Query('year') year?: string, @Query('period') period?: string) {
    return this.svc.list(requireTenant(t),
      year ? parseInt(year, 10) : undefined,
      period ? parseInt(period, 10) : undefined);
  }

  @Post()
  @Roles('ADMIN', 'CONTADOR')
  create(@TenantId() t: string | undefined, @CurrentUser() u: JwtUserPayload, @Body() dto: SaleDto) {
    return this.svc.create(requireTenant(t), u.sub, dto);
  }
}
