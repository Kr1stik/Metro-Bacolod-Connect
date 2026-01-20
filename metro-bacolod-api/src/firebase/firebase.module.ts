import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_CONNECTION',
      useFactory: () => {
        // 1. If already connected, reuse it
        if (admin.apps.length > 0) {
          return admin.app();
        }

        const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

        if (!serviceAccountString) {
          throw new Error('FATAL: FIREBASE_SERVICE_ACCOUNT is missing.');
        }

        // 2. Parse the JSON
        const serviceAccount = JSON.parse(serviceAccountString);

        // --- THE FIX IS HERE ---
        // Render sometimes turns "\n" into literal "\\n". We must fix it.
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        // -----------------------

        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      },
    },
  ],
  exports: ['FIREBASE_CONNECTION'],
})
export class FirebaseModule {}