import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Global() // This makes Firebase available everywhere without importing it again
@Module({
  providers: [
    {
      provide: 'FIREBASE_CONNECTION',
      useFactory: () => {
        // 1. Check if the app is already connected (prevents "App already exists" errors)
        if (admin.apps.length > 0) {
          return admin.app();
        }

        // 2. Get the key from Render
        const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

        // 3. Safety Check: If key is missing, throw a CLEAR error
        if (!serviceAccountString) {
          throw new Error('FATAL: FIREBASE_SERVICE_ACCOUNT is missing in .env or Render Environment Variables.');
        }

        // 4. Connect
        const serviceAccount = JSON.parse(serviceAccountString);
        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      },
    },
  ],
  exports: ['FIREBASE_CONNECTION'],
})
export class FirebaseModule {}