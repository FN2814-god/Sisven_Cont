import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChartOfAccount, JournalEntryLine } from '../../entities/accounting.entity';
import { accountLevel, parentCodeOf } from '../../database/standard-accounts';

@Injectable()
export class ChartService {
  constructor(
    @InjectRepository(ChartOfAccount)
    private readonly chart: Repository<ChartOfAccount>,
    @InjectRepository(JournalEntryLine)
    private readonly lines: Repository<JournalEntryLine>,
  ) {}

  list(tenantId: string) {
    return this.chart.find({ where: { tenant_id: tenantId }, order: { code: 'ASC' } });
  }

  async create(tenantId: string, dto: Partial<ChartOfAccount> & { code: string; name: string }) {
    const level = accountLevel(dto.code);
    if (!level) {
      throw new BadRequestException(`Código inválido (formato N.N.NN.NN.NN.NNN): ${dto.code}`);
    }
    if (await this.chart.findOne({ where: { tenant_id: tenantId, code: dto.code } })) {
      throw new BadRequestException(`Ya existe la cuenta ${dto.code}`);
    }

    let parent: ChartOfAccount | null = null;
    if (level > 1) {
      const parentCode = parentCodeOf(dto.code)!;
      parent = await this.chart.findOne({
        where: { tenant_id: tenantId, code: parentCode },
      });
      if (!parent) {
        throw new BadRequestException(
          `Debe crear primero la cuenta padre ${parentCode}`,
        );
      }
      if (parent.is_selectable) {
        throw new BadRequestException('El padre no puede ser una cuenta seleccionable');
      }
    }
    if (level < 6 && dto.is_selectable) {
      throw new BadRequestException('Sólo las cuentas de nivel 6 (auxiliares) son seleccionables');
    }

    return this.chart.save(this.chart.create({
      tenant_id: tenantId,
      code: dto.code,
      name: dto.name,
      level,
      parent_id: parent?.account_id ?? null,
      nature: dto.nature ?? parent?.nature ?? 'DEUDORA',
      is_selectable: level === 6 ? (dto.is_selectable ?? true) : false,
      niif_classification: dto.niif_classification ?? null,
    }));
  }

  async update(tenantId: string, id: string, dto: Partial<ChartOfAccount>) {
    const acc = await this.chart.findOne({ where: { account_id: id, tenant_id: tenantId } });
    if (!acc) throw new NotFoundException('Cuenta no encontrada');
    if (dto.name) acc.name = dto.name;
    if (dto.nature) acc.nature = dto.nature;
    if (dto.niif_classification !== undefined) acc.niif_classification = dto.niif_classification;
    if (dto.is_selectable !== undefined) {
      if (dto.is_selectable && acc.level !== 6) {
        throw new BadRequestException('Sólo cuentas auxiliares pueden ser seleccionables');
      }
      acc.is_selectable = dto.is_selectable;
    }
    return this.chart.save(acc);
  }

  async remove(tenantId: string, id: string) {
    const acc = await this.chart.findOne({ where: { account_id: id, tenant_id: tenantId } });
    if (!acc) throw new NotFoundException('Cuenta no encontrada');
    const children = await this.chart.count({ where: { parent_id: id } });
    if (children > 0) {
      throw new BadRequestException('La cuenta tiene subcuentas; elimínelas primero');
    }
    const used = await this.lines.count({ where: { account_id: id } });
    if (used > 0) {
      throw new BadRequestException(
        `La cuenta tiene ${used} movimiento(s) contables y no puede eliminarse`,
      );
    }
    await this.chart.delete(id);
    return { deleted: true };
  }
}
