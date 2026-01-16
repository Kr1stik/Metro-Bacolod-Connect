import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class UsersService {
  async createUserProfile(userData: any) {
    const db = admin.firestore();
    
    try {
      // We use the User's UID as the document name. 
      // This makes it easy to find them later (e.g. db.collection('users').doc(uid))
      await db.collection('user_info').doc(userData.uid).set({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        address: userData.address,
        role: 'user', // Default role
        createdAt: new Date().toISOString()
      });
      
      return { message: 'User data saved successfully' };
    } catch (error) {
      throw new Error('Error saving to Firestore: ' + error.message);
    }
  }
}