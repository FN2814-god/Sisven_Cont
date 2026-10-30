"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const fiscal_entity_1 = require("../../entities/fiscal.entity");
const bank_entity_1 = require("../../entities/bank.entity");
const tenant_entity_1 = require("../../entities/tenant.entity");
const stats_controller_1 = require("./stats.controller");
const stats_service_1 = require("./stats.service");
let StatsModule = class StatsModule {
};
exports.StatsModule = StatsModule;
exports.StatsModule = StatsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([fiscal_entity_1.SalesBook, fiscal_entity_1.PurchasesBook, fiscal_entity_1.TaxRetentionIva, fiscal_entity_1.TaxRetentionIslr, bank_entity_1.BankStatement, tenant_entity_1.Tenant]),
        ],
        providers: [stats_service_1.StatsService],
        controllers: [stats_controller_1.StatsController],
    })
], StatsModule);
//# sourceMappingURL=stats.module.js.map