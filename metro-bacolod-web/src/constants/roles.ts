// ============================================
// RBAC Constants & Helpers
// ============================================

// Admin email — has both Agent + Client privileges
export const ADMIN_EMAIL = "kin3.mahinay@gmail.com";

// Role types
export type UserRole = "Seller" | "Client" | "Admin";

/**
 * Check if the user is the platform admin.
 */
export function isAdmin(email?: string | null): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Check if the user can create/edit/delete listings.
 * Only Agents and Admins can do this.
 */
export function canCreateListings(role?: string | null, email?: string | null): boolean {
  return role === "Seller" || isAdmin(email);
}

/**
 * Check if the user can access the Trash/Archive page.
 * Only Agents and Admins can do this.
 */
export function canAccessTrash(role?: string | null, email?: string | null): boolean {
  return role === "Seller" || isAdmin(email);
}

/**
 * Check if the user owns a specific post (or is admin).
 * Admins can manage any post. Clients can NEVER manage posts.
 */
export function canManagePost(
  currentUserId: string | undefined,
  postOwnerId: string | undefined,
  email?: string | null,
  role?: string | null
): boolean {
  if (isAdmin(email)) return true;
  // Clients can never edit/delete posts
  if (role === "Client") return false;
  return !!currentUserId && !!postOwnerId && currentUserId === postOwnerId;
}
