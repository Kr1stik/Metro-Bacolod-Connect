import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin'; // Just import admin

@Injectable()
export class UsersService {
  async createUser(userData: any) {
    try {
      // DIRECTLY use admin.firestore()
      // We don't need to call initializeApp() here because FirebaseModule did it already!
      const db = admin.firestore();
      
      await db.collection('users').doc(userData.uid).set(userData);
      return { message: 'User created successfully' };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error; // This helps you see the error in Render logs
    }
  }
}