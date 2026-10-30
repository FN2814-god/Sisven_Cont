import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../../entities/tenant.entity';
import { User, UserTenant } from '../../entities/user.entity';
import { TenantsService } from './tenants.service';
import { TenantsController, BcvController } from './tenants.controller';
import { AuthModule } from '../auth/auth.module';
import { SeedService } from '../../database/seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, User, UserTenant]), AuthModule],
  providers: [TenantsService, SeedService],
  controllers: [TenantsController, BcvController],
})
export class TenantsModule {}
