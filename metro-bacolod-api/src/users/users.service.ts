import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { EmailService } from '../email/email.service';
import { SecurityLoggerService } from '../logger/security-logger.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly securityLogger: SecurityLoggerService,
  ) {}
  private get db() {
    return admin.firestore();
  }

  // Whitelist of fields allowed for user creation
  private readonly CREATE_ALLOWED_FIELDS = [
    'uid', 'email', 'firstName', 'lastName', 'middleInitial', 'dob', 'gender',
    'maritalStatus', 'mobile', 'phone', 'address', 'fullAddress', 'street', 'city', 'province', 'role',
    'customId', 'photoURL', 'displayName', 'description',
    'prcLicenseNo', 'prcIdFrontUrl', 'prcIdBackUrl', 'prcOcrText',
    'governmentIdFrontUrl', 'governmentIdBackUrl', 'governmentIdOcrText',
    'isVerified', 'verificationStatus', 'termsAcceptedAt',
  ];

  // Whitelist of fields allowed for profile updates
  private readonly UPDATE_ALLOWED_FIELDS = [
    'firstName', 'lastName', 'middleInitial', 'dob', 'gender', 'maritalStatus',
    'mobile', 'phone', 'address', 'fullAddress', 'street', 'city', 'province', 'photoURL', 'description',
    'prcLicenseNo',
  ];

  private pickFields(data: any, allowedFields: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        result[key] = data[key];
      }
    }
    return result;
  }

  // CREATE
  async createUser(userData: any) {
    try {
      const sanitized = this.pickFields(userData, this.CREATE_ALLOWED_FIELDS);
      await this.db.collection('users').doc(userData.uid).set({
        ...sanitized,
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

    const sanitized = this.pickFields(updateData, this.UPDATE_ALLOWED_FIELDS);
    await ref.update({ ...sanitized, updatedAt: new Date().toISOString() });
    return { message: 'Profile updated successfully' };
  }

  // SEARCH USERS (OWASP A04: optimized to use Firestore queries and limit results)
  async searchUsers(queryStr: string, limit = 20) {
    // Cap limit to prevent data harvesting
    const safeLimit = Math.min(limit, 50);
    const q = queryStr.toLowerCase().trim();

    if (!q) {
      // If no query, return limited active users
      const snapshot = await this.db.collection('users')
        .where('isDeactivated', '==', false)
        .limit(safeLimit)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Use a Firestore range query on firstName for prefix matching
    // Also query by role as a secondary search
    const [nameSnapshot, roleSnapshot] = await Promise.all([
      this.db.collection('users')
        .where('firstName', '>=', q.charAt(0).toUpperCase() + q.slice(1))
        .where('firstName', '<=', q.charAt(0).toUpperCase() + q.slice(1) + '\uf8ff')
        .limit(safeLimit * 2)
        .get(),
      this.db.collection('users')
        .where('role', '==', q.charAt(0).toUpperCase() + q.slice(1))
        .limit(safeLimit)
        .get(),
    ]);

    const seenIds = new Set<string>();
    const results: any[] = [];

    const addResult = (doc: any) => {
      if (seenIds.has(doc.id)) return;
      const data = doc.data();
      if (data.isDeactivated) return;
      seenIds.add(doc.id);
      results.push({ id: doc.id, ...data });
    };

    nameSnapshot.docs.forEach(addResult);
    roleSnapshot.docs.forEach(addResult);

    return results.slice(0, safeLimit);
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

  // DEACTIVATE / REACTIVATE (admin only) — with activity logging (OWASP A09)
  async setDeactivated(uid: string, isDeactivated: boolean, adminUid?: string, adminEmail?: string) {
    const ref = this.db.collection('users').doc(uid);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('User not found');

    await ref.update({ isDeactivated, updatedAt: new Date().toISOString() });

    // Log admin action server-side
    if (adminUid && adminEmail) {
      await this.securityLogger.logAdminAction({
        adminUid,
        adminEmail,
        action: isDeactivated ? 'USER_DEACTIVATED' : 'USER_REACTIVATED',
        targetUserId: uid,
      });
    }

    // Revoke refresh tokens if deactivating (OWASP A07)
    if (isDeactivated) {
      try {
        await admin.auth().revokeRefreshTokens(uid);
        this.logger.log(`Revoked tokens for deactivated user: ${uid}`);
      } catch (err) {
        this.logger.warn(`Failed to revoke tokens for user ${uid}: ${err}`);
      }
    }

    return { message: isDeactivated ? 'User deactivated' : 'User reactivated' };
  }

  // CHANGE ROLE (admin only) — with session invalidation (OWASP A07)
  async changeRole(uid: string, role: string, adminUid?: string, adminEmail?: string) {
    const ref = this.db.collection('users').doc(uid);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('User not found');

    const previousRole = doc.data()?.role;
    await ref.update({ role, updatedAt: new Date().toISOString() });

    // Revoke existing tokens to force re-authentication with new role (OWASP A07)
    try {
      await admin.auth().revokeRefreshTokens(uid);
      this.logger.log(`Revoked tokens for role change: ${uid} (${previousRole} → ${role})`);
    } catch (err) {
      this.logger.warn(`Failed to revoke tokens for user ${uid}: ${err}`);
    }

    // Log admin action server-side
    if (adminUid && adminEmail) {
      await this.securityLogger.logAdminAction({
        adminUid,
        adminEmail,
        action: 'ROLE_CHANGED',
        targetUserId: uid,
        details: { previousRole, newRole: role },
      });
    }

    return { message: `Role changed to ${role}` };
  }

  // LIST ALL USERS (admin only)
  async findAll(limit = 100) {
    const snapshot = await this.db.collection('users')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // DELETE USER (admin only - soft delete) — with activity logging
  async deleteUser(uid: string, adminUid?: string, adminEmail?: string) {
    const ref = this.db.collection('users').doc(uid);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('User not found');

    await ref.update({ isDeactivated: true, deletedAt: new Date().toISOString() });

    // Log admin action server-side
    if (adminUid && adminEmail) {
      await this.securityLogger.logAdminAction({
        adminUid,
        adminEmail,
        action: 'USER_DELETED',
        targetUserId: uid,
      });
    }

    return { message: 'User deleted (deactivated)' };
  }

  // VERIFY USER (admin only) — approve and send email, with logging
  async approveVerification(uid: string, adminUid?: string, adminEmail?: string) {
    const ref = this.db.collection('users').doc(uid);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('User not found');

    const userData = doc.data();
    await ref.update({
      isVerified: true,
      verificationStatus: 'approved',
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Log admin action server-side (OWASP A09)
    if (adminUid && adminEmail) {
      await this.securityLogger.logAdminAction({
        adminUid,
        adminEmail,
        action: 'VERIFICATION_APPROVED',
        targetUserId: uid,
        details: { role: userData?.role },
      });
    }

    // Send approval email
    const name = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'User';
    const email = userData?.email;
    const role = userData?.role || 'Seller';

    if (email) {
      await this.emailService.sendVerificationApprovalEmail(email, name, role);
    }

    return { message: 'User verified and approval email sent' };
  }

  // REJECT VERIFICATION (admin only) — reject and send email, with logging
  async rejectVerification(uid: string, reason?: string, adminUid?: string, adminEmail?: string) {
    const ref = this.db.collection('users').doc(uid);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('User not found');

    const userData = doc.data();
    await ref.update({
      verificationStatus: 'rejected',
      rejectionReason: reason || '',
      updatedAt: new Date().toISOString(),
    });

    // Log admin action server-side (OWASP A09)
    if (adminUid && adminEmail) {
      await this.securityLogger.logAdminAction({
        adminUid,
        adminEmail,
        action: 'VERIFICATION_REJECTED',
        targetUserId: uid,
        details: { role: userData?.role, reason },
      });
    }

    // Send rejection email
    const name = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'User';
    const email = userData?.email;
    const role = userData?.role || 'Seller';

    if (email) {
      await this.emailService.sendVerificationRejectionEmail(email, name, role, reason);
    }

    return { message: 'Verification rejected and notification email sent' };
  }
}