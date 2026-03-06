import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as sanitizeHtmlModule from 'sanitize-html';
import { EmailService } from '../email/email.service';
import { SecurityLoggerService } from '../logger/security-logger.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

const sanitizeHtml = (sanitizeHtmlModule as any).default || sanitizeHtmlModule;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly securityLogger: SecurityLoggerService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}
  private get db() {
    return admin.firestore();
  }

  // Whitelist of fields allowed for user creation (OWASP A01: isVerified, verificationStatus removed — server-enforced)
  private readonly CREATE_ALLOWED_FIELDS = [
    'uid', 'email', 'firstName', 'lastName', 'middleInitial', 'dob', 'gender',
    'maritalStatus', 'mobile', 'phone', 'address', 'fullAddress', 'street', 'city', 'province',
    'customId', 'photoURL', 'displayName', 'description',
    'prcLicenseNo', 'prcIdFrontUrl', 'prcIdBackUrl',
    'governmentIdFrontUrl', 'governmentIdBackUrl',
    'termsAcceptedAt', 'spiConsentAt',
  ];

  // Safe fields to expose in public API responses (OWASP A02: strip PII)
  private readonly PUBLIC_SAFE_FIELDS = [
    'id', 'firstName', 'lastName', 'middleInitial', 'displayName', 'photoURL',
    'role', 'description', 'city', 'province', 'customId',
    'isVerified', 'verificationStatus', 'isDeactivated', 'createdAt',
  ];

  // Additional fields visible only to the user themselves or admins
  private readonly PRIVATE_FIELDS = [
    'email', 'dob', 'gender', 'maritalStatus', 'mobile', 'phone',
    'address', 'fullAddress', 'street', 'prcLicenseNo',
    'prcIdFrontUrl', 'prcIdBackUrl', 'prcOcrText',
    'governmentIdFrontUrl', 'governmentIdBackUrl', 'governmentIdOcrText',
    'termsAcceptedAt', 'spiConsentAt', 'updatedAt', 'verifiedAt', 'rejectionReason', 'deletedAt',
  ];

  /**
   * Strip sensitive fields from user data for public responses (OWASP A02)
   */
  private toPublicProfile(data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key of this.PUBLIC_SAFE_FIELDS) {
      if (data[key] !== undefined) result[key] = data[key];
    }
    return result;
  }

  /**
   * Full profile for owner/admin views (includes private fields)
   */
  private toFullProfile(data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    const allFields = [...this.PUBLIC_SAFE_FIELDS, ...this.PRIVATE_FIELDS];
    for (const key of allFields) {
      if (data[key] !== undefined) result[key] = data[key];
    }
    return result;
  }

  /**
   * Sanitize text input to prevent XSS (OWASP A03)
   */
  private sanitizeText(text: string): string {
    return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });
  }

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

  // CREATE — with server-enforced defaults (OWASP A01: prevents self-verification/role escalation)
  async createUser(userData: any) {
    try {
      const sanitized = this.pickFields(userData, this.CREATE_ALLOWED_FIELDS);

      // Sanitize text fields (OWASP A03)
      if (sanitized.firstName) sanitized.firstName = this.sanitizeText(sanitized.firstName);
      if (sanitized.lastName) sanitized.lastName = this.sanitizeText(sanitized.lastName);
      if (sanitized.description) sanitized.description = this.sanitizeText(sanitized.description);
      if (sanitized.displayName) sanitized.displayName = this.sanitizeText(sanitized.displayName);

      // Validate and enforce role — only allow Client, Seller, Agent (OWASP A01)
      const allowedRoles = ['Client', 'Seller', 'Agent'];
      const role = allowedRoles.includes(userData.role) ? userData.role : 'Client';

      await this.db.collection('users').doc(userData.uid).set({
        ...sanitized,
        role,                              // Server-enforced role
        isVerified: false,                  // Always false on creation — admin must verify
        verificationStatus: (role === 'Seller' || role === 'Agent') ? 'pending' : 'not_required',
        createdAt: new Date().toISOString(),
        isDeactivated: false,
      });
      return { message: 'User created successfully' };
    } catch (error) {
      this.logger.error('Error creating user:', error);
      throw error;
    }
  }

  // GET BY ID — returns public profile only (OWASP A02)
  async findOne(uid: string, requesterId?: string) {
    const doc = await this.db.collection('users').doc(uid).get();
    if (!doc.exists) throw new NotFoundException('User not found');
    const data = { id: doc.id, ...doc.data() } as Record<string, any>;

    // If the requester is the owner, return full profile
    if (requesterId && requesterId === uid) {
      return this.toFullProfile(data);
    }

    // Check if requester is admin for full access
    if (requesterId) {
      try {
        const requesterDoc = await this.db.collection('users').doc(requesterId).get();
        if (requesterDoc.exists && requesterDoc.data()?.role === 'Admin') {
          return this.toFullProfile(data);
        }
      } catch { /* fall through to public profile */ }
    }

    return this.toPublicProfile(data);
  }

  // GET CURRENT USER (self) — returns full profile
  async getMe(uid: string) {
    const doc = await this.db.collection('users').doc(uid).get();
    if (!doc.exists) throw new NotFoundException('User not found');
    return this.toFullProfile({ id: doc.id, ...doc.data() } as Record<string, any>);
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
      return snapshot.docs.map(doc => this.toPublicProfile({ id: doc.id, ...doc.data() } as Record<string, any>));
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
      results.push(this.toPublicProfile({ id: doc.id, ...data }));
    };

    nameSnapshot.docs.forEach(addResult);
    roleSnapshot.docs.forEach(addResult);

    return results.slice(0, safeLimit);
  }

  // GET PROFESSIONALS (Sellers) — with limit cap (OWASP A01)
  async getProfessionals(limit = 50) {
    const safeLimit = Math.min(limit, 100);
    const snapshot = await this.db.collection('users')
      .where('role', '==', 'Seller')
      .limit(safeLimit)
      .get();

    return snapshot.docs
      .map(doc => this.toPublicProfile({ id: doc.id, ...doc.data() } as Record<string, any>))
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

  // LIST ALL USERS (admin only) — admin sees full profiles, with limit cap
  async findAll(limit = 100) {
    const safeLimit = Math.min(limit, 500);
    const snapshot = await this.db.collection('users')
      .limit(safeLimit)
      .get();

    return snapshot.docs.map(doc => this.toFullProfile({ id: doc.id, ...doc.data() } as Record<string, any>));
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

    // DPA Compliance: Auto-delete ID images and OCR text after verification
    await this.purgeIdDocuments(ref, userData);

    // Log admin action server-side (OWASP A09)
    if (adminUid && adminEmail) {
      await this.securityLogger.logAdminAction({
        adminUid,
        adminEmail,
        action: 'VERIFICATION_APPROVED',
        targetUserId: uid,
        details: { role: userData?.role, idDocumentsPurged: true },
      });
    }

    // Send approval email
    const name = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'User';
    const email = userData?.email;
    const role = userData?.role || 'Seller';

    if (email) {
      await this.emailService.sendVerificationApprovalEmail(email, name, role);
    }

    return { message: 'User verified, ID documents purged, and approval email sent' };
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

    // DPA Compliance: Auto-delete ID images and OCR text on rejection too
    await this.purgeIdDocuments(ref, userData);

    // Log admin action server-side (OWASP A09)
    if (adminUid && adminEmail) {
      await this.securityLogger.logAdminAction({
        adminUid,
        adminEmail,
        action: 'VERIFICATION_REJECTED',
        targetUserId: uid,
        details: { role: userData?.role, reason, idDocumentsPurged: true },
      });
    }

    // Send rejection email
    const name = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'User';
    const email = userData?.email;
    const role = userData?.role || 'Seller';

    if (email) {
      await this.emailService.sendVerificationRejectionEmail(email, name, role, reason);
    }

    return { message: 'Verification rejected, ID documents purged, and notification email sent' };
  }

  /**
   * DPA Compliance: Permanently delete ID images from Cloudinary and clear
   * sensitive fields from Firestore after verification is complete.
   * Retains only: isVerified, verificationStatus, verifiedAt, prcLicenseNo (number only).
   */
  private async purgeIdDocuments(
    ref: FirebaseFirestore.DocumentReference,
    userData: FirebaseFirestore.DocumentData | undefined,
  ): Promise<void> {
    if (!userData) return;

    const idUrls: string[] = [
      userData.prcIdFrontUrl,
      userData.prcIdBackUrl,
      userData.governmentIdFrontUrl,
      userData.governmentIdBackUrl,
    ].filter((url): url is string => !!url);

    // Delete images from Cloudinary (authenticated type)
    if (idUrls.length > 0) {
      const deletePromises = idUrls
        .map((url) => this.cloudinaryService.extractPublicId(url))
        .filter((id): id is string => id !== null)
        .map((publicId) =>
          this.cloudinaryService.deleteAuthenticatedImage(publicId).catch((err) => {
            this.logger.warn(`Failed to delete ID image ${publicId}: ${err.message}`);
          }),
        );
      await Promise.all(deletePromises);
    }

    // Clear sensitive fields from Firestore
    const deleteField = admin.firestore.FieldValue.delete();
    await ref.update({
      prcIdFrontUrl: deleteField,
      prcIdBackUrl: deleteField,
      governmentIdFrontUrl: deleteField,
      governmentIdBackUrl: deleteField,
      prcOcrText: deleteField,
      governmentIdOcrText: deleteField,
    });

    this.logger.log(`Purged ${idUrls.length} ID document(s) for user ${ref.id}`);
  }
}