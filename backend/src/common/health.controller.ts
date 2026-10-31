import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from './decorators';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  @Public()
  @Get()
  async check() {
    await this.ds.query('SELECT 1');
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
