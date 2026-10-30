import {
  Body, Controller, Get, Param, Patch, Post, Put,
} from '@nestjs/common';
import {
  ArrayNotEmpty, IsArray, IsBoolean, IsEmail, IsIn, IsOptional,
  IsString, MinLength,
} from 'class-validator';
import { Roles } from '../../common/decorators';
import { UsersService } from './users.service';
import { UserRole } from '../../entities/user.entity';

class CreateUserDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsString() full_name: string;
  @IsIn(['ADMIN', 'CONTADOR', 'CONSULTA']) role: UserRole;
  @IsOptional() @IsArray() tenant_ids?: string[];
}

class UpdateUserDto {
  @IsOptional() @IsString() full_name?: string;
  @IsOptional() @IsIn(['ADMIN', 'CONTADOR', 'CONSULTA']) role?: UserRole;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsString() @MinLength(6) password?: string;
}

class AssignTenantsDto {
  @IsArray() tenant_ids: string[];
}

@Controller('users')
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get() findAll() { return this.svc.findAll(); }

  @Post() create(@Body() dto: CreateUserDto) { return this.svc.create(dto); }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.svc.update(id, dto);
  }

  @Put(':id/tenants')
  assign(@Param('id') id: string, @Body() dto: AssignTenantsDto) {
    return this.svc.assignTenants(id, dto.tenant_ids);
  }
}
