import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { firebaseConfig } from './config/firebase-admin.config'; // Import your config

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,         // Strip properties not in DTO
    forbidNonWhitelisted: false, // Don't error on extra fields (some FormData may include extras)
    transform: true,         // Auto-transform types
  }));

  // 1. Initialize Firebase Admin
  // We wrap this in a try-catch to catch errors early
  try {
    const serviceAccount = firebaseConfig.getServiceAccount();
  
    console.log('✅ Firebase Admin Initialized Successfully');
  } catch (error) {
    console.error('❌ Firebase Init Error:', error.message);
  }

  // 2. Enable CORS — restricted to known domains
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL || 'https://metro-bacolod-connect.vercel.app',
    ].filter(Boolean),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(3000);
  console.log('Backend is running on: http://localhost:3000');
}
bootstrap();