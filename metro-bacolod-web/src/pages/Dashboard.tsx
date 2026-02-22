import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { signOut } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, getDocs, addDoc, updateDoc, setDoc, onSnapshot, where } from "firebase/firestore";
import {
  FaSearch, FaUser, FaCog, FaSignOutAlt, FaCaretDown,
  FaImage, FaSpinner, FaHome, FaTrash, FaEnvelope,
  FaPen, FaTimes, FaMapMarkerAlt, FaPlus, FaStar,
  FaStarHalfAlt, FaRegStar, FaShare, FaChevronDown,
  FaChevronLeft, FaChevronRight, FaBed, FaBath, FaRulerCombined,
  FaCalendarAlt, FaPhoneAlt, FaHeart, FaRegHeart,
  FaMap, FaCalculator,
  FaFacebookF, FaTwitter, FaInstagram
} from "react-icons/fa";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import logo from "../assets/MBC Logo.png";
import "../App.css";
import Swal from 'sweetalert2';
import { glassToast } from '../components/GlassToast';
import { BACOLOD_LOCATIONS } from "../constants/locations";
import { canCreateListings, canAccessTrash, canManagePost } from "../constants/roles";
import DOMPurify from 'dompurify';

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

// Bacolod City center
const BACOLOD_CENTER: [number, number] = [10.6840, 122.9510];

// --- Mortgage Calculator ---
function calculateMortgage(propertyPrice: number, downPaymentPercent: number, annualRate: number, termYears: number) {
  const downPayment = propertyPrice * (downPaymentPercent / 100);
  const principal = propertyPrice - downPayment;
  const monthlyRate = annualRate / 100 / 12;
  const totalPayments = termYears * 12;

  if (monthlyRate === 0) {
    return {
      monthlyPayment: principal / totalPayments,
      totalPayment: principal,
      totalInterest: 0,
      principal,
      downPayment,
    };
  }

  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1);
  const totalPayment = monthlyPayment * totalPayments;
  const totalInterest = totalPayment - principal;

  return { monthlyPayment, totalPayment, totalInterest, principal, downPayment };
}

// --- Parse price string to number ---
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

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [posts, setPosts] = useState<any[]>([]);
  const [filterLocation, setFilterLocation] = useState("");

  // --- COMPREHENSIVE LISTING STATE ---
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

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastShown = useRef(false);

  // Edit mode states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [newEditFiles, setNewEditFiles] = useState<File[]>([]);
  const editFileRef = useRef<HTMLInputElement>(null);

  // New filter & modal states
  const [filterPrice, setFilterPrice] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [listingPinCoords, setListingPinCoords] = useState<[number, number] | null>(null);
  const [createMapStyle, setCreateMapStyle] = useState<'street' | 'satellite'>('street');

  // Detail modal state
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'map' | 'calculator'>('details');

  // Mortgage calculator state
  const [mortgageDownPayment, setMortgageDownPayment] = useState(20);
  const [mortgageRate, setMortgageRate] = useState(7);
  const [mortgageTerm, setMortgageTerm] = useState(20);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [showShareSocials, setShowShareSocials] = useState(false);

  // --- SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // --- AUTH CHECK ---
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
            const data = userSnap.data();
            setUserData(data);
            if (data.address) {
              setFilterLocation(data.address);
              fetchPosts(data.address);
            } else {
              fetchPosts("");
            }
          } else {
            fetchPosts("");
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          fetchPosts("");
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const queryText = e.target.value;
    setSearchQuery(queryText);

    if (queryText.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const usersRef = collection(db, "users");
      const snap = await getDocs(usersRef);
      
      // Filter the users in Javascript to allow partial matches (e.g. typing "Wen" finds "Wenard")
      const results = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((u: any) => {
          const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
          const searchLower = queryText.toLowerCase();
          return fullName.includes(searchLower) || u.role?.toLowerCase().includes(searchLower);
        })
        .slice(0, 5); // Only show the top 5 results so the UI doesn't break

      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // --- LISTEN FOR UNREAD MESSAGES ---
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "chats"), where("participants", "array-contains", user.uid));
    const unsub = onSnapshot(q, (snap: any) => {
      let count = 0;
      snap.forEach((doc: any) => {
        if (doc.data().hasUnread?.[user.uid]) count++;
      });
      setUnreadCount(count);
    });
    return () => unsub();
  }, [user]);

  // --- WELCOME TOAST ---
  useEffect(() => {
    if (location.state?.welcome && user && !toastShown.current) {
      const displayName = userData?.firstName
        ? `${userData.firstName} ${userData.lastName}`
        : (user.displayName || 'User');
      glassToast.success(`Welcome back, ${displayName}!`);
      toastShown.current = true;
      window.history.replaceState({}, document.title);
    }
  }, [location, user, userData]);

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return "Just now";
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const fetchPosts = async (locationFilter: string = "") => {
    try {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedPosts = querySnapshot.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data, timeAgo: formatTimeAgo(data.createdAt) };
      });
      let activePosts = fetchedPosts.filter((post: any) => !post.isArchived);
      if (locationFilter && locationFilter !== "All") {
        activePosts = activePosts.filter((post: any) => post.location === locationFilter);
      }
      setPosts(activePosts);
    } catch (error) {
      console.error("Failed to load posts", error);
    }
  };

  const handleFilterChange = (e: any) => {
    const newLocation = e.target.value;
    setFilterLocation(newLocation);
    fetchPosts(newLocation);
  };

  const toggleDropdown = (postId: string) =>
    activeDropdown === postId ? setActiveDropdown(null) : setActiveDropdown(postId);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setImageFiles([...imageFiles, ...Array.from(e.target.files)]);
  };

  const removeImage = (index: number) => {
    const newFiles = [...imageFiles];
    newFiles.splice(index, 1);
    setImageFiles(newFiles);
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
    if (!canCreateListings(userData?.role, user?.email)) return glassToast.error("Only sellers can create listings.");
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

      // --- SECURITY FIX: SANITIZE INPUTS ---
      const safeTitle = DOMPurify.sanitize(listingTitle);
      const safeDescription = DOMPurify.sanitize(listingDescription);
      // ---------------------------------------

      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        userName: userData?.firstName ? `${userData.firstName} ${userData.lastName}` : (user.displayName || "Metro User"),
        userAvatar: user.photoURL,
        userCustomId: userData?.customId || "USER",
        userRole: userData?.role || "Client",
        title: safeTitle,         // <-- Now using the clean, safe title
        content: safeDescription, // <-- Now using the clean, safe description
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
      fetchPosts(filterLocation);
    } catch (error: any) {
      console.error(error);
      glassToast.error("Failed to publish: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const startEdit = (post: any) => {
    setEditingPostId(post.id);
    setEditCaption(post.content);
    setEditImages(post.images || [post.image]);
    setNewEditFiles([]);
    setActiveDropdown(null);
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setNewEditFiles([...newEditFiles, ...Array.from(e.target.files)]);
  };

  const removeEditImage = (index: number) => {
    setEditImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewEditFile = (index: number) => {
    setNewEditFiles(prev => prev.filter((_, i) => i !== index));
  };

  const saveEdit = async () => {
    if (!editingPostId) return;
    if (editImages.length === 0 && newEditFiles.length === 0) return glassToast.warning("Post must have at least one image.");
    setIsUploading(true);
    try {
      // Verify ownership before saving edit
      const postRef = doc(db, "posts", editingPostId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists() || !canManagePost(user?.uid, postSnap.data()?.userId, user?.email, userData?.role)) {
        glassToast.error("You don't have permission to edit this post.");
        setIsUploading(false);
        return;
      }
      const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dg6kzqq5n";
      const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "jdj7tsar";
      const newUrls: string[] = [];
      for (const file of newEditFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        formData.append("cloud_name", CLOUD_NAME);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const data = await response.json();
        if (data.secure_url) newUrls.push(data.secure_url);
      }
      const finalImages = [...editImages, ...newUrls];
      await updateDoc(postRef, { content: editCaption, images: finalImages, image: finalImages[0] });
      glassToast.success("Listing updated!");
      setEditingPostId(null);
      fetchPosts(filterLocation);
    } catch (error) {
      glassToast.error("Failed to update listing");
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    Swal.fire({ title: 'Log Out?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes' })
      .then(async (res) => { if (res.isConfirmed) { await signOut(auth); navigate("/"); } });
  };

  const handleDelete = async (postId: string) => {
    setActiveDropdown(null);
    const result = await Swal.fire({
      title: 'Move to Trash?', text: "Items in trash will be deleted after 30 days.",
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#111827', cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Yes, move to trash'
    });
    if (result.isConfirmed) {
      try {
        const postRef = doc(db, "posts", postId);
        // Verify ownership before deleting
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists() || !canManagePost(user?.uid, postSnap.data()?.userId, user?.email, userData?.role)) {
          glassToast.error("You don't have permission to delete this post.");
          return;
        }
        await updateDoc(postRef, { deletedAt: new Date().toISOString(), isArchived: true });
        setPosts(posts.filter(p => p.id !== postId));
        glassToast.success("Listing moved to Trash");
      } catch (error) { glassToast.error("Failed to move to trash"); }
    }
  };

  const handleShare = async (post: any) => {
    const shareUrl = window.location.href;
    const shareText = `Check out this listing by ${post.agentName || post.userName}: ${post.title || post.content}`;
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

  const handleInquire = async (listing?: any) => {
    if (!listing) return;

    const agentId = listing.originalPost?.userId;
    
    // Prevent messaging yourself
    if (user?.uid === agentId) {
      return glassToast.info("You cannot inquire about your own listing.");
    }

    try {
      // 1. Create a unique, deterministic ID so a Client and Agent only ever share ONE chat room
      const ids = [user.uid, agentId].sort();
      const chatId = `${ids[0]}_${ids[1]}`;
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);

      // 2. If they have never chatted before, create the chat document
      if (!chatSnap.exists()) {
          await setDoc(chatRef, {
              participants: [user.uid, agentId],
              users: {
                  [user.uid]: {
                      name: userData?.firstName ? `${userData.firstName} ${userData.lastName}` : (user.displayName || "User"),
                      avatar: user.photoURL || "https://ui-avatars.com/api/?name=U"
                  },
                  [agentId]: {
                      name: listing.agentName,
                      avatar: listing.agentAvatar
                  }
              },
              lastMessage: `Interested in: ${listing.title}`,
              updatedAt: new Date(),
              hasUnread: {
                  [user.uid]: false, 
                  [agentId]: true 
              }
          });
          // 3. Send an automatic first message on behalf of the client
          await addDoc(collection(db, `chats/${chatId}/messages`), {
              text: `Hi ${listing.agentName}, I am interested in your listing: "${listing.title}" located in ${listing.location}. Is it still available?`,
              senderId: user.uid,
              createdAt: new Date()
          });
      }

      // 4. Teleport the user to the messages page
      navigate('/messages');

    } catch (error) {
      console.error(error);
      glassToast.error("Failed to start chat.");
    }
  };

  const openListingModal = (listing: any) => {
    setSelectedListing(listing);
    setCarouselIndex(0);
    setIsLiked(false);
    setActiveModalTab('details');
    setShowShareSocials(false);
    // Reset mortgage to defaults based on listing price
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

  // --- Build display listings: only real posts ---
  const displayListings = posts.map(post => ({
    id: post.id,
    title: post.title || post.content?.split('\n')[0]?.substring(0, 40) || 'New Listing',
    rooms: post.rooms || 0,
    bathrooms: post.bathrooms || 0,
    lotArea: post.lotArea || 'N/A',
    floorArea: post.floorArea || 'N/A',
    yearBuilt: post.yearBuilt || 0,
    location: post.location || 'Bacolod',
    price: post.price || 'Contact for price',
    description: post.content || 'No description provided.',
    fullDescription: post.content || 'No description provided.',
    amenities: post.amenities || [],
    agentName: post.userName || 'Unknown Agent',
    agentRating: 4.0,
    agentPhone: post.phone || 'N/A',
    agentAvatar: post.userAvatar || 'https://ui-avatars.com/api/?name=U&rounded=true',
    image: post.images?.[0] || post.image || '',
    images: post.images || (post.image ? [post.image] : []),
    status: post.status || 'For Sale',
    type: post.type || 'Property',
    pinCoords: post.pinCoords || null,
    listedDate: post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
    originalPost: post,
  }));

  return (
    <div className="dashboard-revamp">

      {/* ========== NAVBAR ========== */}
      <nav className="dash-nav">
        <div className="dash-nav-left">
          <img src={logo} alt="MBC" className="dash-logo" />
          <div className="dash-search-wrapper" style={{ position: 'relative' }}>
            <FaSearch className="dash-search-icon" />
            <input 
              type="text" 
              placeholder="Search people..." 
              className="dash-search-input" 
              value={searchQuery}
              onChange={handleSearch}
            />
            
            {/* --- LIVE SEARCH DROPDOWN --- */}
            {searchQuery.trim().length > 0 && (
              <div style={{ position: 'absolute', top: '110%', left: 0, width: '100%', background: 'white', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                {isSearching ? (
                  <div style={{ padding: '15px', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>Searching...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(result => (
                    <div 
                      key={result.id} 
                      onClick={() => {
                        navigate(`/profile/${result.id}`);
                        setSearchQuery(""); // Clear search after clicking
                      }}
                      style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', transition: '0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <img 
                        src={result.photoURL || `https://ui-avatars.com/api/?name=${result.firstName}+${result.lastName}`} 
                        style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover' }} 
                        alt="avatar" 
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#111' }}>
                          {result.firstName} {result.lastName}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>
                          {result.role} • {result.customId}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '15px', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>No users found.</div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="dash-nav-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          {/* --- DESKTOP MESSAGES ICON --- */}
          <div 
            onClick={() => navigate('/messages')} 
            style={{ cursor: 'pointer', color: '#4b5563', display: 'flex', alignItems: 'center', transition: '0.2s', position: 'relative' }} 
            title="Messages"
            className="desktop-msg-icon"
          >
            <FaEnvelope size={22} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '-5px', right: '-8px', background: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                {unreadCount}
              </span>
            )}
          </div>

          <div className="dash-user-trigger" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <div className="dash-user-text">
              <span className="dash-user-name">
                {userData?.firstName ? `${userData.firstName} ${userData.lastName}` : (user?.displayName || 'Loading...')}
              </span>
              <span className="dash-user-role">{userData?.role || 'Client'}</span>
            </div>
            <img
              src={user?.photoURL || 'https://ui-avatars.com/api/?name=User&background=e5e7eb&color=9ca3af&rounded=true'}
              alt="avatar"
              className="dash-avatar"
            />
          </div>
          {isDropdownOpen && (
            <div className="dash-dropdown">
              <div className="dash-dropdown-item" onClick={() => { navigate('/profile'); setIsDropdownOpen(false); }}><FaUser /> Profile</div>
              <div className="dash-dropdown-item" onClick={() => { navigate('/settings'); setIsDropdownOpen(false); }}><FaCog /> Settings</div>
              {canAccessTrash(userData?.role, user?.email) && (
                <div className="dash-dropdown-item" onClick={() => { navigate('/archive'); setIsDropdownOpen(false); }}><FaTrash /> Trash</div>
              )}
              <div className="dash-dropdown-divider" />
              <div className="dash-dropdown-item dash-dropdown-logout" onClick={handleLogout}><FaSignOutAlt /> Logout</div>
            </div>
          )}
        </div>
      </nav>

      {/* ========== MAIN CONTENT ========== */}
      <div className="dash-content">

        {/* FILTER BAR */}
        <div className="dash-filters-bar">
          <div className="dash-filters-group">
            <div className="dash-filter-pill">
              <select value={filterLocation} onChange={handleFilterChange}>
                <option value="">Location</option>
                <option value="All">All</option>
                {BACOLOD_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
              <FaChevronDown className="pill-arrow" />
            </div>
            <div className="dash-filter-pill">
              <select value={filterPrice} onChange={(e) => setFilterPrice(e.target.value)}>
                <option value="">Price</option>
                <option value="under1m">Under 1M</option>
                <option value="1m-3m">1M - 3M</option>
                <option value="3m-5m">3M - 5M</option>
                <option value="over5m">Over 5M</option>
              </select>
              <FaChevronDown className="pill-arrow" />
            </div>
            <div className="dash-filter-pill">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Status</option>
                <option value="For Sale">For Sale</option>
                <option value="Pre-Selling">Pre-Selling</option>
                <option value="RFO">Ready for Occupancy</option>
                <option value="For Lease">For Lease</option>
              </select>
              <FaChevronDown className="pill-arrow" />
            </div>
            <div className="dash-filter-pill">
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">Type</option>
                <option value="House & Lot">House & Lot</option>
                <option value="Lot Only">Lot Only</option>
                <option value="Condo">Condo</option>
                <option value="Commercial">Commercial</option>
              </select>
              <FaChevronDown className="pill-arrow" />
            </div>
          </div>
          <button className="dash-search-btn" onClick={() => fetchPosts(filterLocation)}>Search</button>
        </div>

        {/* ========== LISTINGS GRID ========== */}
        <div className="dash-listings-grid">
          {displayListings.length === 0 ? (
            <p className="no-listings-msg">No listings found. Try adjusting your filters.</p>
          ) : (
            displayListings.map((listing: any) => (
              <div className="glass-listing-card" key={listing.id} onClick={() => openListingModal(listing)} style={{ cursor: 'pointer' }}>
                {/* Card Info - Left */}
                <div className="glass-card-content">
                  <div>
                    <h3 className="glass-card-title">
                      {listing.title}
                      {listing.rooms > 0 && <><br /><span className="glass-card-rooms">{listing.rooms} rooms</span></>}
                    </h3>
                    <ul className="glass-card-bullets">
                      <li>→ {listing.location} Location</li>
                      <li>→ {formatPriceDisplay(listing.price)}</li>
                    </ul>
                    <p className="glass-card-desc">{listing.description}</p>
                  </div>
                  <div className="glass-card-footer">
                    <div className="glass-card-agent">
                      <img src={listing.agentAvatar} alt={listing.agentName} />
                      <div className="agent-meta">
                        <span
                          className="agent-name agent-name-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            const agentId = listing.originalPost?.userId;
                            if (agentId) navigate(`/profile/${agentId}`);
                          }}
                        >
                          {listing.agentName}
                        </span>
                        <span className="agent-rating-row">
                          <RatingStars rating={listing.agentRating} />
                          <span className="agent-rating-text">{listing.agentRating} Stars</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Right - Image + Inquire */}
                <div className="glass-card-right">
                  <div className="glass-card-image">
                    {listing.image && <img src={listing.image} alt={listing.title} />}
                  </div>
                  <button className="glass-inquire-btn" onClick={(e) => { e.stopPropagation(); handleInquire(listing); }}>
                    INQUIRE NOW →
                </button>
                </div>

                {/* Owner Actions (only for posts owned by user) */}
                {canManagePost(user?.uid, listing.originalPost?.userId, user?.email, userData?.role) && (
                  <div className="glass-card-actions">
                    <button onClick={(e) => { e.stopPropagation(); toggleDropdown(listing.id); }} className="glass-dots-btn">&#8942;</button>
                    {activeDropdown === listing.id && (
                      <div className="glass-action-dropdown">
                        <button onClick={(e) => { e.stopPropagation(); startEdit(listing.originalPost); }}><FaPen size={11} /> Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); handleShare(listing); }} className="glass-share-btn"><FaShare size={11} /> Share</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(listing.id); }} className="glass-delete-btn"><FaTrash size={11} /> Delete</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ========== AGENT FAB ========== */}
      {canCreateListings(userData?.role, user?.email) && (
        <button className="agent-fab" onClick={() => setShowCreateModal(true)} title="Create Listing">
          <FaPlus size={20} />
        </button>
      )}

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

      {/* ========== EDIT POST MODAL ========== */}
      {editingPostId && (
        <div className="dash-modal-overlay" onClick={() => setEditingPostId(null)}>
          <div className="dash-modal-card" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h2>Edit Listing</h2>
              <FaTimes className="dash-modal-close" onClick={() => setEditingPostId(null)} />
            </div>
            <textarea
              className="dash-modal-textarea"
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
            />
            <div className="dash-modal-previews">
              {editImages.map((img, i) => (
                <div key={i} className="dash-modal-preview-item">
                  <img src={img} alt="" />
                  <button onClick={() => removeEditImage(i)} className="dash-preview-remove">&#215;</button>
                </div>
              ))}
              {newEditFiles.map((file, i) => (
                <div key={`new-${i}`} className="dash-modal-preview-item new-file">
                  <img src={URL.createObjectURL(file)} alt="" />
                  <button onClick={() => removeNewEditFile(i)} className="dash-preview-remove">&#215;</button>
                </div>
              ))}
            </div>
            <div className="dash-modal-actions">
              <button onClick={() => editFileRef.current?.click()} className="dash-modal-action-btn"><FaImage /> Add Photos</button>
              <input type="file" ref={editFileRef} hidden accept="image/*" multiple onChange={handleEditFileSelect} />
            </div>
            <div className="dash-modal-footer-btns">
              <button onClick={() => setEditingPostId(null)} className="dash-modal-cancel">Cancel</button>
              <button onClick={saveEdit} disabled={isUploading} className="dash-modal-publish" style={{ flex: 1 }}>
                {isUploading ? 'Saving...' : 'Save Changes'}
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

        // Validation
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
                      {/* Title & Price */}
                      <div className="listing-modal-title-row">
                        <div>
                          <h2 className="listing-modal-title">{selectedListing.title}</h2>
                          <p className="listing-modal-location">
                            <FaMapMarkerAlt size={12} /> {selectedListing.location}, Bacolod City
                          </p>
                        </div>
                        <div className="listing-modal-price">{formatPriceDisplay(selectedListing.price)}</div>
                      </div>

                      {/* Property Details Grid */}
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

                      {/* Description */}
                      <div className="listing-modal-section">
                        <h4 className="listing-modal-section-title">Description</h4>
                        <p className="listing-modal-desc">{selectedListing.fullDescription || selectedListing.description}</p>
                      </div>

                      {/* Amenities */}
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

                      {/* Listing Info */}
                      <div className="listing-modal-meta">
                        <span>Type: <strong>{selectedListing.type}</strong></span>
                        <span>Listed: <strong>{selectedListing.listedDate || 'Recently'}</strong></span>
                      </div>
                    </div>

                    {/* Agent Sidebar */}
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
                              window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(`${selectedListing.title} - ${formatPriceDisplay(selectedListing.price)} in ${selectedListing.location}`)}`, '_blank', 'width=600,height=400');
                            }}
                          >
                            <FaFacebookF size={14} />
                          </button>
                          <button
                            className="modal-social-btn modal-social-tw"
                            title="Share to X (Twitter)"
                            onClick={() => {
                              const url = window.location.href;
                              const text = `Check out this listing: ${selectedListing.title} - ${formatPriceDisplay(selectedListing.price)} in ${selectedListing.location}`;
                              window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
                            }}
                          >
                            <FaTwitter size={14} />
                          </button>
                          <button
                            className="modal-social-btn modal-social-ig"
                            title="Share to Instagram"
                            onClick={() => {
                              navigator.clipboard.writeText(`${selectedListing.title} - ${formatPriceDisplay(selectedListing.price)} in ${selectedListing.location}\n${window.location.href}`);
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
                        <button
                          className={`map-style-btn ${mapStyle === 'street' ? 'map-style-btn-active' : ''}`}
                          onClick={() => setMapStyle('street')}
                        >
                          Map
                        </button>
                        <button
                          className={`map-style-btn ${mapStyle === 'satellite' ? 'map-style-btn-active' : ''}`}
                          onClick={() => setMapStyle('satellite')}
                        >
                          Satellite
                        </button>
                      </div>
                    </div>
                    <div className="listing-modal-map-wrapper">
                      <MapContainer
                        center={listingCoords}
                        zoom={15}
                        style={{ width: '100%', height: '100%', borderRadius: '16px' }}
                        scrollWheelZoom={true}
                        key={`${selectedListing.id}-${mapStyle}`}
                      >
                        {mapStyle === 'street' ? (
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                        ) : (
                          <TileLayer
                            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                          />
                        )}
                        <Marker position={listingCoords}>
                          <Popup>
                            <strong>{selectedListing.title}</strong><br />
                            {selectedListing.location}, Bacolod City<br />
                            {formatPriceDisplay(selectedListing.price)}
                          </Popup>
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
                          <label className="calc-label">Property Price (₱)</label>
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
                            This mortgage calculator provides estimated monthly payments based on the listing price. Down payment must be between 10% and 50%. Interest rates must be between 3% and 12%, and loan terms between 5 and 30 years.
                          </p>
                          <p style={{ margin: 0 }}>
                            The property price reflects the listing price and cannot be edited. Actual loan terms, interest rates, and approval are subject to bank policies, credit evaluation, and market conditions. This tool is for informational purposes only and does not constitute a loan offer.
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
        <div onClick={() => navigate('/dashboard')} className="dash-mobile-nav-item active">
          <FaHome size={22} /><span>Home</span>
        </div>
        
        {/* --- ADDED MESSAGES FOR MOBILE --- */}
        <div onClick={() => navigate('/messages')} className="dash-mobile-nav-item">
          <div style={{ position: 'relative' }}>
            <FaEnvelope size={22} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '-2px', right: '-10px', background: '#ef4444', color: 'white', fontSize: '0.6rem', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                {unreadCount}
              </span>
            )}
          </div>
          <span>Messages</span>
        </div>

        {canAccessTrash(userData?.role, user?.email) && (
          <div onClick={() => navigate('/archive')} className="dash-mobile-nav-item">
            <FaTrash size={22} /><span>Trash</span>
          </div>
        )}
        <div onClick={() => navigate('/profile')} className="dash-mobile-nav-item">
          <FaUser size={22} /><span>Profile</span>
        </div>
      </div>
    </div>
  );
}