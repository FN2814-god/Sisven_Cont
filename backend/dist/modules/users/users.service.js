"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcryptjs"));
const user_entity_1 = require("../../entities/user.entity");
const tenant_entity_1 = require("../../entities/tenant.entity");
let UsersService = class UsersService {
    ds;
    users;
    userTenants;
    tenants;
    constructor(ds, users, userTenants, tenants) {
        this.ds = ds;
        this.users = users;
        this.userTenants = userTenants;
        this.tenants = tenants;
    }
    async findAll() {
        const users = await this.users.find({ order: { full_name: 'ASC' } });
        const links = await this.userTenants.find();
        return users.map(({ password_hash: _ph, ...u }) => ({
            ...u,
            tenant_ids: links.filter((l) => l.user_id === u.user_id).map((l) => l.tenant_id),
        }));
    }
    async create(dto) {
        const email = dto.email.toLowerCase().trim();
        if (await this.users.findOne({ where: { email } })) {
            throw new common_1.BadRequestException('Ya existe un usuario con ese correo');
        }
        return this.ds.transaction(async (m) => {
            const user = await m.save(user_entity_1.User, {
                email,
                password_hash: await bcrypt.hash(dto.password, 10),
                full_name: dto.full_name,
                role: dto.role,
            });
            await this.assignTenants(user.user_id, dto.tenant_ids ?? [], m);
            const { password_hash: _ph, ...safe } = user;
            return safe;
        });
    }
    async update(id, dto) {
        const user = await this.users.findOne({ where: { user_id: id } });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        if (dto.full_name)
            user.full_name = dto.full_name;
        if (dto.role)
            user.role = dto.role;
        if (dto.is_active !== undefined)
            user.is_active = dto.is_active;
        if (dto.password)
            user.password_hash = await bcrypt.hash(dto.password, 10);
        const saved = await this.users.save(user);
        const { password_hash: _ph, ...safe } = saved;
        return safe;
    }
    async assignTenants(userId, tenantIds, m) {
        const manager = m ?? this.ds.manager;
        for (const tid of tenantIds) {
            const t = await manager.findOne(tenant_entity_1.Tenant, { where: { tenant_id: tid } });
            if (!t)
                throw new common_1.BadRequestException(`Empresa inexistente: ${tid}`);
        }
        await manager.delete(user_entity_1.UserTenant, { user_id: userId });
        for (const tid of tenantIds) {
            await manager.save(user_entity_1.UserTenant, { user_id: userId, tenant_id: tid });
        }
        return { assigned: tenantIds.length };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.UserTenant)),
    __param(3, (0, typeorm_1.InjectRepository)(tenant_entity_1.Tenant)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map