import {
  BadRequestException, Body, Controller, Get, Param, Post, Query,
} from '@nestjs/common';
import {
  IsIn, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';
import { Roles, TenantId } from '../../common/decorators';
import { BanksService } from './banks.service';

function requireTenant(t?: string): string {
  if (!t) throw new BadRequestException('Seleccione una empresa (X-Tenant-Id)');
  return t;
}

class BankAccountDto {
  @IsString() bank_name: string;
  @IsString() account_number: string;
  @IsOptional() @IsIn(['VES', 'USD']) currency?: 'VES' | 'USD';
  @IsOptional() @IsString() description?: string;
}

class StatementDto {
  @IsOptional() @IsString() bank_account_id?: string;
  @IsString() transaction_date: string;
  @IsString() reference_number: string;
  @IsString() description: string;
  @IsIn(['DEBITO', 'CREDITO']) movement_type: 'DEBITO' | 'CREDITO';
  @IsNumber() @Min(0) amount: number;
}

class MovementDto {
  @IsOptional() @IsString() bank_account_id?: string;
  @IsString() movement_date: string;
  @IsString() reference_number: string;
  @IsString() concept: string;
  @IsIn(['DEBITO', 'CREDITO']) movement_type: 'DEBITO' | 'CREDITO';
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() sales_invoice_number?: string;
}

class ReconcileDto {
  @IsOptional() @IsString() bank_account_id?: string;
  @IsOptional() @IsNumber() bcv_rate?: number;
}

@Controller('banks')
export class BanksController {
  constructor(private readonly svc: BanksService) {}

  @Get('accounts') accounts(@TenantId() t?: string) { return this.svc.listAccounts(requireTenant(t)); }

  @Post('accounts')
  @Roles('ADMIN', 'CONTADOR')
  createAccount(@TenantId() t: string | undefined, @Body() dto: BankAccountDto) {
    return this.svc.createAccount(requireTenant(t), dto);
  }

  @Get('statements')
  statements(@TenantId() t: string | undefined, @Query('status') status?: string) {
    return this.svc.listStatements(requireTenant(t), status);
  }

  @Post('statements')
  @Roles('ADMIN', 'CONTADOR')
  addStatement(@TenantId() t: string | undefined, @Body() dto: StatementDto) {
    return this.svc.addStatement(requireTenant(t), dto);
  }

  @Get('movements')
  movements(@TenantId() t: string | undefined, @Query('status') status?: string) {
    return this.svc.listMovements(requireTenant(t), status);
  }

  @Post('movements')
  @Roles('ADMIN', 'CONTADOR')
  addMovement(@TenantId() t: string | undefined, @Body() dto: MovementDto) {
    return this.svc.addMovement(requireTenant(t), dto);
  }

  @Post('reconcile')
  @Roles('ADMIN', 'CONTADOR')
  reconcile(@TenantId() t: string | undefined, @Body() dto: ReconcileDto) {
    return this.svc.reconcile(requireTenant(t), dto.bank_account_id, dto.bcv_rate);
  }

  @Post('statements/:id/match/:movementId')
  @Roles('ADMIN', 'CONTADOR')
  match(@TenantId() t: string | undefined, @Param('id') id: string, @Param('movementId') movId: string) {
    return this.svc.manualMatch(requireTenant(t), id, movId);
  }
}
