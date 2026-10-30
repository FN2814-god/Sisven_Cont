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
exports.TenantGuard = exports.RolesGuard = exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const decorators_1 = require("./decorators");
const user_entity_1 = require("../entities/user.entity");
let JwtAuthGuard = class JwtAuthGuard {
    jwt;
    reflector;
    constructor(jwt, reflector) {
        this.jwt = jwt;
        this.reflector = reflector;
    }
    async canActivate(ctx) {
        const isPublic = this.reflector.getAllAndOverride(decorators_1.IS_PUBLIC_KEY, [
            ctx.getHandler(), ctx.getClass(),
        ]);
        if (isPublic)
            return true;
        const req = ctx.switchToHttp().getRequest();
        const header = req.headers['authorization'] || '';
        const [type, token] = header.split(' ');
        if (type !== 'Bearer' || !token) {
            throw new common_1.UnauthorizedException('Token de acceso requerido');
        }
        try {
            req.user = await this.jwt.verifyAsync(token);
            return true;
        }
        catch {
            throw new common_1.UnauthorizedException('Token inválido o expirado');
        }
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        core_1.Reflector])
], JwtAuthGuard);
let RolesGuard = class RolesGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(ctx) {
        const required = this.reflector.getAllAndOverride(decorators_1.ROLES_KEY, [
            ctx.getHandler(), ctx.getClass(),
        ]);
        if (!required || required.length === 0)
            return true;
        const { user } = ctx.switchToHttp().getRequest();
        if (!user)
            return true;
        if (user.role === 'ADMIN' || required.includes(user.role))
            return true;
        throw new common_1.ForbiddenException('Su rol no tiene permiso para esta operación');
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RolesGuard);
let TenantGuard = class TenantGuard {
    userTenants;
    constructor(userTenants) {
        this.userTenants = userTenants;
    }
    async canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        const tenantId = req.headers['x-tenant-id'] || req.query?.tenant_id;
        if (!tenantId || !req.user)
            return true;
        if (req.user.role !== 'ADMIN') {
            const access = await this.userTenants.findOne({
                where: { user_id: req.user.sub, tenant_id: tenantId },
            });
            if (!access) {
                throw new common_1.ForbiddenException('No tiene acceso a la empresa indicada');
            }
        }
        req.tenantId = tenantId;
        return true;
    }
};
exports.TenantGuard = TenantGuard;
exports.TenantGuard = TenantGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.UserTenant)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TenantGuard);
//# sourceMappingURL=auth.guards.js.map