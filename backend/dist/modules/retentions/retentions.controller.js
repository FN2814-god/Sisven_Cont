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
exports.RetentionsController = void 0;
const common_1 = require("@nestjs/common");
const decorators_1 = require("../../common/decorators");
const retentions_service_1 = require("./retentions.service");
function requireTenant(t) {
    if (!t)
        throw new common_1.BadRequestException('Seleccione una empresa (X-Tenant-Id)');
    return t;
}
let RetentionsController = class RetentionsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    listIva(t, periodo) {
        return this.svc.listIva(requireTenant(t), periodo);
    }
    listIslr(t, periodo) {
        return this.svc.listIslr(requireTenant(t), periodo);
    }
    async txt(t, periodo, res) {
        const file = await this.svc.generateVatTxt(requireTenant(t), periodo);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
        res.send(file.content);
    }
    async xml(t, periodo, res) {
        const file = await this.svc.generateIslrXml(requireTenant(t), periodo);
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
        res.send(file.content);
    }
};
exports.RetentionsController = RetentionsController;
__decorate([
    (0, common_1.Get)('iva'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Query)('periodo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RetentionsController.prototype, "listIva", null);
__decorate([
    (0, common_1.Get)('islr'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Query)('periodo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RetentionsController.prototype, "listIslr", null);
__decorate([
    (0, common_1.Get)('iva/txt'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Query)('periodo')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RetentionsController.prototype, "txt", null);
__decorate([
    (0, common_1.Get)('islr/xml'),
    __param(0, (0, decorators_1.TenantId)()),
    __param(1, (0, common_1.Query)('periodo')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RetentionsController.prototype, "xml", null);
exports.RetentionsController = RetentionsController = __decorate([
    (0, common_1.Controller)('retentions'),
    __metadata("design:paramtypes", [retentions_service_1.RetentionsService])
], RetentionsController);
//# sourceMappingURL=retentions.controller.js.map