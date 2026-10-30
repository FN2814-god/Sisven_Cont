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
exports.StatsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fiscal_entity_1 = require("../../entities/fiscal.entity");
const bank_entity_1 = require("../../entities/bank.entity");
const tenant_entity_1 = require("../../entities/tenant.entity");
let StatsService = class StatsService {
    sales;
    purchases;
    iva;
    islr;
    statements;
    tenants;
    constructor(sales, purchases, iva, islr, statements, tenants) {
        this.sales = sales;
        this.purchases = purchases;
        this.iva = iva;
        this.islr = islr;
        this.statements = statements;
        this.tenants = tenants;
    }
    async get(tenantId) {
        const now = new Date();
        const year = now.getFullYear();
        const period = now.getMonth() + 1;
        const salesRow = await this.sales
            .createQueryBuilder('s')
            .select('COALESCE(SUM(s.total_ventas_con_iva),0)', 'total')
            .addSelect('COUNT(*)', 'count')
            .where('s.tenant_id = :t AND s.fiscal_year = :y AND s.fiscal_period = :p', { t: tenantId, y: year, p: period })
            .getRawOne();
        const purchasesRow = await this.purchases
            .createQueryBuilder('p')
            .select('COALESCE(SUM(p.total_compras_con_iva),0)', 'total')
            .addSelect('COUNT(*)', 'count')
            .where('p.tenant_id = :t AND p.fiscal_year = :y AND p.fiscal_period = :p', { t: tenantId, y: year, p: period })
            .getRawOne();
        const retIva = await this.iva
            .createQueryBuilder('r')
            .select('COALESCE(SUM(r.monto_iva_retenido),0)', 'total')
            .where('r.tenant_id = :t', { t: tenantId })
            .getRawOne();
        const retIslr = await this.islr
            .createQueryBuilder('r')
            .select('COALESCE(SUM(r.monto_retenido),0)', 'total')
            .where('r.tenant_id = :t', { t: tenantId })
            .getRawOne();
        const pendingBank = await this.statements.count({
            where: { tenant_id: tenantId, status: 'PENDIENTE' },
        });
        const tenant = await this.tenants.findOne({ where: { tenant_id: tenantId } });
        return {
            fiscal_year: year,
            fiscal_period: period,
            total_sales_month_ves: +salesRow.total,
            sales_count_month: +salesRow.count,
            total_purchases_month_ves: +purchasesRow.total,
            purchases_count_month: +purchasesRow.count,
            iva_retenido_acumulado_ves: +retIva.total,
            islr_retenido_acumulado_ves: +retIslr.total,
            pending_bank_count: pendingBank,
            tenant: tenant
                ? {
                    rif: tenant.rif,
                    razon_social: tenant.razon_social,
                    es_contribuyente_especial: tenant.es_contribuyente_especial,
                    porcentaje_retencion_iva: tenant.porcentaje_retencion_iva,
                }
                : null,
        };
    }
};
exports.StatsService = StatsService;
exports.StatsService = StatsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(fiscal_entity_1.SalesBook)),
    __param(1, (0, typeorm_1.InjectRepository)(fiscal_entity_1.PurchasesBook)),
    __param(2, (0, typeorm_1.InjectRepository)(fiscal_entity_1.TaxRetentionIva)),
    __param(3, (0, typeorm_1.InjectRepository)(fiscal_entity_1.TaxRetentionIslr)),
    __param(4, (0, typeorm_1.InjectRepository)(bank_entity_1.BankStatement)),
    __param(5, (0, typeorm_1.InjectRepository)(tenant_entity_1.Tenant)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], StatsService);
//# sourceMappingURL=stats.service.js.map