import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PurchasesBook, TaxRetentionIva, TaxRetentionIslr,
} from '../../entities/fiscal.entity';
import { Tenant } from '../../entities/tenant.entity';
import { AccountingModule } from '../accounting/accounting.module';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchasesBook, TaxRetentionIva, TaxRetentionIslr, Tenant]),
    AccountingModule,
  ],
  providers: [PurchasesService],
  controllers: [PurchasesController],
})
export class PurchasesModule {}
