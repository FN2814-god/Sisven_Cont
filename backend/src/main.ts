import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedService } from './database/seed.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  await app.get(SeedService).run();

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
  console.log(`Sisven Cont API ejecutándose en http://localhost:${port}/api/v1`);
}

bootstrap();
