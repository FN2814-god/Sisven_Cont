import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxRetentionIva, TaxRetentionIslr } from '../../entities/fiscal.entity';
import { RetentionsService } from './retentions.service';
import { RetentionsController } from './retentions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaxRetentionIva, TaxRetentionIslr])],
  providers: [RetentionsService],
  controllers: [RetentionsController],
})
export class RetentionsModule {}
