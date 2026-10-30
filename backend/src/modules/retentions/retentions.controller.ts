import {
  BadRequestException, Controller, Get, Query, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { TenantId } from '../../common/decorators';
import { RetentionsService } from './retentions.service';

function requireTenant(t?: string): string {
  if (!t) throw new BadRequestException('Seleccione una empresa (X-Tenant-Id)');
  return t;
}

@Controller('retentions')
export class RetentionsController {
  constructor(private readonly svc: RetentionsService) {}

  @Get('iva')
  listIva(@TenantId() t: string | undefined, @Query('periodo') periodo?: string) {
    return this.svc.listIva(requireTenant(t), periodo);
  }

  @Get('islr')
  listIslr(@TenantId() t: string | undefined, @Query('periodo') periodo?: string) {
    return this.svc.listIslr(requireTenant(t), periodo);
  }

  /** Descarga TXT oficial SENIAT (retenciones IVA del período) */
  @Get('iva/txt')
  async txt(@TenantId() t: string | undefined, @Query('periodo') periodo: string,
            @Res() res: Response) {
    const file = await this.svc.generateVatTxt(requireTenant(t), periodo);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.content);
  }

  /** Descarga XML oficial SENIAT (retenciones ISLR del período) */
  @Get('islr/xml')
  async xml(@TenantId() t: string | undefined, @Query('periodo') periodo: string,
            @Res() res: Response) {
    const file = await this.svc.generateIslrXml(requireTenant(t), periodo);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.content);
  }
}
