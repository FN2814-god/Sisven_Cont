import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BankAccount, BankMovement, BankReconciliation, BankStatement,
} from '../../entities/bank.entity';
import { Tenant } from '../../entities/tenant.entity';
import { BanksService } from './banks.service';
import { BanksController } from './banks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([BankAccount, BankStatement, BankMovement, BankReconciliation, Tenant]),
  ],
  providers: [BanksService],
  controllers: [BanksController],
})
export class BanksModule {}
