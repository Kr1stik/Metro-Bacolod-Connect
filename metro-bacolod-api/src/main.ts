import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as admin from 'firebase-admin'; // Import Firebase Admin
import { firebaseConfig } from './config/firebase-admin.config'; // Import your config

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Initialize Firebase Admin
  // We wrap this in a try-catch to catch errors early
  try {
    const serviceAccount = firebaseConfig.getServiceAccount();
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin Initialized Successfully');
  } catch (error) {
    console.error('❌ Firebase Init Error:', error.message);
  }

  // 2. Enable CORS (from previous step)
  app.enableCors({
    origin: 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(3000);
  console.log('Backend is running on: http://localhost:3000');
}
bootstrap();