"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const accounting_entity_1 = require("../../entities/accounting.entity");
const standard_accounts_1 = require("../../database/standard-accounts");
let ChartService = class ChartService {
    chart;
    lines;
    constructor(chart, lines) {
        this.chart = chart;
        this.lines = lines;
    }
    list(tenantId) {
        return this.chart.find({ where: { tenant_id: tenantId }, order: { code: 'ASC' } });
    }
    async create(tenantId, dto) {
        const level = (0, standard_accounts_1.accountLevel)(dto.code);
        if (!level) {
            throw new common_1.BadRequestException(`Código inválido (formato N.N.NN.NN.NN.NNN): ${dto.code}`);
        }
        if (await this.chart.findOne({ where: { tenant_id: tenantId, code: dto.code } })) {
            throw new common_1.BadRequestException(`Ya existe la cuenta ${dto.code}`);
        }
        let parent = null;
        if (level > 1) {
            const parentCode = (0, standard_accounts_1.parentCodeOf)(dto.code);
            parent = await this.chart.findOne({
                where: { tenant_id: tenantId, code: parentCode },
            });
            if (!parent) {
                throw new common_1.BadRequestException(`Debe crear primero la cuenta padre ${parentCode}`);
            }
            if (parent.is_selectable) {
                throw new common_1.BadRequestException('El padre no puede ser una cuenta seleccionable');
            }
        }
        if (level < 6 && dto.is_selectable) {
            throw new common_1.BadRequestException('Sólo las cuentas de nivel 6 (auxiliares) son seleccionables');
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
    async update(tenantId, id, dto) {
        const acc = await this.chart.findOne({ where: { account_id: id, tenant_id: tenantId } });
        if (!acc)
            throw new common_1.NotFoundException('Cuenta no encontrada');
        if (dto.name)
            acc.name = dto.name;
        if (dto.nature)
            acc.nature = dto.nature;
        if (dto.niif_classification !== undefined)
            acc.niif_classification = dto.niif_classification;
        if (dto.is_selectable !== undefined) {
            if (dto.is_selectable && acc.level !== 6) {
                throw new common_1.BadRequestException('Sólo cuentas auxiliares pueden ser seleccionables');
            }
            acc.is_selectable = dto.is_selectable;
        }
        return this.chart.save(acc);
    }
    async remove(tenantId, id) {
        const acc = await this.chart.findOne({ where: { account_id: id, tenant_id: tenantId } });
        if (!acc)
            throw new common_1.NotFoundException('Cuenta no encontrada');
        const children = await this.chart.count({ where: { parent_id: id } });
        if (children > 0) {
            throw new common_1.BadRequestException('La cuenta tiene subcuentas; elimínelas primero');
        }
        const used = await this.lines.count({ where: { account_id: id } });
        if (used > 0) {
            throw new common_1.BadRequestException(`La cuenta tiene ${used} movimiento(s) contables y no puede eliminarse`);
        }
        await this.chart.delete(id);
        return { deleted: true };
    }
};
exports.ChartService = ChartService;
exports.ChartService = ChartService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(accounting_entity_1.ChartOfAccount)),
    __param(1, (0, typeorm_1.InjectRepository)(accounting_entity_1.JournalEntryLine)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ChartService);
//# sourceMappingURL=chart.service.js.map