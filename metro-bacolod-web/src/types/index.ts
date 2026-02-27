// ============================================
// Shared TypeScript Interfaces & Types
// ============================================

// --- User ---
export interface UserProfile {
  uid: string;
  email: string;
  role: 'Seller' | 'Client';
  customId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dob?: string;
  gender?: string;
  maritalStatus?: string;
  mobile?: string;
  address?: string;
  fullAddress?: {
    street: string;
    city: string;
    province: string;
    zipCode: string;
  };
  prcLicenseNo?: string;
  photoURL?: string;
  displayName?: string;
  username?: string;
  description?: string;
  isDeactivated?: boolean;
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
  createdAt: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
  };
}

// --- Post / Listing ---
export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userCustomId?: string;
  userRole?: string;
  userPhone?: string;
  title: string;
  content: string;
  location: string;
  price: string;
  status: 'For Sale' | 'Pre-Selling' | 'Ready for Occupancy' | 'For Lease';
  type: 'House & Lot' | 'Lot Only' | 'Condo' | 'Commercial';
  rooms: number;
  bathrooms: number;
  lotArea: string;
  floorArea: string;
  yearBuilt: number;
  amenities: string[];
  images: string[];
  image?: string;
  pinCoords?: [number, number];
  likes: number;
  likedBy: string[];
  savedBy: string[];
  isArchived: boolean;
  deletedAt?: string;
  createdAt: string;
  timeAgo?: string;
}

// --- Listing Card (formatted for UI) ---
export interface ListingCardData {
  id: string;
  title: string;
  rooms: number;
  bathrooms: number;
  lotArea: string;
  floorArea: string;
  yearBuilt: number;
  location: string;
  price: string;
  description: string;
  fullDescription: string;
  amenities: string[];
  agentName: string;
  agentRating: number;
  agentPhone: string;
  agentAvatar: string;
  image: string;
  images: string[];
  status: string;
  type: string;
  pinCoords: [number, number] | null;
  listedDate: string;
  originalPost: Post;
}

// --- Chat / Message ---
export interface Chat {
  id: string;
  participants: string[];
  users: Record<string, { name: string; avatar: string }>;
  lastMessage?: string;
  updatedAt?: any;
  hasUnread?: Record<string, boolean>;
}

export interface Message {
  id: string;
  text?: string;
  imageUrl?: string;
  senderId: string;
  createdAt: any;
  isDeleted?: boolean;
  deletedAt?: string;
}

// --- Notification ---
export interface Notification {
  id: string;
  userId: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

// --- Report ---
export interface Report {
  id: string;
  postId: string;
  postTitle: string;
  reportedBy: string;
  reporterName: string;
  reason: 'misleading' | 'inappropriate' | 'scam' | 'duplicate' | 'other';
  status: 'pending' | 'dismissed' | 'resolved';
  createdAt: string;
}

// --- Review ---
export interface Review {
  rating: number;
  reviewerId: string;
  reviewerName: string;
  createdAt: string;
}

// --- Mortgage Calculation Result ---
export interface MortgageResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  principal: number;
  downPayment: number;
}
