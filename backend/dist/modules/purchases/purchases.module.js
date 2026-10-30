"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchasesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const fiscal_entity_1 = require("../../entities/fiscal.entity");
const tenant_entity_1 = require("../../entities/tenant.entity");
const accounting_module_1 = require("../accounting/accounting.module");
const purchases_service_1 = require("./purchases.service");
const purchases_controller_1 = require("./purchases.controller");
let PurchasesModule = class PurchasesModule {
};
exports.PurchasesModule = PurchasesModule;
exports.PurchasesModule = PurchasesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([fiscal_entity_1.PurchasesBook, fiscal_entity_1.TaxRetentionIva, fiscal_entity_1.TaxRetentionIslr, tenant_entity_1.Tenant]),
            accounting_module_1.AccountingModule,
        ],
        providers: [purchases_service_1.PurchasesService],
        controllers: [purchases_controller_1.PurchasesController],
    })
], PurchasesModule);
//# sourceMappingURL=purchases.module.js.map