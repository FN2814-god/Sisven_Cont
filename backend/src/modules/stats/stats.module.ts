import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PurchasesBook, SalesBook, TaxRetentionIva, TaxRetentionIslr,
} from '../../entities/fiscal.entity';
import { BankStatement } from '../../entities/bank.entity';
import { Tenant } from '../../entities/tenant.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalesBook, PurchasesBook, TaxRetentionIva, TaxRetentionIslr, BankStatement, Tenant]),
  ],
  providers: [StatsService],
  controllers: [StatsController],
})
export class StatsModule {}
