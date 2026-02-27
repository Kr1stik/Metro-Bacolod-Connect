import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

/**
 * Firebase Authentication Guard
 * 
 * Verifies the Firebase ID token from the Authorization header.
 * Attaches the decoded token to `request.user` for downstream use.
 * 
 * Usage: @UseGuards(FirebaseAuthGuard) on controllers or routes
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
      
      // Check if the user's account is disabled in Firebase Auth
      if (decodedToken.disabled) {
        throw new UnauthorizedException('Account is disabled.');
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
