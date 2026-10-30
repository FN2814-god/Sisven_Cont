"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const fiscal_entity_1 = require("../../entities/fiscal.entity");
const tenant_entity_1 = require("../../entities/tenant.entity");
const accounting_module_1 = require("../accounting/accounting.module");
const sales_service_1 = require("./sales.service");
const sales_controller_1 = require("./sales.controller");
let SalesModule = class SalesModule {
};
exports.SalesModule = SalesModule;
exports.SalesModule = SalesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([fiscal_entity_1.SalesBook, tenant_entity_1.Tenant]),
            accounting_module_1.AccountingModule,
        ],
        providers: [sales_service_1.SalesService],
        controllers: [sales_controller_1.SalesController],
    })
], SalesModule);
//# sourceMappingURL=sales.module.js.map