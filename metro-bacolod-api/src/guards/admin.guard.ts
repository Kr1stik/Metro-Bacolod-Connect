import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import * as admin from 'firebase-admin';

/**
 * Admin Guard (OWASP A07)
 * 
 * Must be used AFTER FirebaseAuthGuard (requires request.user to be set).
 * Checks if the authenticated user has role "Admin" by UID lookup (not email).
 * 
 * Usage: @UseGuards(FirebaseAuthGuard, AdminGuard)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  // Cache admin UIDs instead of emails for reliable lookup (OWASP A07)
  private cachedAdminUids: Set<string> | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 3 * 60 * 1000; // 3 minutes (reduced from 5)

  private async getAdminUids(): Promise<Set<string>> {
    const now = Date.now();
    if (this.cachedAdminUids && now - this.cacheTimestamp < this.CACHE_TTL) {
      return this.cachedAdminUids;
    }

    const db = admin.firestore();
    const usersSnap = await db.collection('users').where('role', '==', 'Admin').get();

    this.cachedAdminUids = new Set(
      usersSnap.docs.map(doc => doc.id).filter(Boolean)
    );
    this.cacheTimestamp = now;
    return this.cachedAdminUids;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.uid) {
      throw new ForbiddenException('Authentication required.');
    }

    try {
      const adminUids = await this.getAdminUids();

      if (!adminUids.has(user.uid)) {
        throw new ForbiddenException('Admin access required.');
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new ForbiddenException('Failed to verify admin status.');
    }

    return true;
  }
}
