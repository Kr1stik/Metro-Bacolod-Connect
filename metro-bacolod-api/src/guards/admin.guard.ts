import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

const ADMIN_EMAIL = 'kin3.mahinay@gmail.com';

/**
 * Admin Guard
 * 
 * Must be used AFTER FirebaseAuthGuard (requires request.user to be set).
 * Checks if the authenticated user is the platform admin.
 * 
 * Usage: @UseGuards(FirebaseAuthGuard, AdminGuard)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.email) {
      throw new ForbiddenException('Authentication required.');
    }

    if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      throw new ForbiddenException('Admin access required.');
    }

    return true;
  }
}
