"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const seed_service_1 = require("./database/seed.service");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api/v1');
    app.enableCors();
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    await app.get(seed_service_1.SeedService).run();
    const port = parseInt(process.env.PORT || '3000', 10);
    await app.listen(port);
    console.log(`Sisven Cont API ejecutándose en http://localhost:${port}/api/v1`);
}
bootstrap();
//# sourceMappingURL=main.js.map