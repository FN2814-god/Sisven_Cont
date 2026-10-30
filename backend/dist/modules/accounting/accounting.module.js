"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const accounting_entity_1 = require("../../entities/accounting.entity");
const journal_service_1 = require("./journal.service");
const journal_controller_1 = require("./journal.controller");
const chart_controller_1 = require("./chart.controller");
const chart_service_1 = require("./chart.service");
const periods_controller_1 = require("./periods.controller");
const periods_service_1 = require("./periods.service");
const reports_controller_1 = require("./reports.controller");
const reports_service_1 = require("./reports.service");
let AccountingModule = class AccountingModule {
};
exports.AccountingModule = AccountingModule;
exports.AccountingModule = AccountingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([accounting_entity_1.ChartOfAccount, accounting_entity_1.FiscalPeriod, accounting_entity_1.JournalEntry, accounting_entity_1.JournalEntryLine]),
        ],
        providers: [journal_service_1.JournalService, chart_service_1.ChartService, periods_service_1.PeriodsService, reports_service_1.ReportsService],
        controllers: [journal_controller_1.JournalController, chart_controller_1.ChartController, periods_controller_1.PeriodsController, reports_controller_1.ReportsController],
        exports: [journal_service_1.JournalService, periods_service_1.PeriodsService],
    })
], AccountingModule);
//# sourceMappingURL=accounting.module.js.map