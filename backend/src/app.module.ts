import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { buildDataSourceOptions } from './config/typeorm.config';
import { JwtAuthGuard, RolesGuard, TenantGuard } from './common/auth.guards';
import { AuditInterceptor } from './common/audit.interceptor';
import { UserTenant } from './entities/user.entity';
import { AuditLog } from './entities/audit.entity';
import { SeedService } from './database/seed.service';
import { User } from './entities/user.entity';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { SalesModule } from './modules/sales/sales.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { RetentionsModule } from './modules/retentions/retentions.module';
import { BanksModule } from './modules/banks/banks.module';
import { StatsModule } from './modules/stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(buildDataSourceOptions()),
    TypeOrmModule.forFeature([User, UserTenant, AuditLog]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend', 'dist'),
      exclude: ['/api/{*splat}'],
    }),
    AuthModule,
    UsersModule,
    TenantsModule,
    AccountingModule,
    SalesModule,
    PurchasesModule,
    RetentionsModule,
    BanksModule,
    StatsModule,
  ],
  providers: [
    SeedService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
