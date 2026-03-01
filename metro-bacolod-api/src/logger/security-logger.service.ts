import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

/**
 * Security Logger Service (OWASP A09)
 * 
 * Provides structured server-side security event logging.
 * Logs are stored both to console (structured) and to Firestore activityLogs collection.
 */
@Injectable()
export class SecurityLoggerService {
  private readonly logger = new Logger('SecurityLogger');

  private get db() {
    return admin.firestore();
  }

  /**
   * Log an admin action (verification, role change, user management)
   */
  async logAdminAction(params: {
    adminUid: string;
    adminEmail: string;
    action: string;
    targetUserId?: string;
    details?: Record<string, any>;
  }): Promise<void> {
    const logEntry = {
      type: 'ADMIN_ACTION',
      adminUid: params.adminUid,
      adminEmail: params.adminEmail,
      action: params.action,
      targetUserId: params.targetUserId || null,
      details: params.details || {},
      timestamp: new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    this.logger.log(
      `[ADMIN] ${params.adminEmail} → ${params.action}${params.targetUserId ? ` | Target: ${params.targetUserId}` : ''}`,
    );

    try {
      await this.db.collection('activityLogs').add(logEntry);
    } catch (err) {
      this.logger.error('Failed to persist activity log:', err);
    }
  }

  /**
   * Log authentication events (login failures, token issues)
   */
  logAuthEvent(params: {
    event: 'AUTH_FAILURE' | 'TOKEN_EXPIRED' | 'TOKEN_INVALID' | 'ACCOUNT_DISABLED';
    ip?: string;
    userAgent?: string;
    userId?: string;
    details?: string;
  }): void {
    this.logger.warn(
      `[AUTH] ${params.event} | IP: ${params.ip || 'unknown'} | UA: ${params.userAgent || 'unknown'}${params.userId ? ` | UID: ${params.userId}` : ''} | ${params.details || ''}`,
    );
  }

  /**
   * Log access control violations
   */
  logAccessViolation(params: {
    userId: string;
    resource: string;
    action: string;
    ip?: string;
  }): void {
    this.logger.warn(
      `[ACCESS_VIOLATION] User: ${params.userId} attempted ${params.action} on ${params.resource} | IP: ${params.ip || 'unknown'}`,
    );
  }

  /**
   * Log rate limit hits
   */
  logRateLimitHit(params: {
    ip: string;
    path: string;
    userId?: string;
  }): void {
    this.logger.warn(
      `[RATE_LIMIT] IP: ${params.ip} | Path: ${params.path}${params.userId ? ` | UID: ${params.userId}` : ''}`,
    );
  }

  /**
   * Log data access events for sensitive resources
   */
  logDataAccess(params: {
    userId: string;
    resource: string;
    action: 'READ' | 'WRITE' | 'DELETE';
    targetId?: string;
  }): void {
    this.logger.log(
      `[DATA_ACCESS] User: ${params.userId} → ${params.action} ${params.resource}${params.targetId ? `/${params.targetId}` : ''}`,
    );
  }
}
