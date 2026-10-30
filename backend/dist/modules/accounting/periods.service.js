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
exports.PeriodsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const accounting_entity_1 = require("../../entities/accounting.entity");
let PeriodsService = class PeriodsService {
    periods;
    constructor(periods) {
        this.periods = periods;
    }
    list(tenantId, year) {
        const where = { tenant_id: tenantId };
        if (year)
            where.fiscal_year = year;
        return this.periods.find({
            where, order: { fiscal_year: 'DESC', fiscal_month: 'ASC' },
        });
    }
    async ensureYear(tenantId, year) {
        const created = [];
        for (let month = 1; month <= 12; month++) {
            const exists = await this.periods.findOne({
                where: { tenant_id: tenantId, fiscal_year: year, fiscal_month: month },
            });
            if (!exists) {
                created.push(await this.periods.save(this.periods.create({
                    tenant_id: tenantId, fiscal_year: year, fiscal_month: month,
                })));
            }
        }
        return { ensured: 12, created: created.length };
    }
    async setStatus(tenantId, periodId, status) {
        const p = await this.periods.findOne({ where: { period_id: periodId, tenant_id: tenantId } });
        if (!p)
            throw new common_1.NotFoundException('Período no encontrado');
        if (p.status === status)
            throw new common_1.BadRequestException(`El período ya está ${status}`);
        p.status = status;
        return this.periods.save(p);
    }
};
exports.PeriodsService = PeriodsService;
exports.PeriodsService = PeriodsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(accounting_entity_1.FiscalPeriod)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PeriodsService);
//# sourceMappingURL=periods.service.js.map