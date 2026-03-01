import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { firebaseConfig } from './config/firebase-admin.config';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,              // Strip properties not in DTO
    forbidNonWhitelisted: true,   // Error on extra fields
    transform: true,              // Auto-transform types
  }));

  // 1. Initialize Firebase Admin
  try {
    firebaseConfig.getServiceAccount();
    console.log('✅ Firebase Admin Initialized Successfully');
  } catch (error: any) {
    console.error('❌ Firebase Init Error:', error.message);
  }

  // 2. Enable CORS — environment-aware origins
  const allowedOrigins = [
    'https://metrobcd.cosedevs.com',
    process.env.FRONTEND_URL || 'https://metro-bacolod-connect.vercel.app',
  ].filter(Boolean);

  // Only allow localhost in development
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:5173', 'http://localhost:3000');
  }

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 3. Fix Port Binding for Render
  const PORT = process.env.PORT || 3000;
  await app.listen(PORT);
  console.log(`🚀 Backend is running on port: ${PORT}`);
}
bootstrap();