import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';

export const firebaseConfig = {
  getServiceAccount: (): ServiceAccount => {
    // This handles the newline characters correctly for both Mac/Linux and Windows
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('MISSING FIREBASE CONFIGURATION: Check your .env file');
    }

    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    };
  },
};