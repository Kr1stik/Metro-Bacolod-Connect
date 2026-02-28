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
  try {
    const serviceAccount = firebaseConfig.getServiceAccount();
    console.log('✅ Firebase Admin Initialized Successfully');
  } catch (error: any) {
    console.error('❌ Firebase Init Error:', error.message);
  }

  // 2. Enable CORS — explicitly adding your actual production domain!
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://metrobcd.cosedevs.com', // Added your live frontend domain!
      process.env.FRONTEND_URL || 'https://metro-bacolod-connect.vercel.app',
    ].filter(Boolean),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 3. Fix Port Binding for Render
  const PORT = process.env.PORT || 3000;
  await app.listen(PORT);
  console.log(`🚀 Backend is running on port: ${PORT}`);
}
bootstrap();