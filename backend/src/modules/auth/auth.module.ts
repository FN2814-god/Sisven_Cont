import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, UserTenant } from '../../entities/user.entity';
import { Tenant } from '../../entities/tenant.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserTenant, Tenant]),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'sisven-dev-secret',
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN || '12h') as any,
      },
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
