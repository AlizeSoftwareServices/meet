import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/public/',
  });

  const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'capacitor://localhost', 'https://localhost', 'http://localhost'];
    
  if (!corsOrigins.includes('capacitor://localhost')) {
     corsOrigins.push('capacitor://localhost', 'https://localhost', 'http://localhost');
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
