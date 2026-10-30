import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ChartOfAccount, FiscalPeriod, JournalEntry, JournalEntryLine,
} from '../../entities/accounting.entity';
import { JournalService } from './journal.service';
import { JournalController } from './journal.controller';
import { ChartController } from './chart.controller';
import { ChartService } from './chart.service';
import { PeriodsController } from './periods.controller';
import { PeriodsService } from './periods.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChartOfAccount, FiscalPeriod, JournalEntry, JournalEntryLine]),
  ],
  providers: [JournalService, ChartService, PeriodsService, ReportsService],
  controllers: [JournalController, ChartController, PeriodsController, ReportsController],
  exports: [JournalService, PeriodsService],
})
export class AccountingModule {}
