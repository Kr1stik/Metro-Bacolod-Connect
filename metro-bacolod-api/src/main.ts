import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as admin from 'firebase-admin'; // Import Firebase Admin
import { firebaseConfig } from './config/firebase-admin.config'; // Import your config

// NEW CODE in src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: [
      'http://localhost:5173',                       // Your local frontend
      'https://metro-bacolod-connect-iqqf.vercel.app' // YOUR VERCEL DOMAIN
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();