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
var SeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcryptjs"));
const user_entity_1 = require("../entities/user.entity");
const accounting_entity_1 = require("../entities/accounting.entity");
const standard_accounts_1 = require("./standard-accounts");
let SeedService = SeedService_1 = class SeedService {
    ds;
    users;
    logger = new common_1.Logger(SeedService_1.name);
    constructor(ds, users) {
        this.ds = ds;
        this.users = users;
    }
    async run() {
        await this.seedAdminUser();
    }
    async seedAdminUser() {
        const count = await this.users.count();
        if (count > 0)
            return;
        const email = process.env.SEED_ADMIN_EMAIL || 'admin@sisven.local';
        const password = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
        await this.users.save({
            email,
            password_hash: await bcrypt.hash(password, 10),
            full_name: 'Administrador del Sistema',
            role: 'ADMIN',
        });
        this.logger.log(`Usuario administrador creado: ${email}`);
    }
    async seedTenant(tenantId, manager = this.ds.manager) {
        const chart = (0, standard_accounts_1.buildStandardChart)();
        const idByCode = new Map();
        for (const acc of chart) {
            const saved = await manager.save(accounting_entity_1.ChartOfAccount, {
                tenant_id: tenantId,
                code: acc.code,
                name: acc.name,
                level: acc.level,
                parent_id: acc.parentCode ? (idByCode.get(acc.parentCode) ?? null) : null,
                nature: acc.nature,
                is_selectable: acc.isSelectable,
                niif_classification: acc.niif ?? null,
            });
            idByCode.set(acc.code, saved.account_id);
        }
        const year = new Date().getFullYear();
        for (let month = 1; month <= 12; month++) {
            await manager.save(accounting_entity_1.FiscalPeriod, {
                tenant_id: tenantId,
                fiscal_year: year,
                fiscal_month: month,
                status: 'ABIERTO',
            });
        }
    }
};
exports.SeedService = SeedService;
exports.SeedService = SeedService = SeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository])
], SeedService);
//# sourceMappingURL=seed.service.js.map