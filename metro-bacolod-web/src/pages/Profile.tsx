import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { doc, getDoc, collection, addDoc, query, where, orderBy, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import {
  FaSearch, FaUser, FaCog, FaSignOutAlt, FaCaretDown,
  FaTrash, FaStar, FaStarHalfAlt, FaRegStar, FaHome,
  FaEnvelope, FaTimes, FaImage, FaSpinner, FaPlus,
  FaMapMarkerAlt, FaShare, FaChevronLeft, FaChevronRight,
  FaBed, FaBath, FaRulerCombined, FaCalendarAlt, FaPhoneAlt,
  FaHeart, FaRegHeart, FaMap, FaCalculator,
  FaFacebookF, FaTwitter, FaInstagram
} from "react-icons/fa";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import logo from "../assets/MBC Logo.png";
import "../App.css";
import Swal from "sweetalert2";
import { glassToast } from "../components/GlassToast";
import { BACOLOD_LOCATIONS } from "../constants/locations";
import { canCreateListings, canAccessTrash } from "../constants/roles";

// --- Fix Leaflet default marker icons ---
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// --- Bacolod location coordinates ---
const LOCATION_COORDS: Record<string, [number, number]> = {
  "Alijis": [10.6560, 122.9280],
  "Banago": [10.7050, 122.9520],
  "Bata": [10.6870, 122.9580],
  "Cabug": [10.7200, 122.9400],
  "Estefania": [10.6790, 122.9530],
  "Felisa": [10.7010, 122.9500],
  "Granada": [10.6720, 122.9350],
  "Handumanan": [10.6480, 122.9530],
  "Mandalagan": [10.6920, 122.9430],
  "Mansilingan": [10.6590, 122.9680],
  "Montevista": [10.6650, 122.9420],
  "Pahanocoy": [10.6700, 122.9600],
  "Punta Taytay": [10.7100, 122.9630],
  "Singcang-Airport": [10.6480, 122.9320],
  "Sum-ag": [10.6370, 122.9400],
  "Taculing": [10.6530, 122.9500],
  "Tangub": [10.7150, 122.9420],
  "Villamonte": [10.6750, 122.9500],
  "Vista Alegre": [10.6690, 122.9480],
};
const BACOLOD_CENTER: [number, number] = [10.6840, 122.9510];

// --- Mortgage Calculator ---
function calculateMortgage(propertyPrice: number, downPaymentPercent: number, annualRate: number, termYears: number) {
  const downPayment = propertyPrice * (downPaymentPercent / 100);
  const principal = propertyPrice - downPayment;
  const monthlyRate = annualRate / 100 / 12;
  const totalPayments = termYears * 12;
  if (monthlyRate === 0) {
    return { monthlyPayment: principal / totalPayments, totalPayment: principal, totalInterest: 0, principal, downPayment };
  }
  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1);
  const totalPayment = monthlyPayment * totalPayments;
  const totalInterest = totalPayment - principal;
  return { monthlyPayment, totalPayment, totalInterest, principal, downPayment };
}

function parsePriceToNumber(priceStr: string): number {
  if (!priceStr) return 0;
  const cleaned = priceStr.toLowerCase().replace(/[^0-9.]/g, ' ').trim();
  const parts = cleaned.split(/\s+/);
  const num = parseFloat(parts[0]);
  if (isNaN(num)) return 0;
  if (priceStr.toLowerCase().includes('million')) return num * 1_000_000;
  if (priceStr.toLowerCase().includes('billion')) return num * 1_000_000_000;
  return num;
}

// --- Format price number for display ---
function formatPriceDisplay(price: string): string {
  const num = parsePriceToNumber(price);
  if (num <= 0) return price;
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(num % 1_000_000_000 === 0 ? 0 : 1)} Billion PHP`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1)} Million PHP`;
  return `₱${num.toLocaleString()}`;
}

// --- Rating Stars Component ---
const RatingStars = ({ rating }: { rating: number }) => {
  const stars = [];
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.3;
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push(<FaStar key={i} />);
    else if (i === full && hasHalf) stars.push(<FaStarHalfAlt key={i} />);
    else stars.push(<FaRegStar key={i} />);
  }
  return <span className="rating-stars">{stars}</span>;
};

// --- Map Click Handler for pin placement ---
function MapClickHandler({ onPin }: { onPin: (coords: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onPin([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

// --- Helper function to map Firebase data to UI perfectly ---
const formatPostData = (d: any) => {
  const p = d.data();
  return {
    id: d.id,
    title: p.title || p.content?.split('\n')[0]?.substring(0, 40) || 'New Listing',
    rooms: p.rooms || 0,
    bathrooms: p.bathrooms || 0,
    lotArea: p.lotArea || 'N/A',
    floorArea: p.floorArea || 'N/A',
    yearBuilt: p.yearBuilt || 0,
    location: p.location || 'Bacolod',
    price: p.price || 'Contact for price',
    description: p.content || 'No description provided.',
    fullDescription: p.content || 'No description provided.',
    amenities: p.amenities || [],
    agentName: p.userName || 'Unknown Agent',
    agentRating: 4.0,
    agentPhone: p.phone || 'N/A',
    agentAvatar: p.userAvatar || 'https://ui-avatars.com/api/?name=U&rounded=true',
    image: p.images?.[0] || p.image || '',
    images: p.images || (p.image ? [p.image] : []),
    status: p.status || 'For Sale',
    type: p.type || 'Property',
    listedDate: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
    originalPost: { ...p, id: d.id },
  };
};

export default function Profile() {
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [myPosts, setMyPosts] = useState<any[]>([]); // User's own dynamic posts

  const [viewedUser, setViewedUser] = useState<any>(null);
  const [viewedUserData, setViewedUserData] = useState<any>(null);
  const [viewedPosts, setViewedPosts] = useState<any[]>([]);
  
  const isViewingOther = !!routeUserId && routeUserId !== user?.uid;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  // Listing detail modal state
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'map' | 'calculator'>('details');
  const [mortgageDownPayment, setMortgageDownPayment] = useState(20);
  const [mortgageRate, setMortgageRate] = useState(7);
  const [mortgageTerm, setMortgageTerm] = useState(20);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [showShareSocials, setShowShareSocials] = useState(false);

  // Create Listing Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [listingTitle, setListingTitle] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [listingLocation, setListingLocation] = useState("");
  const [listingStatus, setListingStatus] = useState("For Sale");
  const [listingType, setListingType] = useState("House & Lot");
  const [listingRooms, setListingRooms] = useState("");
  const [listingBathrooms, setListingBathrooms] = useState("");
  const [listingLotArea, setListingLotArea] = useState("");
  const [listingFloorArea, setListingFloorArea] = useState("");
  const [listingYearBuilt, setListingYearBuilt] = useState("");
  const [listingAmenities, setListingAmenities] = useState("");
  const [listingPinCoords, setListingPinCoords] = useState<[number, number] | null>(null);
  const [createMapStyle, setCreateMapStyle] = useState<'street' | 'satellite'>('street');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate("/");
      } else {
        setUser(currentUser);
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            setUserData(userSnap.data());
          }

          // Fetch the current user's actual posts (exclude trashed/archived)
          const postsQuery = query(
            collection(db, "posts"),
            where("userId", "==", currentUser.uid)
          );
          const postsSnap = await getDocs(postsQuery);
          setMyPosts(
            postsSnap.docs
              .filter(d => !d.data().isArchived && !d.data().isDeleted)
              .map(formatPostData)
          );

        } catch (err) {
          console.error("Error fetching user data:", err);
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch own posts from Firestore
  useEffect(() => {
    if (!user?.uid) return;
    const fetchMyPosts = async () => {
      try {
        const postsQuery = query(
          collection(db, "posts"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const postsSnap = await getDocs(postsQuery);
        const ownPosts = postsSnap.docs
          .filter(d => !d.data().isArchived && !d.data().isDeleted)
          .map(d => {
            const p = d.data();
            return {
              id: d.id,
              title: p.title || p.content?.split('\n')[0]?.substring(0, 40) || 'New Listing',
              rooms: p.rooms || 0,
              bathrooms: p.bathrooms || 0,
              lotArea: p.lotArea || 'N/A',
              floorArea: p.floorArea || 'N/A',
              yearBuilt: p.yearBuilt || 0,
              location: p.location || 'Bacolod',
              price: p.price || 'Contact for price',
              description: p.content || 'No description provided.',
              fullDescription: p.content || 'No description provided.',
              amenities: p.amenities || [],
              agentName: p.userName || 'Unknown Agent',
              agentRating: 4.0,
              agentPhone: p.phone || 'N/A',
              agentAvatar: p.userAvatar || 'https://ui-avatars.com/api/?name=U&rounded=true',
              image: p.images?.[0] || p.image || '',
              images: p.images || (p.image ? [p.image] : []),
              status: p.status || 'For Sale',
              type: p.type || 'Property',
              pinCoords: p.pinCoords || null,
              listedDate: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
              originalPost: { ...p, id: d.id, userId: p.userId },
            };
          });
        setMyPosts(ownPosts);
      } catch (err) {
        console.error("Error fetching own posts:", err);
      }
    };
    fetchMyPosts();
  }, [user?.uid]);

  // Fetch viewed agent's data and posts when viewing another profile
  useEffect(() => {
    if (!routeUserId || routeUserId === user?.uid) {
      setViewedUser(null);
      setViewedUserData(null);
      setViewedPosts([]);
      return;
    }
    const fetchAgent = async () => {
      try {
        const userDocRef = doc(db, "users", routeUserId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          setViewedUserData(userSnap.data());
          setViewedUser({ uid: routeUserId, ...userSnap.data() });
        }
        // Fetch their posts dynamically
        const postsQuery = query(
          collection(db, "posts"),
          where("userId", "==", routeUserId),
        );
        const postsSnap = await getDocs(postsQuery);
        setViewedPosts(
          postsSnap.docs
            .filter(d => !d.data().isArchived && !d.data().isDeleted)
            .map(formatPostData)
        );
      } catch (err) {
        console.error("Error fetching agent profile:", err);
      }
    };
    fetchAgent();
  }, [routeUserId, user?.uid]);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Logout?",
      text: "Are you sure you want to sign out?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#111827",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, logout",
    });
    if (result.isConfirmed) {
      await signOut(auth);
      navigate("/");
    }
  };

  const handleInquire = (listing?: any) => {
    Swal.fire({
      title: "Inquiry Sent!",
      text: "The agent will contact you shortly.",
      icon: "success",
      confirmButtonColor: "#111827",
    });
  };

  const handleShare = async (listing: any) => {
    const shareUrl = window.location.href;
    const shareText = `Check out this listing: ${listing.title} - ${listing.price}`;
    await Swal.fire({
      title: '<span style="font-weight:600;font-size:1.1rem;">Share Listing</span>',
      html: `
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">
          <div id="share-fb" style="padding:14px;cursor:pointer;border:1px solid #e5e7eb;border-radius:10px;font-size:0.9rem;font-weight:500;transition:background 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='white'">Share to Facebook</div>
          <div id="share-x" style="padding:14px;cursor:pointer;border:1px solid #e5e7eb;border-radius:10px;font-size:0.9rem;font-weight:500;transition:background 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='white'">Share to X (Twitter)</div>
          <div id="share-copy" style="padding:14px;cursor:pointer;border:1px solid #e5e7eb;border-radius:10px;font-size:0.9rem;font-weight:500;transition:background 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='white'">Copy Link</div>
        </div>
      `,
      showConfirmButton: false, showCloseButton: true, width: '340px',
      didOpen: () => {
        document.getElementById('share-fb')?.addEventListener('click', () => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank'); Swal.close(); });
        document.getElementById('share-x')?.addEventListener('click', () => { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank'); Swal.close(); });
        document.getElementById('share-copy')?.addEventListener('click', () => { navigator.clipboard.writeText(`${shareText} ${shareUrl}`); glassToast.success("Link copied!"); Swal.close(); });
      }
    });
  };

  // --- Listing Modal Handlers ---
  const openListingModal = (listing: any) => {
    setSelectedListing(listing);
    setCarouselIndex(0);
    setIsLiked(false);
    setActiveModalTab('details');
    setShowShareSocials(false);
    setMortgageDownPayment(20);
    setMortgageRate(7);
    setMortgageTerm(20);
    setMapStyle('street');
  };

  const closeListingModal = () => {
    setSelectedListing(null);
    setShowShareSocials(false);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const imgs = selectedListing?.images || [selectedListing?.image];
    setCarouselIndex((prev: number) => (prev + 1) % imgs.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const imgs = selectedListing?.images || [selectedListing?.image];
    setCarouselIndex((prev: number) => (prev - 1 + imgs.length) % imgs.length);
  };

  // --- Create Listing Handlers ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setImageFiles([...imageFiles, ...Array.from(e.target.files)]);
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resetCreateForm = () => {
    setListingTitle("");
    setListingDescription("");
    setListingPrice("");
    setListingLocation("");
    setListingStatus("For Sale");
    setListingType("House & Lot");
    setListingRooms("");
    setListingBathrooms("");
    setListingLotArea("");
    setListingFloorArea("");
    setListingYearBuilt("");
    setListingAmenities("");
    setImageFiles([]);
    setListingPinCoords(null);
    setCreateMapStyle('street');
  };

  const handleCreateListing = async () => {
    if (!canCreateListings(userData?.role, user?.email)) return glassToast.error("Only agents can create listings.");
    if (!listingTitle.trim()) return glassToast.warning("Enter a listing title.");
    if (!listingLocation) return glassToast.warning("Select a location.");
    if (!listingPrice.trim()) return glassToast.warning("Enter a price.");
    if (imageFiles.length === 0) return glassToast.warning("Upload at least 1 image.");
    if (!listingPinCoords) return glassToast.warning("Pin the listing location on the map.");

    setIsUploading(true);
    try {
      const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dg6kzqq5n";
      const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "jdj7tsar";
      const imageUrls: string[] = [];

      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        formData.append("cloud_name", CLOUD_NAME);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const data = await response.json();
        if (data.secure_url) imageUrls.push(data.secure_url);
        else throw new Error("Image upload failed");
      }

      const amenitiesArray = listingAmenities
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        userName: userData?.firstName ? `${userData.firstName} ${userData.lastName}` : (user.displayName || "Metro User"),
        userAvatar: user.photoURL,
        userCustomId: userData?.customId || "USER",
        userRole: userData?.role || "Client",
        title: listingTitle,
        content: listingDescription,
        location: listingLocation,
        price: listingPrice,
        status: listingStatus,
        type: listingType,
        rooms: parseInt(listingRooms) || 0,
        bathrooms: parseInt(listingBathrooms) || 0,
        lotArea: listingLotArea || "N/A",
        floorArea: listingFloorArea || "N/A",
        yearBuilt: parseInt(listingYearBuilt) || 0,
        amenities: amenitiesArray,
        images: imageUrls,
        image: imageUrls[0],
        pinCoords: listingPinCoords,
        createdAt: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        savedBy: [],
        isArchived: false,
      });

      glassToast.success("Listing published!");
      resetCreateForm();
      setShowCreateModal(false);
      // Optional: Refresh myPosts here so the UI instantly shows the new listing
    } catch (error: any) {
      console.error(error);
      glassToast.error("Failed to publish: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Use viewed agent data if viewing another profile, otherwise own data
  const profileData = isViewingOther ? viewedUserData : userData;
  const profileUser = isViewingOther ? viewedUser : user;

  // Navbar always shows the logged-in user
  const navDisplayName = userData?.firstName
    ? `${userData.firstName} ${userData.lastName}`
    : user?.displayName || "User";

  // Profile sidebar shows the viewed agent (or self)
  const displayName = profileData?.firstName
    ? `${profileData.firstName} ${profileData.lastName}`
    : profileUser?.displayName || profileUser?.userName || "User";

  const userRole = userData?.role || "Client";
  const isAgent = canCreateListings(userData?.role, user?.email);
  
  // This completely removes the mock data dependency!
  const profileListings = isViewingOther ? viewedPosts : myPosts;

  return (
    <div className="profile-page">
      {/* ========== BLACK BLOBS (background) ========== */}
      <div className="profile-blob profile-blob-1" />
      <div className="profile-blob profile-blob-2" />
      <div className="profile-blob profile-blob-3" />
      <div className="profile-blob profile-blob-4" />

      {/* ========== NAVBAR (same as Dashboard) ========== */}
      <nav className="dash-nav">
        <div className="dash-nav-left">
          <img
            src={logo}
            alt="MBC Logo"
            className="dash-logo"
            onClick={() => navigate("/dashboard")}
          />
          <div className="dash-search-wrapper">
            <FaSearch className="dash-search-icon" />
            <input
              type="text"
              className="dash-search-input"
              placeholder="Search in Metro Bacolod Connect"
            />
          </div>
        </div>
        <div className="dash-nav-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          {/* --- NEW DESKTOP MESSAGES ICON --- */}
          <div 
            onClick={() => navigate('/messages')} 
            style={{ cursor: 'pointer', color: '#4b5563', display: 'flex', alignItems: 'center', transition: '0.2s' }} 
            title="Messages"
            className="desktop-msg-icon"
          >
            <FaEnvelope size={22} />
          </div>

          <div
            className="dash-user-trigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="dash-user-text">
              <span className="dash-user-name">{navDisplayName}</span>
              <span className="dash-user-role">{userRole}</span>
            </div>
            <img
              src={
                user?.photoURL ||
                "https://ui-avatars.com/api/?name=User&background=e5e7eb&color=9ca3af&rounded=true"
              }
              alt="avatar"
              className="dash-avatar"
            />
          </div>
          {isDropdownOpen && (
            <div className="dash-dropdown">
              <div
                className="dash-dropdown-item"
                onClick={() => {
                  navigate("/profile");
                  setIsDropdownOpen(false);
                }}
              >
                <FaUser /> Profile
              </div>
              <div
                className="dash-dropdown-item"
                onClick={() => {
                  navigate("/settings");
                  setIsDropdownOpen(false);
                }}
              >
                <FaCog /> Settings
              </div>
              {canAccessTrash(userData?.role, user?.email) && (
                <div
                  className="dash-dropdown-item"
                  onClick={() => {
                    navigate("/archive");
                    setIsDropdownOpen(false);
                  }}
                >
                  <FaTrash /> Trash
                </div>
              )}
              <div className="dash-dropdown-divider" />
              <div
                className="dash-dropdown-item dash-dropdown-logout"
                onClick={handleLogout}
              >
                <FaSignOutAlt /> Logout
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ========== MAIN CONTENT ========== */}
      <div className="profile-content">
        {/* --- LEFT: Profile Info --- */}
        <aside className="profile-sidebar">
          <div className="profile-avatar-wrapper">
            <img
              src={
                profileUser?.photoURL ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=d1d5db&color=6b7280&rounded=true&size=256`
              }
              alt="Profile"
              className="profile-avatar-large"
            />
          </div>
          <div className="profile-info">
            <p className="profile-info-line">
              <strong>Agent Name:</strong> {displayName}
            </p>
            <p className="profile-info-line">
              <strong>Location/Office:</strong>{" "}
              {profileData?.address || "Bacolod"}
            </p>
            <p className="profile-info-line">
              <strong>Number:</strong> {profileData?.phone || "—"}
            </p>
            <p className="profile-info-line">
              <strong>Email:</strong> {profileUser?.email || "—"}
            </p>
          </div>
          <p className="profile-bio">
            {profileData?.description || "No description yet. Add one in Settings > Account."}
          </p>
          {!isViewingOther && isAgent && (
            <button
              className="profile-create-btn"
              onClick={() => setShowCreateModal(true)}
            >
              <FaPlus size={12} /> Create Listing
            </button>
          )}
        </aside>

        {/* --- RIGHT: Recent Posts --- */}
        <section className="profile-posts-section">
          <h2 className="profile-posts-heading">{isViewingOther ? 'Listings:' : 'Recent posts:'}</h2>
          <div className="profile-posts-grid">
            {profileListings.length === 0 && (
              <p style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.85rem' }}>No listings yet.</p>
            )}
            {profileListings.map((listing) => (
              <div className="glass-listing-card profile-card" key={listing.id} onClick={() => openListingModal(listing)} style={{ cursor: 'pointer' }}>
                {/* Card Info - Left */}
                <div className="glass-card-content">
                  <div>
                    <h3 className="glass-card-title">
                      {listing.title}
                      {listing.rooms > 0 && (
                        <>
                          <br />
                          <span className="glass-card-rooms">
                            {listing.rooms} rooms
                          </span>
                        </>
                      )}
                    </h3>
                    <ul className="glass-card-bullets">
                      <li>→ {listing.location} Location</li>
                      <li>→ {formatPriceDisplay(listing.price)}</li>
                    </ul>
                    <p className="glass-card-desc">{listing.description}</p>
                  </div>
                  <div className="glass-card-footer">
                    <div className="glass-card-agent">
                      <img
                        src={listing.agentAvatar}
                        alt={listing.agentName}
                      />
                      <div className="agent-meta">
                        <span className="agent-name">
                          {listing.agentName}
                        </span>
                        <span className="agent-rating-row">
                          <RatingStars rating={listing.agentRating} />
                          <span className="agent-rating-text">
                            {listing.agentRating} Stars
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Right - Image + Inquire */}
                <div className="glass-card-right">
                  <div className="glass-card-image">
                    {listing.image && (
                      <img src={listing.image} alt={listing.title} />
                    )}
                  </div>
                  <button
                    className="glass-inquire-btn"
                    onClick={(e) => { e.stopPropagation(); handleInquire(listing); }}
                  >
                    INQUIRE NOW →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ========== CREATE LISTING MODAL ========== */}
      {showCreateModal && (
        <div className="create-listing-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="create-listing-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="create-listing-header">
              <h2>New Listing</h2>
              <FaTimes className="create-listing-close" onClick={() => setShowCreateModal(false)} />
            </div>

            {/* Scrollable Body */}
            <div className="create-listing-body">
              {/* Title */}
              <div className="create-listing-field">
                <label>Listing Title *</label>
                <input
                  type="text"
                  className="create-listing-input"
                  placeholder="e.g. Greenfield Residences"
                  value={listingTitle}
                  onChange={(e) => setListingTitle(e.target.value)}
                />
              </div>

              {/* Two-column row: Price + Location */}
              <div className="create-listing-row">
                <div className="create-listing-field">
                  <label>Price (₱) *</label>
                  <input
                    type="number"
                    className="create-listing-input"
                    placeholder="e.g. 1000000"
                    value={listingPrice}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || Number(v) >= 0) setListingPrice(v);
                    }}
                    min="0"
                  />
                  {listingPrice && <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Display: {formatPriceDisplay(listingPrice)}</span>}
                </div>
                <div className="create-listing-field">
                  <label>Location *</label>
                  <select
                    className="create-listing-select"
                    value={listingLocation}
                    onChange={(e) => setListingLocation(e.target.value)}
                  >
                    <option value="" disabled>Select location</option>
                    {BACOLOD_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Two-column row: Status + Type */}
              <div className="create-listing-row">
                <div className="create-listing-field">
                  <label>Status</label>
                  <select
                    className="create-listing-select"
                    value={listingStatus}
                    onChange={(e) => setListingStatus(e.target.value)}
                  >
                    <option value="For Sale">For Sale</option>
                    <option value="Pre-Selling">Pre-Selling</option>
                    <option value="Ready for Occupancy">Ready for Occupancy</option>
                    <option value="For Lease">For Lease</option>
                  </select>
                </div>
                <div className="create-listing-field">
                  <label>Type</label>
                  <select
                    className="create-listing-select"
                    value={listingType}
                    onChange={(e) => setListingType(e.target.value)}
                  >
                    <option value="House & Lot">House & Lot</option>
                    <option value="Lot Only">Lot Only</option>
                    <option value="Condo">Condo</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>
              </div>

              {/* Section Title */}
              <div className="create-listing-section-title">Property Details</div>

              {/* Four-column row: Rooms, Bathrooms, Lot Area, Floor Area */}
              <div className="create-listing-row create-listing-row-4">
                <div className="create-listing-field">
                  <label>Bedrooms</label>
                  <input
                    type="number"
                    className="create-listing-input"
                    placeholder="0"
                    min="0"
                    value={listingRooms}
                    onChange={(e) => setListingRooms(e.target.value)}
                  />
                </div>
                <div className="create-listing-field">
                  <label>Bathrooms</label>
                  <input
                    type="number"
                    className="create-listing-input"
                    placeholder="0"
                    min="0"
                    value={listingBathrooms}
                    onChange={(e) => setListingBathrooms(e.target.value)}
                  />
                </div>
                <div className="create-listing-field">
                  <label>Lot Area</label>
                  <input
                    type="text"
                    className="create-listing-input"
                    placeholder="e.g. 200 sqm"
                    value={listingLotArea}
                    onChange={(e) => setListingLotArea(e.target.value)}
                  />
                </div>
                <div className="create-listing-field">
                  <label>Floor Area</label>
                  <input
                    type="text"
                    className="create-listing-input"
                    placeholder="e.g. 140 sqm"
                    value={listingFloorArea}
                    onChange={(e) => setListingFloorArea(e.target.value)}
                  />
                </div>
              </div>

              {/* Year Built */}
              <div className="create-listing-row">
                <div className="create-listing-field">
                  <label>Year Built</label>
                  <input
                    type="number"
                    className="create-listing-input"
                    placeholder="e.g. 2024"
                    min="1900"
                    max="2030"
                    value={listingYearBuilt}
                    onChange={(e) => setListingYearBuilt(e.target.value)}
                  />
                </div>
                <div className="create-listing-field">
                  <label>Amenities</label>
                  <input
                    type="text"
                    className="create-listing-input"
                    placeholder="Separate by commas (e.g. Pool, Gym, Parking)"
                    value={listingAmenities}
                    onChange={(e) => setListingAmenities(e.target.value)}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="create-listing-field">
                <label>Description</label>
                <textarea
                  className="create-listing-textarea"
                  placeholder="Describe the property, its features, and surroundings..."
                  value={listingDescription}
                  onChange={(e) => setListingDescription(e.target.value)}
                />
              </div>

              {/* Image Upload */}
              <div className="create-listing-section-title">Photos *</div>
              <div className="create-listing-photos">
                {imageFiles.map((file, i) => (
                  <div key={i} className="create-listing-photo-item">
                    <img src={URL.createObjectURL(file)} alt="" />
                    <button onClick={() => removeImage(i)} className="create-listing-photo-remove">&#215;</button>
                  </div>
                ))}
                <button
                  className="create-listing-photo-add"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FaImage size={20} />
                  <span>Add Photos</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  hidden
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                />
              </div>

              {/* Pin Location on Map */}
              <div className="create-listing-section-title">Pin Location on Map *</div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 8px 0' }}>Click on the map to place a pin where the property is located.</p>
              <div className="create-listing-map-wrapper">
                <div className="create-listing-map-toggle">
                  <button
                    type="button"
                    className={`create-map-style-btn ${createMapStyle === 'street' ? 'active' : ''}`}
                    onClick={() => setCreateMapStyle('street')}
                  >
                    Street
                  </button>
                  <button
                    type="button"
                    className={`create-map-style-btn ${createMapStyle === 'satellite' ? 'active' : ''}`}
                    onClick={() => setCreateMapStyle('satellite')}
                  >
                    Satellite
                  </button>
                </div>
                <MapContainer
                  center={listingLocation && LOCATION_COORDS[listingLocation] ? LOCATION_COORDS[listingLocation] : BACOLOD_CENTER}
                  zoom={14}
                  style={{ height: '260px', width: '100%', borderRadius: '14px', zIndex: 0 }}
                  key={`create-map-${listingLocation}-${createMapStyle}`}
                >
                  {createMapStyle === 'street' ? (
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  ) : (
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='&copy; Esri' />
                  )}
                  <MapClickHandler onPin={(coords) => setListingPinCoords(coords)} />
                  {listingPinCoords && (
                    <Marker position={listingPinCoords}>
                      <Popup>Listing location</Popup>
                    </Marker>
                  )}
                </MapContainer>
                {listingPinCoords && (
                  <p style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '6px', fontWeight: 500 }}>
                    <FaMapMarkerAlt size={10} /> Pinned at {listingPinCoords[0].toFixed(5)}, {listingPinCoords[1].toFixed(5)}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="create-listing-footer">
              <button className="create-listing-cancel" onClick={() => { resetCreateForm(); setShowCreateModal(false); }}>
                Cancel
              </button>
              <button className="create-listing-publish" onClick={handleCreateListing} disabled={isUploading}>
                {isUploading ? <><FaSpinner className="spin" /> Publishing...</> : 'Publish Listing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== LISTING DETAIL MODAL ========== */}
      {selectedListing && (() => {
        const imgs = selectedListing.images?.length > 0 ? selectedListing.images : [selectedListing.image];
        const listingCoords = selectedListing.pinCoords || LOCATION_COORDS[selectedListing.location] || BACOLOD_CENTER;
        const listingPrice = parsePriceToNumber(selectedListing.price);
        const propertyPrice = listingPrice;

        // Validation (price comes from listing, no price validation needed)
        const downPaymentError = mortgageDownPayment < 10 ? 'Minimum 10%' : mortgageDownPayment > 50 ? 'Maximum 50%' : '';
        const rateError = mortgageRate < 3 ? 'Minimum 3%' : mortgageRate > 12 ? 'Maximum 12%' : '';
        const termError = mortgageTerm < 5 ? 'Minimum 5 years' : mortgageTerm > 30 ? 'Maximum 30 years' : '';
        const hasValidationError = !!(downPaymentError || rateError || termError || propertyPrice <= 0);
        const mortgage = !hasValidationError && propertyPrice > 0 ? calculateMortgage(propertyPrice, mortgageDownPayment, mortgageRate, mortgageTerm) : null;
        return (
          <div className="listing-modal-overlay" onClick={closeListingModal}>
            <div className="listing-modal" onClick={(e) => e.stopPropagation()}>
              {/* Image Carousel */}
              <div className="listing-modal-carousel">
                <img
                  src={imgs[carouselIndex]}
                  alt={selectedListing.title}
                  className="listing-modal-carousel-img"
                />
                {imgs.length > 1 && (
                  <>
                    <button className="carousel-arrow carousel-arrow-left" onClick={prevImage}>
                      <FaChevronLeft />
                    </button>
                    <button className="carousel-arrow carousel-arrow-right" onClick={nextImage}>
                      <FaChevronRight />
                    </button>
                    <div className="carousel-dots">
                      {imgs.map((_: any, i: number) => (
                        <span
                          key={i}
                          className={`carousel-dot ${i === carouselIndex ? 'carousel-dot-active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); setCarouselIndex(i); }}
                        />
                      ))}
                    </div>
                  </>
                )}
                {/* Status Badge */}
                <span className="listing-modal-status">{selectedListing.status}</span>
                {/* Top-Right: Like + Close */}
                <div className="listing-modal-top-actions">
                  <button className="listing-modal-like" onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); }}>
                    {isLiked ? <FaHeart color="#ef4444" /> : <FaRegHeart />}
                  </button>
                  <button className="listing-modal-close" onClick={(e) => { e.stopPropagation(); closeListingModal(); }}>
                    <FaTimes />
                  </button>
                </div>
                {/* Image Counter */}
                <span className="listing-modal-counter">{carouselIndex + 1} / {imgs.length}</span>
              </div>

              {/* Tab Navigation */}
              <div className="listing-modal-tabs">
                <button
                  className={`listing-modal-tab ${activeModalTab === 'details' ? 'listing-modal-tab-active' : ''}`}
                  onClick={() => setActiveModalTab('details')}
                >
                  <FaHome size={13} /> Details
                </button>
                <button
                  className={`listing-modal-tab ${activeModalTab === 'map' ? 'listing-modal-tab-active' : ''}`}
                  onClick={() => setActiveModalTab('map')}
                >
                  <FaMap size={13} /> Map
                </button>
                {listingPrice > 0 && (
                  <button
                    className={`listing-modal-tab ${activeModalTab === 'calculator' ? 'listing-modal-tab-active' : ''}`}
                    onClick={() => setActiveModalTab('calculator')}
                  >
                    <FaCalculator size={13} /> Calculator
                  </button>
                )}
              </div>

              {/* Modal Body */}
              <div className="listing-modal-body" key={activeModalTab}>
                {activeModalTab === 'details' && (
                  <>
                    <div className="listing-modal-body-left">
                      <div className="listing-modal-title-row">
                        <div>
                          <h2 className="listing-modal-title">{selectedListing.title}</h2>
                          <p className="listing-modal-location">
                            <FaMapMarkerAlt size={12} /> {selectedListing.location}, Bacolod City
                          </p>
                        </div>
                        <div className="listing-modal-price">{formatPriceDisplay(selectedListing.price)}</div>
                      </div>

                      <div className="listing-modal-details">
                        {selectedListing.rooms > 0 && (
                          <div className="listing-detail-item">
                            <FaBed className="listing-detail-icon" />
                            <div>
                              <span className="listing-detail-value">{selectedListing.rooms}</span>
                              <span className="listing-detail-label">Bedrooms</span>
                            </div>
                          </div>
                        )}
                        {selectedListing.bathrooms > 0 && (
                          <div className="listing-detail-item">
                            <FaBath className="listing-detail-icon" />
                            <div>
                              <span className="listing-detail-value">{selectedListing.bathrooms}</span>
                              <span className="listing-detail-label">Bathrooms</span>
                            </div>
                          </div>
                        )}
                        <div className="listing-detail-item">
                          <FaRulerCombined className="listing-detail-icon" />
                          <div>
                            <span className="listing-detail-value">{selectedListing.lotArea}</span>
                            <span className="listing-detail-label">Lot Area</span>
                          </div>
                        </div>
                        {selectedListing.floorArea !== 'N/A' && (
                          <div className="listing-detail-item">
                            <FaRulerCombined className="listing-detail-icon" />
                            <div>
                              <span className="listing-detail-value">{selectedListing.floorArea}</span>
                              <span className="listing-detail-label">Floor Area</span>
                            </div>
                          </div>
                        )}
                        {selectedListing.yearBuilt > 0 && (
                          <div className="listing-detail-item">
                            <FaCalendarAlt className="listing-detail-icon" />
                            <div>
                              <span className="listing-detail-value">{selectedListing.yearBuilt}</span>
                              <span className="listing-detail-label">Year Built</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="listing-modal-section">
                        <h4 className="listing-modal-section-title">Description</h4>
                        <p className="listing-modal-desc">{selectedListing.fullDescription || selectedListing.description}</p>
                      </div>

                      {selectedListing.amenities?.length > 0 && (
                        <div className="listing-modal-section">
                          <h4 className="listing-modal-section-title">Amenities & Features</h4>
                          <div className="listing-modal-amenities">
                            {selectedListing.amenities.map((a: string, i: number) => (
                              <span key={i} className="listing-amenity-tag">{a}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="listing-modal-meta">
                        <span>Type: <strong>{selectedListing.type}</strong></span>
                        <span>Listed: <strong>{selectedListing.listedDate || 'Recently'}</strong></span>
                      </div>
                    </div>

                    <div className="listing-modal-agent-card">
                      <img
                        src={selectedListing.agentAvatar}
                        alt={selectedListing.agentName}
                        className="listing-modal-agent-avatar"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          const agentId = selectedListing.originalPost?.userId;
                          if (agentId) { closeListingModal(); navigate(`/profile/${agentId}`); }
                        }}
                      />
                      <h4
                        className="listing-modal-agent-name"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          const agentId = selectedListing.originalPost?.userId;
                          if (agentId) { closeListingModal(); navigate(`/profile/${agentId}`); }
                        }}
                      >{selectedListing.agentName}</h4>
                      <span className="listing-modal-agent-role">Listing Agent</span>
                      <div className="listing-modal-agent-rating">
                        <RatingStars rating={selectedListing.agentRating} />
                        <span>{selectedListing.agentRating} Stars</span>
                      </div>
                      {selectedListing.agentPhone && selectedListing.agentPhone !== 'N/A' && (
                        <p className="listing-modal-agent-phone">
                          <FaPhoneAlt size={11} /> {selectedListing.agentPhone}
                        </p>
                      )}
                      <button className="listing-modal-inquire-btn" onClick={() => handleInquire(selectedListing)}>
                        INQUIRE NOW →
                      </button>
                      <div className="listing-modal-share-wrapper">
                        <button className="listing-modal-share-btn" onClick={() => setShowShareSocials(!showShareSocials)}>
                          <FaShare size={12} /> Share Listing
                        </button>
                        <div className={`listing-modal-share-socials ${showShareSocials ? 'show' : ''}`}>
                          <button
                            className="modal-social-btn modal-social-fb"
                            title="Share to Facebook"
                            onClick={() => {
                              const url = window.location.href;
                              window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(`${selectedListing.title} - ${selectedListing.price} in ${selectedListing.location}`)}`, '_blank', 'width=600,height=400');
                            }}
                          >
                            <FaFacebookF size={14} />
                          </button>
                          <button
                            className="modal-social-btn modal-social-tw"
                            title="Share to X (Twitter)"
                            onClick={() => {
                              const url = window.location.href;
                              const text = `Check out this listing: ${selectedListing.title} - ${selectedListing.price} in ${selectedListing.location}`;
                              window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
                            }}
                          >
                            <FaTwitter size={14} />
                          </button>
                          <button
                            className="modal-social-btn modal-social-ig"
                            title="Share to Instagram"
                            onClick={() => {
                              navigator.clipboard.writeText(`${selectedListing.title} - ${selectedListing.price} in ${selectedListing.location}\n${window.location.href}`);
                              glassToast.success('Link copied! Paste it on Instagram.');
                            }}
                          >
                            <FaInstagram size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeModalTab === 'map' && (
                  <div className="listing-modal-map-container">
                    <div className="listing-modal-map-header">
                      <div>
                        <h3 className="listing-modal-map-title">
                          <FaMapMarkerAlt size={14} /> {selectedListing.location}, Bacolod City
                        </h3>
                        <p className="listing-modal-map-subtitle">Approximate property location</p>
                      </div>
                      <div className="listing-modal-map-toggle">
                        <button className={`map-style-btn ${mapStyle === 'street' ? 'map-style-btn-active' : ''}`} onClick={() => setMapStyle('street')}>Map</button>
                        <button className={`map-style-btn ${mapStyle === 'satellite' ? 'map-style-btn-active' : ''}`} onClick={() => setMapStyle('satellite')}>Satellite</button>
                      </div>
                    </div>
                    <div className="listing-modal-map-wrapper">
                      <MapContainer center={listingCoords} zoom={15} style={{ width: '100%', height: '100%', borderRadius: '16px' }} scrollWheelZoom={true} key={`${selectedListing.id}-${mapStyle}`}>
                        {mapStyle === 'street' ? (
                          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        ) : (
                          <TileLayer attribution='&copy; <a href="https://www.esri.com/">Esri</a>' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                        )}
                        <Marker position={listingCoords}>
                          <Popup><strong>{selectedListing.title}</strong><br />{selectedListing.location}, Bacolod City<br />{selectedListing.price}</Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  </div>
                )}

                {activeModalTab === 'calculator' && (
                  <div className="listing-modal-calculator-container">
                    <div className="listing-modal-calc-header">
                      <h3 className="listing-modal-calc-title"><FaCalculator size={14} /> Mortgage Calculator</h3>
                      <p className="listing-modal-calc-subtitle">Estimate your monthly payments for <strong>{selectedListing.title}</strong></p>
                    </div>
                    <div className="listing-modal-calc-body">
                      <div className="listing-modal-calc-inputs">
                        <div className="calc-input-group">
                          <label className="calc-label">Property Price</label>
                          <div className="calc-value-display">₱{propertyPrice.toLocaleString()}</div>
                        </div>
                        <div className="calc-input-group">
                          <label className="calc-label">Down Payment (%)</label>
                          <div className="calc-input-row">
                            <input
                              type="number"
                              min="10"
                              max="50"
                              step="1"
                              value={mortgageDownPayment}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setMortgageDownPayment(v >= 0 ? v : 0);
                              }}
                              className={`calc-number-input ${downPaymentError ? 'calc-input-error' : ''}`}
                            />
                            <span className="calc-input-suffix">%</span>
                          </div>
                          {downPaymentError
                            ? <span className="calc-validation-error">{downPaymentError}</span>
                            : !hasValidationError && mortgage && <span className="calc-input-hint">₱{mortgage.downPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })} down payment</span>
                          }
                        </div>
                        <div className="calc-input-group">
                          <label className="calc-label">Interest Rate (%)</label>
                          <div className="calc-input-row">
                            <input
                              type="number"
                              min="3"
                              max="12"
                              step="0.1"
                              value={mortgageRate}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setMortgageRate(v >= 0 ? v : 0);
                              }}
                              className={`calc-number-input ${rateError ? 'calc-input-error' : ''}`}
                            />
                            <span className="calc-input-suffix">%</span>
                          </div>
                          {rateError && <span className="calc-validation-error">{rateError}</span>}
                        </div>
                        <div className="calc-input-group">
                          <label className="calc-label">Loan Term (Years)</label>
                          <div className="calc-input-row">
                            <input
                              type="number"
                              min="5"
                              max="30"
                              step="1"
                              value={mortgageTerm}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setMortgageTerm(v >= 0 ? v : 0);
                              }}
                              className={`calc-number-input ${termError ? 'calc-input-error' : ''}`}
                            />
                            <span className="calc-input-suffix">yrs</span>
                          </div>
                          {termError && <span className="calc-validation-error">{termError}</span>}
                        </div>
                      </div>
                      <div className="listing-modal-calc-results">
                        {hasValidationError ? (
                          <div className="calc-result-card" style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
                            <span className="calc-result-label" style={{ color: '#ef4444' }}>Please fix the input errors above to see results.</span>
                          </div>
                        ) : mortgage ? (
                          <>
                            <div className="calc-result-card calc-result-primary">
                              <span className="calc-result-label">Monthly Payment</span>
                              <span className="calc-result-value">₱{mortgage.monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="calc-result-card">
                              <span className="calc-result-label">Loan Amount</span>
                              <span className="calc-result-value-sm">₱{mortgage.principal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="calc-result-card">
                              <span className="calc-result-label">Down Payment</span>
                              <span className="calc-result-value-sm">₱{mortgage.downPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="calc-result-card">
                              <span className="calc-result-label">Total Interest</span>
                              <span className="calc-result-value-sm">₱{mortgage.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="calc-result-card">
                              <span className="calc-result-label">Total Payment</span>
                              <span className="calc-result-value-sm">₱{mortgage.totalPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                          </>
                        ) : null}
                        <div className="calc-disclaimer" style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                          <strong>Disclaimer:</strong>
                          <p style={{ margin: '6px 0 4px' }}>
                            This mortgage calculator provides estimated monthly payments based on the values entered. The property price reflects the listing price and is not editable. Down payment must be between 10% and 50%. Interest rates must be between 3% and 12%, and loan terms between 5 and 30 years.
                          </p>
                          <p style={{ margin: 0 }}>
                            Actual loan terms, interest rates, and approval are subject to bank policies, credit evaluation, and market conditions. This tool is for informational purposes only and does not constitute a loan offer.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========== MOBILE BOTTOM NAV ========== */}
      <div className="dash-mobile-nav">
        <div className="dash-mobile-nav-item" onClick={() => navigate("/dashboard")}>
          <FaHome size={22} /><span>Home</span>
        </div>
        
        <div className="dash-mobile-nav-item" onClick={() => navigate("/messages")}>
          <FaEnvelope size={22} /><span>Messages</span>
        </div>

        {canAccessTrash(userData?.role, user?.email) && (
          <div className="dash-mobile-nav-item" onClick={() => navigate("/archive")}>
            <FaTrash size={22} /><span>Trash</span>
          </div>
        )}

        <div className="dash-mobile-nav-item active" onClick={() => navigate("/profile")}>
          <FaUser size={22} /><span>Profile</span>
        </div>
      </div>
    </div>
  );
}