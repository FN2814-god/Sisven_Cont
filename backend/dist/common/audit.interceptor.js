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
exports.AuditInterceptor = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const rxjs_1 = require("rxjs");
const audit_entity_1 = require("../entities/audit.entity");
let AuditInterceptor = class AuditInterceptor {
    audit;
    constructor(audit) {
        this.audit = audit;
    }
    intercept(ctx, next) {
        const req = ctx.switchToHttp().getRequest();
        const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
        if (!mutating || !req.user)
            return next.handle();
        return next.handle().pipe((0, rxjs_1.tap)(() => {
            this.audit.save({
                user_id: req.user.sub,
                tenant_id: req.tenantId ?? null,
                action: `${req.method} ${req.originalUrl}`,
                detail: JSON.stringify(req.body ?? {}).substring(0, 4000),
            }).catch(() => undefined);
        }));
    }
};
exports.AuditInterceptor = AuditInterceptor;
exports.AuditInterceptor = AuditInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(audit_entity_1.AuditLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AuditInterceptor);
//# sourceMappingURL=audit.interceptor.js.map