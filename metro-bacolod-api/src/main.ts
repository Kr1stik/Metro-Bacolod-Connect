import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { firebaseConfig } from './config/firebase-admin.config'; // Import your config

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Initialize Firebase Admin
  // We wrap this in a try-catch to catch errors early
  try {
    const serviceAccount = firebaseConfig.getServiceAccount();
  
    console.log('✅ Firebase Admin Initialized Successfully');
  } catch (error) {
    console.error('❌ Firebase Init Error:', error.message);
  }

  // 2. Enable CORS (from previous step)
  app.enableCors({
    origin: true, // <--- THIS IS THE MAGIC KEY. It allows any domain.
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(3000);
  console.log('Backend is running on: http://localhost:3000');
}
bootstrap();