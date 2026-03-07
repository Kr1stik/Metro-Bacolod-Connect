import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { firebaseConfig } from './config/firebase-admin.config';
import { GlobalExceptionFilter } from './filters/http-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'], // Structured logging levels
  });

  // Security headers with explicit CSP (OWASP A05)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://ui-avatars.com', 'https://lh3.googleusercontent.com'],
          connectSrc: ["'self'", 'https://firestore.googleapis.com', 'https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Required for Cloudinary images
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  // Global exception filter — hides internal errors from clients (OWASP A05)
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,              // Strip properties not in DTO
    forbidNonWhitelisted: true,   // Error on extra fields
    transform: true,              // Auto-transform types
  }));

  // 1. Initialize Firebase Admin
  try {
    firebaseConfig.getServiceAccount();
    console.log('Firebase Admin Initialized Successfully');
  } catch (error: any) {
    console.error('Firebase Init Error:', error.message);
  }

  // 2. Enable CORS — environment-aware origins
  const allowedOrigins = [
    'https://metrobacolod.cosedevs.com',
    'https://metrobcd.cosedevs.com',
    process.env.FRONTEND_URL || 'https://metro-bacolod-connect.vercel.app',
  ].filter(Boolean);

  // Only allow localhost in development (or anytime for easier testing)
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:5173', 'http://localhost:3000');
  } else {
    // Safety net: explicitly add localhost just in case NODE_ENV isn't set perfectly on Render
    allowedOrigins.push('http://localhost:5173');
  }

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 3. Fix Port Binding for Render
  const PORT = process.env.PORT || 3000;
  await app.listen(PORT);
  console.log(`Backend is running on port: ${PORT}`);
}
bootstrap();