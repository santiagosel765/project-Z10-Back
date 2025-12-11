import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envs } from './config/envs';
import { ValidationPipe } from '@nestjs/common';
import {
  GlobalExceptionFilter,
  TypeOrmExceptionFilter,
  ValidationExceptionFilter,
} from './common/filters';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const globalPrefix = envs.apiPrefix?.replace(/^\/+/, '') || 'api/v1';
  app.setGlobalPrefix(globalPrefix);

  app.enableCors({
    origin: envs.corsOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Zenit Backend API')
    .setDescription(
      'API de mapas, capas, auth de usuario, auth SDK y manejo de tokens SDK para la plataforma Zenit.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        description: 'Token de acceso para endpoints protegidos.',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    ignoreGlobalPrefix: false,
  });

  const docsPath = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsPath)) {
    fs.mkdirSync(docsPath, { recursive: true });
  }

  fs.writeFileSync(
    path.join(docsPath, 'zenit-backend-openapi.json'),
    JSON.stringify(document, null, 2),
  );

  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Zenit Backend API Docs',
  });

  app.useGlobalFilters(
    new ValidationExceptionFilter(),
    new TypeOrmExceptionFilter(),
    new GlobalExceptionFilter(),
  );

  app.useGlobalInterceptors(new TransformInterceptor());

  await app.listen(envs.port);
}
bootstrap();
