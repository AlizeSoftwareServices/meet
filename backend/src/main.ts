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

  const allowedOrigins = [
    'https://meet.alizesoftwareservices.com',
    'capacitor://localhost',
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
  ];

  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile APK native webview requests, cron jobs, server-to-server)
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.alizesoftwareservices.com')
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
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
