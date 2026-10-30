"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const serve_static_1 = require("@nestjs/serve-static");
const typeorm_1 = require("@nestjs/typeorm");
const path_1 = require("path");
const typeorm_config_1 = require("./config/typeorm.config");
const auth_guards_1 = require("./common/auth.guards");
const audit_interceptor_1 = require("./common/audit.interceptor");
const user_entity_1 = require("./entities/user.entity");
const audit_entity_1 = require("./entities/audit.entity");
const seed_service_1 = require("./database/seed.service");
const user_entity_2 = require("./entities/user.entity");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const tenants_module_1 = require("./modules/tenants/tenants.module");
const accounting_module_1 = require("./modules/accounting/accounting.module");
const sales_module_1 = require("./modules/sales/sales.module");
const purchases_module_1 = require("./modules/purchases/purchases.module");
const retentions_module_1 = require("./modules/retentions/retentions.module");
const banks_module_1 = require("./modules/banks/banks.module");
const stats_module_1 = require("./modules/stats/stats.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRoot((0, typeorm_config_1.buildDataSourceOptions)()),
            typeorm_1.TypeOrmModule.forFeature([user_entity_2.User, user_entity_1.UserTenant, audit_entity_1.AuditLog]),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', '..', 'frontend', 'dist'),
                exclude: ['/api*'],
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            tenants_module_1.TenantsModule,
            accounting_module_1.AccountingModule,
            sales_module_1.SalesModule,
            purchases_module_1.PurchasesModule,
            retentions_module_1.RetentionsModule,
            banks_module_1.BanksModule,
            stats_module_1.StatsModule,
        ],
        providers: [
            seed_service_1.SeedService,
            { provide: core_1.APP_GUARD, useClass: auth_guards_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: auth_guards_1.RolesGuard },
            { provide: core_1.APP_GUARD, useClass: auth_guards_1.TenantGuard },
            { provide: core_1.APP_INTERCEPTOR, useClass: audit_interceptor_1.AuditInterceptor },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map