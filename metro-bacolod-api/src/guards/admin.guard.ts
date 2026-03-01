import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import * as admin from 'firebase-admin';

/**
 * Admin Guard
 * 
 * Must be used AFTER FirebaseAuthGuard (requires request.user to be set).
 * Checks if the authenticated user has role "Admin" in the "users" collection.
 * 
 * Usage: @UseGuards(FirebaseAuthGuard, AdminGuard)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private cachedAdminEmails: string[] | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private async getAdminEmails(): Promise<string[]> {
    const now = Date.now();
    if (this.cachedAdminEmails && now - this.cacheTimestamp < this.CACHE_TTL) {
      return this.cachedAdminEmails;
    }

    const db = admin.firestore();
    const usersSnap = await db.collection('users').where('role', '==', 'Admin').get();

    this.cachedAdminEmails = usersSnap.docs
      .map(doc => (doc.data().email as string || '').toLowerCase())
      .filter(Boolean);
    this.cacheTimestamp = now;
    return this.cachedAdminEmails;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.email) {
      throw new ForbiddenException('Authentication required.');
    }

    try {
      const adminEmails = await this.getAdminEmails();

      if (!adminEmails.includes(user.email.toLowerCase())) {
        throw new ForbiddenException('Admin access required.');
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new ForbiddenException('Failed to verify admin status.');
    }

    return true;
  }
}
