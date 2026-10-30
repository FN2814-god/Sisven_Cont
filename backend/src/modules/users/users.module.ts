import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, UserTenant } from '../../entities/user.entity';
import { Tenant } from '../../entities/tenant.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserTenant, Tenant])],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
