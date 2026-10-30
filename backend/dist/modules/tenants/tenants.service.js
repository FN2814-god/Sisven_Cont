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
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_entity_1 = require("../../entities/tenant.entity");
const user_entity_1 = require("../../entities/user.entity");
const seed_service_1 = require("../../database/seed.service");
const auth_service_1 = require("../auth/auth.service");
const rif_validator_1 = require("../../shared/seniat/rif-validator");
const bcv_service_1 = require("../../shared/seniat/bcv-service");
let TenantsService = class TenantsService {
    ds;
    tenants;
    userTenants;
    seeds;
    auth;
    constructor(ds, tenants, userTenants, seeds, auth) {
        this.ds = ds;
        this.tenants = tenants;
        this.userTenants = userTenants;
        this.seeds = seeds;
        this.auth = auth;
    }
    list(user) {
        return this.auth.accessibleTenants({ user_id: user.sub, role: user.role });
    }
    async get(user, id) {
        const tenant = await this.tenants.findOne({ where: { tenant_id: id } });
        if (!tenant)
            throw new common_1.NotFoundException('Empresa no encontrada');
        if (user.role !== 'ADMIN') {
            const access = await this.userTenants.findOne({
                where: { user_id: user.sub, tenant_id: id },
            });
            if (!access)
                throw new common_1.ForbiddenException('Sin acceso a esta empresa');
        }
        return tenant;
    }
    async create(userId, dto) {
        if (!rif_validator_1.RifValidator.isValid(dto.rif)) {
            throw new common_1.BadRequestException(`RIF inválido (dígito verificador Módulo 11): ${dto.rif}`);
        }
        const rif = rif_validator_1.RifValidator.format(dto.rif);
        if (await this.tenants.findOne({ where: { rif } })) {
            throw new common_1.BadRequestException('Ya existe una empresa registrada con ese RIF');
        }
        return this.ds.transaction(async (m) => {
            const tenant = await m.save(tenant_entity_1.Tenant, {
                rif,
                razon_social: dto.razon_social,
                nombre_comercial: dto.nombre_comercial || dto.razon_social,
                es_contribuyente_especial: !!dto.es_contribuyente_especial,
                porcentaje_retencion_iva: dto.es_contribuyente_especial
                    ? (dto.porcentaje_retencion_iva ?? 75.0) : 0,
            });
            await this.seeds.seedTenant(tenant.tenant_id, m);
            await m.save(user_entity_1.UserTenant, { user_id: userId, tenant_id: tenant.tenant_id });
            return tenant;
        });
    }
    async update(id, dto) {
        const tenant = await this.tenants.findOne({ where: { tenant_id: id } });
        if (!tenant)
            throw new common_1.NotFoundException('Empresa no encontrada');
        delete dto.rif;
        Object.assign(tenant, dto);
        return this.tenants.save(tenant);
    }
    async setManualRate(id, tasa) {
        if (!tasa || tasa <= 0)
            throw new common_1.BadRequestException('La tasa debe ser mayor a cero');
        const tenant = await this.tenants.findOne({ where: { tenant_id: id } });
        if (!tenant)
            throw new common_1.NotFoundException('Empresa no encontrada');
        tenant.tasa_bcv_manual = tasa;
        return this.tenants.save(tenant);
    }
    async bcvRate(tenantId) {
        try {
            return await bcv_service_1.BcvExchangeService.fetchOfficialRate();
        }
        catch {
            if (tenantId) {
                const t = await this.tenants.findOne({ where: { tenant_id: tenantId } });
                if (t?.tasa_bcv_manual) {
                    return { rate: t.tasa_bcv_manual, source: 'MANUAL_TENANT' };
                }
            }
            throw new common_1.BadRequestException('No se pudo obtener la tasa BCV. Configure una tasa manual en la empresa.');
        }
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __param(1, (0, typeorm_1.InjectRepository)(tenant_entity_1.Tenant)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.UserTenant)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository,
        seed_service_1.SeedService,
        auth_service_1.AuthService])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map