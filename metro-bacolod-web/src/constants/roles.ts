// ============================================
// RBAC Constants & Helpers
// ============================================

import { collection, getDocs, query, where } from "firebase/firestore";
// Admin detection queries "users" collection where role === "Admin"
import { db } from "../firebase-config";

// Role types
export type UserRole = "Seller" | "Agent" | "Client" | "Admin";

// Cache admin emails from users with role "Admin"
let cachedAdminEmails: string[] | null = null;
let adminCacheTimestamp = 0;
const ADMIN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch admin emails from the "users" collection (role === "Admin").
 * Results are cached for 5 minutes.
 */
export async function fetchAdminEmails(): Promise<string[]> {
  const now = Date.now();
  if (cachedAdminEmails && now - adminCacheTimestamp < ADMIN_CACHE_TTL) {
    return cachedAdminEmails;
  }
  try {
    const usersSnap = await getDocs(
      query(collection(db, "users"), where("role", "==", "Admin"))
    );

    cachedAdminEmails = usersSnap.docs
      .map(d => (d.data().email as string || "").toLowerCase())
      .filter(Boolean);

    adminCacheTimestamp = now;
    return cachedAdminEmails;
  } catch (err) {
    console.error("Failed to fetch admin list:", err);
    return cachedAdminEmails || [];
  }
}

/**
 * Check if the user is the platform admin (async).
 * Uses the "users" collection role field.
 */
export async function isAdminAsync(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const admins = await fetchAdminEmails();
  return admins.includes(email.toLowerCase());
}

/**
 * Synchronous admin check — uses cached data only.
 * Call fetchAdminEmails() first to populate the cache.
 */
export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  if (!cachedAdminEmails) return false;
  return cachedAdminEmails.includes(email.toLowerCase());
}

/**
 * Check if the user can create/edit/delete listings.
 * Only verified Sellers, Agents, and Admins can do this.
 */
export function canCreateListings(role?: string | null, email?: string | null): boolean {
  return role === "Seller" || role === "Agent" || isAdmin(email);
}

/**
 * Check if the user can access the Trash/Archive page.
 * Only Sellers, Agents, and Admins can do this.
 */
export function canAccessTrash(role?: string | null, email?: string | null): boolean {
  return role === "Seller" || role === "Agent" || isAdmin(email);
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

/**
 * Check if the role requires admin verification before posting.
 */
export function requiresVerification(role?: string | null): boolean {
  return role === "Seller" || role === "Agent";
}
