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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcryptjs"));
const user_entity_1 = require("../../entities/user.entity");
const tenant_entity_1 = require("../../entities/tenant.entity");
let AuthService = class AuthService {
    users;
    userTenants;
    tenants;
    jwt;
    constructor(users, userTenants, tenants, jwt) {
        this.users = users;
        this.userTenants = userTenants;
        this.tenants = tenants;
        this.jwt = jwt;
    }
    async login(email, password) {
        const user = await this.users.findOne({ where: { email: email.toLowerCase().trim() } });
        if (!user || !user.is_active) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok)
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        const payload = {
            sub: user.user_id,
            email: user.email,
            role: user.role,
            full_name: user.full_name,
        };
        const access_token = await this.jwt.signAsync(payload);
        return { access_token, user: payload, tenants: await this.accessibleTenants(user) };
    }
    async accessibleTenants(user) {
        if (user.role === 'ADMIN') {
            return this.tenants.find({ where: { is_active: true }, order: { razon_social: 'ASC' } });
        }
        const links = await this.userTenants.find({ where: { user_id: user.user_id } });
        if (!links.length)
            return [];
        return this.tenants.find({
            where: { tenant_id: (0, typeorm_2.In)(links.map((l) => l.tenant_id)), is_active: true },
            order: { razon_social: 'ASC' },
        });
    }
    async me(userId) {
        const user = await this.users.findOne({ where: { user_id: userId } });
        if (!user)
            throw new common_1.UnauthorizedException();
        const { password_hash: _ph, ...safe } = user;
        return { ...safe, tenants: await this.accessibleTenants(user) };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.UserTenant)),
    __param(2, (0, typeorm_1.InjectRepository)(tenant_entity_1.Tenant)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map