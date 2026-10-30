import {
  BadRequestException, Body, Controller, Get, Param, Post, Query,
} from '@nestjs/common';
import {
  ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { JwtUserPayload } from '../../common/auth.guards';
import { JournalService, ManualLineInput } from './journal.service';

class ManualLineDto implements ManualLineInput {
  @IsOptional() @IsString() account_code?: string;
  @IsOptional() @IsString() account_id?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() debit_ves?: number;
  @IsOptional() @IsNumber() credit_ves?: number;
  @IsOptional() @IsString() third_party_rif?: string;
  @IsOptional() @IsString() cost_center?: string;
}

class CreateEntryDto {
  @IsString() entry_date: string; // YYYY-MM-DD
  @IsString() concept: string;
  @IsNumber() bcv_exchange_rate: number;
  @IsArray() @ArrayMinSize(2) @ValidateNested({ each: true })
  @Type(() => ManualLineDto)
  lines: ManualLineDto[];
}

function requireTenant(t?: string): string {
  if (!t) throw new BadRequestException('Seleccione una empresa (X-Tenant-Id)');
  return t;
}

@Controller('journal-entries')
export class JournalController {
  constructor(private readonly svc: JournalService) {}

  @Get()
  list(
    @TenantId() t: string | undefined,
    @Query('year') year?: string,
    @Query('period') period?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.list(requireTenant(t), {
      year: year ? parseInt(year, 10) : undefined,
      period: period ? parseInt(period, 10) : undefined,
      status,
    });
  }

  @Get(':id')
  get(@TenantId() t: string | undefined, @Param('id') id: string) {
    return this.svc.get(requireTenant(t), id);
  }

  @Post()
  @Roles('ADMIN', 'CONTADOR')
  create(@TenantId() t: string | undefined, @CurrentUser() u: JwtUserPayload, @Body() dto: CreateEntryDto) {
    return this.svc.createManual(requireTenant(t), u.sub, dto);
  }

  @Post(':id/void')
  @Roles('ADMIN', 'CONTADOR')
  void(@TenantId() t: string | undefined, @Param('id') id: string) {
    return this.svc.void(requireTenant(t), id);
  }
}
