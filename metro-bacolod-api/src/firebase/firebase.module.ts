import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_CONNECTION',
      useFactory: () => {
        // --- THE FIX: CHECK IF APP EXISTS ---
        // If Firebase is already running, just return the running instance.
        // This prevents "App named [DEFAULT] already exists" errors.
        if (admin.apps.length > 0) {
          return admin.app();
        }

        // --- OTHERWISE, START IT UP ---
        const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

        if (!serviceAccountString) {
          throw new Error('FATAL: FIREBASE_SERVICE_ACCOUNT is missing.');
        }

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