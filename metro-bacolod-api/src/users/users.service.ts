import { Injectable, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class UsersService {
  private get db() {
    return admin.firestore();
  }

  // CREATE
  async createUser(userData: any) {
    try {
      await this.db.collection('users').doc(userData.uid).set({
        ...userData,
        createdAt: new Date().toISOString(),
        isDeactivated: false,
      });
      return { message: 'User created successfully' };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // GET BY ID
  async findOne(uid: string) {
    const doc = await this.db.collection('users').doc(uid).get();
    if (!doc.exists) throw new NotFoundException('User not found');
    return { id: doc.id, ...doc.data() };
  }

  // GET CURRENT USER (self)
  async getMe(uid: string) {
    return this.findOne(uid);
  }

  // UPDATE PROFILE (self)
  async updateProfile(uid: string, updateData: any) {
    const ref = this.db.collection('users').doc(uid);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('User not found');

    await ref.update({ ...updateData, updatedAt: new Date().toISOString() });
    return { message: 'Profile updated successfully' };
  }

  // SEARCH USERS
  async searchUsers(queryStr: string, limit = 20) {
    const snapshot = await this.db.collection('users')
      .limit(limit * 5)
      .get();

    const q = queryStr.toLowerCase();
    const results = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((u: any) => {
        if (u.isDeactivated) return false;
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        return fullName.includes(q) || (u.role || '').toLowerCase().includes(q);
      })
      .slice(0, limit);

    return results;
  }

  // GET PROFESSIONALS (Sellers)
  async getProfessionals(limit = 50) {
    const snapshot = await this.db.collection('users')
      .where('role', '==', 'Seller')
      .limit(limit)
      .get();

    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((u: any) => !u.isDeactivated);
  }

  // DEACTIVATE / REACTIVATE (admin only)
  async setDeactivated(uid: string, isDeactivated: boolean) {
    const ref = this.db.collection('users').doc(uid);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('User not found');

    await ref.update({ isDeactivated, updatedAt: new Date().toISOString() });
    return { message: isDeactivated ? 'User deactivated' : 'User reactivated' };
  }

  // CHANGE ROLE (admin only)
  async changeRole(uid: string, role: string) {
    const ref = this.db.collection('users').doc(uid);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('User not found');

    await ref.update({ role, updatedAt: new Date().toISOString() });
    return { message: `Role changed to ${role}` };
  }

  // LIST ALL USERS (admin only)
  async findAll(limit = 100) {
    const snapshot = await this.db.collection('users')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // DELETE USER (admin only - soft delete)
  async deleteUser(uid: string) {
    const ref = this.db.collection('users').doc(uid);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('User not found');

    await ref.update({ isDeactivated: true, deletedAt: new Date().toISOString() });
    return { message: 'User deleted (deactivated)' };
  }
}