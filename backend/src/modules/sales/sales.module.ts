import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesBook } from '../../entities/fiscal.entity';
import { Tenant } from '../../entities/tenant.entity';
import { AccountingModule } from '../accounting/accounting.module';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalesBook, Tenant]),
    AccountingModule,
  ],
  providers: [SalesService],
  controllers: [SalesController],
})
export class SalesModule {}
