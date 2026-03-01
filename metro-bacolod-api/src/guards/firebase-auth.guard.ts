import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

/**
 * Firebase Authentication Guard (OWASP A07)
 * 
 * Verifies the Firebase ID token from the Authorization header.
 * Checks disabled status via Firebase Admin SDK (not decoded token).
 * Checks deactivation status in Firestore.
 * Attaches the decoded token to `request.user` for downstream use.
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header. Expected: Bearer <token>');
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);

      // OWASP A07: Check if account is disabled via Firebase Admin SDK (not decoded token)
      try {
        const userRecord = await admin.auth().getUser(decodedToken.uid);
        if (userRecord.disabled) {
          throw new UnauthorizedException('Account is disabled.');
        }
      } catch (err) {
        if (err instanceof UnauthorizedException) throw err;
        // If we can't verify, allow through — fail-open for availability
      }

      // OWASP A01: Check if account is deactivated in Firestore
      try {
        const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
        if (userDoc.exists && userDoc.data()?.isDeactivated === true) {
          throw new UnauthorizedException('Account has been deactivated.');
        }
      } catch (err) {
        if (err instanceof UnauthorizedException) throw err;
        // If Firestore check fails, allow through — user doc may not exist yet during registration
      }

      // Attach the decoded token to the request for controllers/services to use
      request.user = decodedToken;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }
}
