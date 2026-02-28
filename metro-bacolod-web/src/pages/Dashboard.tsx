import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { SkeletonCard } from "../components/SkeletonLoader";
import { signOut } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, getDocs, addDoc, updateDoc, setDoc, onSnapshot, where, arrayUnion, arrayRemove } from "firebase/firestore";
import {
  FaSearch, FaUser, FaCog, FaSignOutAlt, FaCaretDown,
  FaImage, FaSpinner, FaHome, FaTrash, FaEnvelope,
  FaPen, FaTimes, FaMapMarkerAlt, FaPlus, FaStar,
  FaStarHalfAlt, FaRegStar, FaShare, FaChevronDown,
  FaChevronLeft, FaChevronRight, FaBed, FaBath, FaRulerCombined,
  FaCalendarAlt, FaPhoneAlt, FaHeart, FaRegHeart,
  FaMap, FaCalculator, FaBell, FaBookmark, FaRegBookmark, FaFlag,
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
import { canCreateListings, canAccessTrash, canManagePost, isAdmin, requiresVerification } from "../constants/roles";
import DOMPurify from 'dompurify';

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

function MapClickHandler({ onPin }: { onPin: (coords: [number, number]) => void }) {
  useMapEvents({ click(e) { onPin([e.latlng.lat, e.latlng.lng]); } });
  return null;
}

// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const LOCATION_COORDS: Record<string, [number, number]> = {
  "Alijis": [10.6560, 122.9280], "Banago": [10.7050, 122.9520], "Bata": [10.6870, 122.9580],
  "Cabug": [10.7200, 122.9400], "Estefania": [10.6790, 122.9530], "Felisa": [10.7010, 122.9500],
  "Granada": [10.6720, 122.9350], "Handumanan": [10.6480, 122.9530], "Mandalagan": [10.6920, 122.9430],
  "Mansilingan": [10.6590, 122.9680], "Montevista": [10.6650, 122.9420], "Pahanocoy": [10.6700, 122.9600],
  "Punta Taytay": [10.7100, 122.9630], "Singcang-Airport": [10.6480, 122.9320], "Sum-ag": [10.6370, 122.9400],
  "Taculing": [10.6530, 122.9500], "Tangub": [10.7150, 122.9420], "Villamonte": [10.6750, 122.9500],
  "Vista Alegre": [10.6690, 122.9480],
};
const BACOLOD_CENTER: [number, number] = [10.6840, 122.9510];

async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas failed");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
          } else {
            resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
          }
          URL.revokeObjectURL(img.src);
        }, 'image/jpeg', quality);
      } catch (e) {
        resolve(file); 
      }
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

function calculateMortgage(propertyPrice: number, downPaymentPercent: number, annualRate: number, termYears: number) {
  const downPayment = propertyPrice * (downPaymentPercent / 100);
  const principal = propertyPrice - downPayment;
  const monthlyRate = annualRate / 100 / 12;
  const totalPayments = termYears * 12;
  if (monthlyRate === 0) return { monthlyPayment: principal / totalPayments, totalPayment: principal, totalInterest: 0, principal, downPayment };
  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1);
  const totalPayment = monthlyPayment * totalPayments;
  const totalInterest = totalPayment - principal;
  return { monthlyPayment, totalPayment, totalInterest, principal, downPayment };
}

// 🔥 BUG FIX: Safely parse numbers without crashing if data is weird
function parsePriceToNumber(priceStr: any): number {
  if (!priceStr) return 0;
  const str = String(priceStr).toLowerCase().trim();
  const cleaned = str.replace(/[^0-9.]/g, ' ').trim();
  const parts = cleaned.split(/\s+/);
  const num = parseFloat(parts[0]);
  if (isNaN(num)) return 0;
  if (str.includes('million')) return num * 1_000_000;
  if (str.includes('billion')) return num * 1_000_000_000;
  return num;
}

// 🔥 BUG FIX: Safely format price for display
function formatPriceDisplay(price: any): string {
  if (!price) return 'Contact for price';
  const num = parsePriceToNumber(price);
  if (num <= 0) return String(price);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(num % 1_000_000_000 === 0 ? 0 : 1)} Billion PHP`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1)} Million PHP`;
  return `₱${num.toLocaleString()}`;
}

const POSTS_PER_PAGE = 12;

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [filterLocation, setFilterLocation] = useState("");
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
  const [listingSearchQuery, setListingSearchQuery] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editStatus, setEditStatus] = useState("For Sale");
  const [editType, setEditType] = useState("House & Lot");
  const [editRooms, setEditRooms] = useState("");
  const [editBathrooms, setEditBathrooms] = useState("");
  const [editLotArea, setEditLotArea] = useState("");
  const [editFloorArea, setEditFloorArea] = useState("");
  const [editYearBuilt, setEditYearBuilt] = useState("");
  const [editAmenities, setEditAmenities] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [newEditFiles, setNewEditFiles] = useState<File[]>([]);
  const editFileRef = useRef<HTMLInputElement>(null);
  const [filterPrice, setFilterPrice] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [listingPinCoords, setListingPinCoords] = useState<[number, number] | null>(null);
  const [createMapStyle, setCreateMapStyle] = useState<'street' | 'satellite'>('street');
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'map' | 'calculator'>('details');
  const [mortgageDownPayment, setMortgageDownPayment] = useState(20);
  const [mortgageRate, setMortgageRate] = useState(7);
  const [mortgageTerm, setMortgageTerm] = useState(20);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [showShareSocials, setShowShareSocials] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [agentRatings, setAgentRatings] = useState<Record<string, number>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const listingId = searchParams.get('listing');
    if (listingId && posts.length > 0) {
      const listing = posts.find((p: any) => p.id === listingId);
      if (listing) { setSelectedListing(listing); setCarouselIndex(0); setSearchParams({}, { replace: true }); }
    }
  }, [searchParams, posts]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) navigate("/");
      else {
        setUser(currentUser);
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) setUserData(userSnap.data());
        } catch (err) { console.error(err); }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const queryText = e.target.value;
    setSearchQuery(queryText);
    if (queryText.trim().length === 0) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((u: any) => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        return fullName.includes(queryText.toLowerCase()) || u.role?.toLowerCase().includes(queryText.toLowerCase());
      }).slice(0, 5);
      setSearchResults(results);
    } catch (error) { console.error(error); } finally { setIsSearching(false); }
  };

  const fetchAgentRating = async (agentId: string) => {
    try {
      const reviewsSnap = await getDocs(collection(db, `users/${agentId}/reviews`));
      if (reviewsSnap.empty) return 0;
      let total = 0;
      reviewsSnap.forEach(d => { total += d.data().rating || 0; });
      const avg = Math.round((total / reviewsSnap.size) * 10) / 10;
      setAgentRatings(prev => ({ ...prev, [agentId]: avg }));
      return avg;
    } catch { return 0; }
  };

  const handleRateAgent = async (agentId: string, agentName: string) => {
    if (!user) return;
    if (user.uid === agentId) return glassToast.info("You can't rate yourself.");
    const { value: rating } = await Swal.fire({
      title: `Rate ${agentName}`,
      html: `<div style="display:flex;gap:8px;justify-content:center;margin:16px 0;">${[1,2,3,4,5].map(n => `<span class="swal-star" data-val="${n}" style="font-size:2rem;cursor:pointer;color:#9ca3af;transition:color 0.2s;">★</span>`).join('')}</div><p id="swal-rating-label" style="font-size:0.9rem;color:#6b7280;margin:0;">Select a rating</p>`,
      showCancelButton: true, confirmButtonText: 'Submit', confirmButtonColor: '#111827',
      didOpen: () => {
        let selected = 0; const stars = document.querySelectorAll('.swal-star'); const label = document.getElementById('swal-rating-label'); const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
        stars.forEach((s: any) => { s.addEventListener('click', () => { selected = parseInt(s.dataset.val); stars.forEach((st: any) => { st.style.color = parseInt(st.dataset.val) <= selected ? '#f59e0b' : '#9ca3af'; }); if (label) label.textContent = labels[selected] || ''; (Swal.getConfirmButton() as any).dataset.rating = selected; }); });
      },
      preConfirm: () => { const r = parseInt((Swal.getConfirmButton() as any)?.dataset?.rating || '0'); if (!r) { Swal.showValidationMessage('Please select a rating'); return false; } return r; }
    });
    if (!rating) return;
    try {
      await setDoc(doc(db, `users/${agentId}/reviews`, user.uid), { rating, reviewerId: user.uid, reviewerName: userData?.firstName ? `${userData.firstName} ${userData.lastName}` : (user.displayName || "User"), createdAt: new Date().toISOString() });
      glassToast.success(`Rated ${agentName} ${rating} stars!`);
      fetchAgentRating(agentId);
      await addDoc(collection(db, "notifications"), { userId: agentId, message: `${userData?.firstName || user.displayName || 'Someone'} rated you ${rating} stars!`, link: '/profile', read: false, createdAt: new Date().toISOString() });
    } catch { glassToast.error("Failed to submit rating."); }
  };

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(query(collection(db, "chats"), where("participants", "array-contains", user.uid)), (snap: any) => {
      let count = 0; snap.forEach((doc: any) => { if (doc.data().hasUnread?.[user.uid]) count++; }); setUnreadCount(count);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(query(collection(db, "notifications"), where("userId", "==", user.uid), orderBy("createdAt", "desc")), (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const markNotificationRead = async (notifId: string) => {
    try { await updateDoc(doc(db, "notifications", notifId), { read: true }); } catch { }
  };

  const unreadNotifCount = notifications.filter((n: any) => !n.read).length;

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return "Just now";
    const now = new Date(); const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24); if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(query(collection(db, "posts"), orderBy("createdAt", "desc")), (snapshot) => {
      const fetchedPosts = snapshot.docs.map(d => { const data = d.data(); return { id: d.id, ...data, timeAgo: formatTimeAgo(data.createdAt) }; });
      const activePosts = fetchedPosts.filter((post: any) => !post.isArchived);
      setPosts(activePosts);
      setIsLoadingPosts(false);
      const agentIds = [...new Set(activePosts.map((p: any) => p.userId).filter(Boolean))];
      agentIds.forEach(id => fetchAgentRating(id));
    });
    return () => unsub();
  }, [user]);

  const handleFilterChange = (e: any) => { setFilterLocation(e.target.value); setVisibleCount(POSTS_PER_PAGE); };
  const toggleDropdown = (postId: string) => activeDropdown === postId ? setActiveDropdown(null) : setActiveDropdown(postId);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setImageFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    e.target.value = '';
  };
  const removeImage = (index: number) => { setImageFiles(prev => prev.filter((_, i) => i !== index)); };

  const resetCreateForm = () => {
    setListingTitle(""); setListingDescription(""); setListingPrice(""); setListingLocation("");
    setListingStatus("For Sale"); setListingType("House & Lot"); setListingRooms(""); setListingBathrooms("");
    setListingLotArea(""); setListingFloorArea(""); setListingYearBuilt(""); setListingAmenities("");
    setImageFiles([]); setListingPinCoords(null); setCreateMapStyle('street');
  };

  const handleCreateListing = async () => {
    if (!canCreateListings(userData?.role, user?.email)) return glassToast.error("Only sellers and agents can create listings.");
    if (requiresVerification(userData?.role) && !userData?.isVerified) {
      return glassToast.error("Your account is pending verification. An admin must verify your identity before you can post listings.");
    }
    if (!listingTitle.trim() || !listingLocation || !listingPrice.trim() || imageFiles.length === 0 || !listingPinCoords) {
      return glassToast.warning("Please fill all required fields and pin the location.");
    }

    setIsUploading(true);

    try {
      const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      
      if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error("Missing Cloudinary configuration in .env");
      }

      const uploadPromises = imageFiles.map(async (file) => {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append("file", compressed);
        formData.append("upload_preset", UPLOAD_PRESET);
        formData.append("cloud_name", CLOUD_NAME);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        if (!response.ok) throw new Error(`Failed to upload image`);
        const data = await response.json();
        return data.secure_url;
      });

      const imageUrls = await Promise.all(uploadPromises);
      const amenitiesArray = listingAmenities.split(",").map((a) => a.trim()).filter((a) => a.length > 0);
      const safeTitle = DOMPurify.sanitize(listingTitle);
      const safeDescription = DOMPurify.sanitize(listingDescription);

      await addDoc(collection(db, "posts"), {
        userId: user.uid, 
        userName: userData?.firstName ? `${userData.firstName} ${userData.lastName}` : (user.displayName || "Metro User"),
        userAvatar: user.photoURL, 
        userCustomId: userData?.customId || "USER", 
        userRole: userData?.role || "Client", 
        userPhone: userData?.mobile || "N/A",
        title: safeTitle, 
        content: safeDescription, 
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

      glassToast.success("Listing published!"); resetCreateForm(); setShowCreateModal(false);
    } catch (error: any) { 
      glassToast.error(error.message || "Failed to publish listing."); 
    } 
    finally { setIsUploading(false); }
  };

  const startEdit = (post: any) => { setEditingPostId(post.id); setEditTitle(post.title || ''); setEditCaption(post.content || ''); setEditPrice(post.price?.toString() || ''); setEditLocation(post.location || ''); setEditStatus(post.status || 'For Sale'); setEditType(post.type || 'House & Lot'); setEditRooms(post.rooms?.toString() || ''); setEditBathrooms(post.bathrooms?.toString() || ''); setEditLotArea(post.lotArea || ''); setEditFloorArea(post.floorArea || ''); setEditYearBuilt(post.yearBuilt?.toString() || ''); setEditAmenities(Array.isArray(post.amenities) ? post.amenities.join(', ') : post.amenities || ''); setEditImages(post.images || [post.image]); setNewEditFiles([]); setActiveDropdown(null); };
  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) setNewEditFiles([...newEditFiles, ...Array.from(e.target.files)]); };
  const removeEditImage = (index: number) => { setEditImages(prev => prev.filter((_, i) => i !== index)); };
  const removeNewEditFile = (index: number) => { setNewEditFiles(prev => prev.filter((_, i) => i !== index)); };

  const saveEdit = async () => {
    if (!editingPostId) return;
    if (editImages.length === 0 && newEditFiles.length === 0) return glassToast.warning("Post must have at least one image.");
    setIsUploading(true);
    try {
      const postRef = doc(db, "posts", editingPostId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists() || !canManagePost(user?.uid, postSnap.data()?.userId, user?.email, userData?.role)) {
        glassToast.error("You don't have permission to edit this post."); setIsUploading(false); return;
      }
      const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      const newUrls: string[] = [];
      for (const file of newEditFiles) {
        const formData = new FormData(); formData.append("file", file); formData.append("upload_preset", UPLOAD_PRESET); formData.append("cloud_name", CLOUD_NAME);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const data = await response.json(); if (data.secure_url) newUrls.push(data.secure_url);
      }
      const finalImages = [...editImages, ...newUrls];
      await updateDoc(postRef, { title: editTitle, content: editCaption, price: editPrice, location: editLocation, status: editStatus, type: editType, rooms: editRooms, bathrooms: editBathrooms, lotArea: editLotArea, floorArea: editFloorArea, yearBuilt: editYearBuilt, amenities: editAmenities.split(",").map((a) => a.trim()).filter(Boolean), images: finalImages, image: finalImages[0] });
      glassToast.success("Listing updated!"); setEditingPostId(null);
    } catch (error) { glassToast.error("Failed to update listing"); } 
    finally { setIsUploading(false); }
  };

  const handleLogout = () => {
    Swal.fire({ title: 'Log Out?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes' }).then(async (res) => { if (res.isConfirmed) { await signOut(auth); navigate("/"); } });
  };

  const handleDelete = async (postId: string) => {
    setActiveDropdown(null);
    const result = await Swal.fire({ title: 'Move to Trash?', text: "Items in trash will be deleted after 30 days.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#111827', cancelButtonColor: '#9ca3af', confirmButtonText: 'Yes, move to trash' });
    if (result.isConfirmed) {
      try {
        const postRef = doc(db, "posts", postId);
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists() || !canManagePost(user?.uid, postSnap.data()?.userId, user?.email, userData?.role)) { glassToast.error("You don't have permission to delete this post."); return; }
        await updateDoc(postRef, { deletedAt: new Date().toISOString(), isArchived: true });
        setPosts(posts.filter(p => p.id !== postId));
        glassToast.success("Listing moved to Trash");
      } catch (error) { glassToast.error("Failed to move to trash"); }
    }
  };

  const handleShare = async (post: any) => {
    const shareUrl = `${window.location.origin}/dashboard?listing=${post.id}`; const shareText = `Check out this listing by ${post.agentName || post.userName}: ${post.title || post.content}`;
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
    if (user?.uid === agentId) return glassToast.info("You cannot inquire about your own listing.");
    try {
      const ids = [user.uid, agentId].sort(); const chatId = `${ids[0]}_${ids[1]}`; const chatRef = doc(db, "chats", chatId); const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) {
          await setDoc(chatRef, {
              participants: [user.uid, agentId],
              users: { [user.uid]: { name: userData?.firstName ? `${userData.firstName} ${userData.lastName}` : (user.displayName || "User"), avatar: user.photoURL || "https://ui-avatars.com/api/?name=U" }, [agentId]: { name: listing.agentName, avatar: listing.agentAvatar } },
              lastMessage: `Interested in: ${listing.title}`, updatedAt: new Date(), hasUnread: { [user.uid]: false, [agentId]: true }
          });
          await addDoc(collection(db, `chats/${chatId}/messages`), { text: `Hi ${listing.agentName}, I am interested in your listing: "${listing.title}". Is it still available?`, senderId: user.uid, createdAt: new Date() });
      }
      navigate('/messages');
    } catch { glassToast.error("Failed to start chat."); }
  };

  const openListingModal = (listing: any) => {
    setSelectedListing(listing); setCarouselIndex(0);
    const likedBy = listing.originalPost?.likedBy || [];
    setIsLiked(user?.uid ? likedBy.includes(user.uid) : false);
    setActiveModalTab('details'); setShowShareSocials(false); setMortgageDownPayment(20); setMortgageRate(7); setMortgageTerm(20); setMapStyle('street');
  };

  const handleToggleLike = async () => {
    if (!user?.uid || !selectedListing?.id) return;
    const postRef = doc(db, "posts", selectedListing.id);
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    try {
      if (newLiked) {
        await updateDoc(postRef, { likedBy: arrayUnion(user.uid) });
        const ownerId = selectedListing.originalPost?.userId;
        if (ownerId && ownerId !== user.uid) await addDoc(collection(db, "notifications"), { userId: ownerId, message: `${userData?.firstName || user.displayName || 'Someone'} liked your listing "${selectedListing.title}"`, link: '/dashboard', read: false, createdAt: new Date().toISOString() });
      } else {
        await updateDoc(postRef, { likedBy: arrayRemove(user.uid) });
      }
      setPosts(prev => prev.map(p => { if (p.id === selectedListing.id) { const currentLikedBy = p.likedBy || []; return { ...p, likedBy: newLiked ? [...currentLikedBy, user.uid] : currentLikedBy.filter((id: string) => id !== user.uid) }; } return p; }));
    } catch (err) { setIsLiked(!newLiked); }
  };

  const closeListingModal = () => { setSelectedListing(null); setShowShareSocials(false); };

  const handleToggleSave = async (postId: string) => {
    if (!user?.uid) return;
    const postRef = doc(db, "posts", postId);
    try {
      const postSnap = await getDoc(postRef); const savedBy = postSnap.data()?.savedBy || [];
      if (savedBy.includes(user.uid)) { await updateDoc(postRef, { savedBy: arrayRemove(user.uid) }); glassToast.info("Removed from saved."); } 
      else { await updateDoc(postRef, { savedBy: arrayUnion(user.uid) }); glassToast.success("Listing saved!"); }
    } catch { glassToast.error("Failed to save listing."); }
  };

  const handleReport = async (listing: any) => {
    try {
      const existingReports = await getDocs(query(collection(db, "reports"), where("postId", "==", listing.id), where("reportedBy", "==", user.uid)));
      if (!existingReports.empty) { glassToast.info("You've already reported this listing."); return; }
    } catch { /* proceed if check fails */ }
    const { value: reason } = await Swal.fire({
      title: 'Report Listing', input: 'select', inputOptions: { 'misleading': 'Misleading Information', 'inappropriate': 'Inappropriate Content', 'scam': 'Suspected Scam', 'duplicate': 'Duplicate Listing', 'other': 'Other' },
      inputPlaceholder: 'Select a reason', showCancelButton: true, confirmButtonColor: '#111827', confirmButtonText: 'Next',
      inputValidator: (value) => { if (!value) return 'Please select a reason.'; },
    });
    if (!reason) return;
    // Step 2: Ask for description/proof
    const { value: description } = await Swal.fire({
      title: 'Provide Details',
      html: '<p style="font-size:0.85rem;color:#6b7280;margin-bottom:10px">Please describe why you are reporting this listing. Include any evidence or context that supports your report.</p>',
      input: 'textarea',
      inputPlaceholder: 'e.g. The listing photos appear to be from a different property. The price is suspiciously low compared to market value...',
      inputAttributes: { 'aria-label': 'Description', style: 'min-height:120px' },
      showCancelButton: true,
      confirmButtonColor: '#111827',
      confirmButtonText: 'Submit Report',
      inputValidator: (value) => { if (!value || !value.trim()) return 'Please provide a description for your report.'; },
    });
    if (!description) return;
    try {
      await addDoc(collection(db, "reports"), { postId: listing.id, postTitle: listing.title, reportedBy: user.uid, reporterName: userData?.firstName ? `${userData.firstName} ${userData.lastName}` : user.displayName, reason, description: description.trim(), status: 'pending', createdAt: new Date().toISOString() });
      glassToast.success("Report submitted. We'll review it shortly.");
    } catch { glassToast.error("Failed to submit report."); }
  };

  const nextImage = (e: React.MouseEvent) => { e.stopPropagation(); const rawImgs = selectedListing?.images; const imgs = Array.isArray(rawImgs) && rawImgs.length > 0 ? rawImgs : [selectedListing?.image]; setCarouselIndex((prev: number) => (prev + 1) % imgs.length); };
  const prevImage = (e: React.MouseEvent) => { e.stopPropagation(); const rawImgs = selectedListing?.images; const imgs = Array.isArray(rawImgs) && rawImgs.length > 0 ? rawImgs : [selectedListing?.image]; setCarouselIndex((prev: number) => (prev - 1 + imgs.length) % imgs.length); };

  const allListings = posts.map(post => ({
    id: post.id, title: post.title || post.content?.split('\n')[0]?.substring(0, 40) || 'New Listing', rooms: post.rooms || 0, bathrooms: post.bathrooms || 0, lotArea: post.lotArea || 'N/A',
    floorArea: post.floorArea || 'N/A', yearBuilt: post.yearBuilt || 0, location: post.location || 'Bacolod', price: post.price || 'Contact for price',
    description: post.content || 'No description provided.', fullDescription: post.content || 'No description provided.', amenities: post.amenities || [], agentName: post.userName || 'Unknown Agent', agentRating: agentRatings[post.userId] || 0,
    agentPhone: post.userPhone || 'N/A', agentAvatar: post.userAvatar || 'https://ui-avatars.com/api/?name=U&rounded=true', image: post.images?.[0] || post.image || '', images: post.images || (post.image ? [post.image] : []), status: post.status || 'For Sale', type: post.type || 'Property', pinCoords: post.pinCoords || null, listedDate: post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently', originalPost: post,
  }));

  const displayListings = allListings.filter(listing => {
    if (filterLocation && filterLocation !== "All" && listing.location !== filterLocation) return false;
    if (listingSearchQuery.trim()) { const sq = listingSearchQuery.toLowerCase(); if (!listing.title.toLowerCase().includes(sq) && !listing.description.toLowerCase().includes(sq) && !listing.location.toLowerCase().includes(sq) && !listing.agentName.toLowerCase().includes(sq)) return false; }
    if (filterPrice) { const num = parsePriceToNumber(listing.price); if (filterPrice === "under1m" && num >= 1000000) return false; if (filterPrice === "1m-3m" && (num < 1000000 || num > 3000000)) return false; if (filterPrice === "3m-5m" && (num < 3000000 || num > 5000000)) return false; if (filterPrice === "over5m" && num <= 5000000) return false; }
    if (filterStatus && listing.status !== filterStatus) return false;
    if (filterType && listing.type !== filterType) return false;
    return true;
  });

  return (
    <div className="dashboard-revamp">
      <nav className="dash-nav">
        <div className="dash-nav-left">
          <img src={logo} alt="MBC" className="dash-logo" onClick={() => navigate("/dashboard")} />
          <div className="dash-search-wrapper" style={{ position: 'relative' }}>
            <FaSearch className="dash-search-icon" />
            <input type="text" placeholder="Search people..." className="dash-search-input" value={searchQuery} onChange={handleSearch} />
            {searchQuery.trim().length > 0 && (
              <div style={{ position: 'absolute', top: '110%', left: 0, width: '100%', background: 'white', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                {isSearching ? ( <div style={{ padding: '15px', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>Searching...</div> ) : searchResults.length > 0 ? (
                  searchResults.map(result => (
                    <div key={result.id} onClick={() => { navigate(`/profile/${result.id}`); setSearchQuery(""); }} style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                      <img src={result.photoURL || `https://ui-avatars.com/api/?name=${result.firstName}+${result.lastName}`} style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover' }} alt="avatar" />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#111' }}>{result.firstName} {result.lastName}</span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>{result.role} • {result.customId}</span>
                      </div>
                    </div>
                  ))
                ) : ( <div style={{ padding: '15px', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>No users found.</div> )}
              </div>
            )}
          </div>
        </div>
        <div className="dash-nav-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div onClick={() => navigate('/messages')} style={{ cursor: 'pointer', color: '#4b5563', display: 'flex', alignItems: 'center', transition: '0.2s', position: 'relative' }} title="Messages" className="desktop-msg-icon">
            <FaEnvelope size={22} />
            {unreadCount > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-8px', background: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>{unreadCount}</span>}
          </div>

          <div onClick={() => setShowNotifications(!showNotifications)} style={{ cursor: 'pointer', color: '#4b5563', display: 'flex', alignItems: 'center', transition: '0.2s', position: 'relative' }} title="Notifications" className="desktop-msg-icon">
            <FaBell size={22} />
            {unreadNotifCount > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-8px', background: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>{unreadNotifCount}</span>}
            {showNotifications && (
              <div onClick={(e) => e.stopPropagation()} className="notif-dropdown">
                <div className="notif-dropdown-header">Notifications</div>
                {notifications.length === 0 ? ( <div className="notif-dropdown-empty">No notifications yet</div> ) : (
                  notifications.slice(0, 20).map((n: any) => (
                    <div key={n.id} onClick={() => { markNotificationRead(n.id); if (n.link) navigate(n.link); setShowNotifications(false); }} className={`notif-dropdown-item ${n.read ? '' : 'notif-unread'}`}>
                      <p className="notif-dropdown-msg" style={{ fontWeight: n.read ? '400' : '600' }}>{n.message}</p>
                      <span className="notif-dropdown-time">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="dash-user-trigger" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <div className="dash-user-text">
              <span className="dash-user-name">{userData?.firstName ? `${userData.firstName} ${userData.lastName}` : (user?.displayName || 'Loading...')}</span>
              <span className="dash-user-role">{userData?.role || 'Client'}</span>
            </div>
            <img src={user?.photoURL || 'https://ui-avatars.com/api/?name=User&background=e5e7eb&color=9ca3af&rounded=true'} alt="avatar" className="dash-avatar" />
          </div>
          {isDropdownOpen && (
            <div className="dash-dropdown">
              <div className="dash-dropdown-item" onClick={() => { navigate('/profile'); setIsDropdownOpen(false); }}><FaUser /> Profile</div>
              <div className="dash-dropdown-item" onClick={() => { navigate('/settings'); setIsDropdownOpen(false); }}><FaCog /> Settings</div>
              {canAccessTrash(userData?.role, user?.email) && ( <div className="dash-dropdown-item" onClick={() => { navigate('/archive'); setIsDropdownOpen(false); }}><FaTrash /> Trash</div> )}
              {isAdmin(user?.email) && ( <div className="dash-dropdown-item" onClick={() => { navigate('/admin'); setIsDropdownOpen(false); }}><FaCog /> Admin Panel</div> )}
              <div className="dash-dropdown-divider" />
              <div className="dash-dropdown-item dash-dropdown-logout" onClick={handleLogout}><FaSignOutAlt /> Logout</div>
            </div>
          )}
        </div>
      </nav>

      {/* ========== MAIN CONTENT ========== */}
      <div className="dash-content">
        <div className="dash-filters-bar">
          <div className="dash-filters-group">
            <div className="dash-filter-pill" style={{ flex: '1 1 200px' }}>
              <FaSearch style={{ marginLeft: '10px', color: '#9ca3af', flexShrink: 0 }} />
              <input type="text" placeholder="Search listings..." value={listingSearchQuery} onChange={(e) => { setListingSearchQuery(e.target.value); setVisibleCount(POSTS_PER_PAGE); }} style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', fontSize: '0.85rem', padding: '0 8px' }} />
            </div>
            <div className="dash-filter-pill">
              <select value={filterLocation} onChange={handleFilterChange}>
                <option value="">Location</option><option value="All">All</option>
                {BACOLOD_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
              <FaChevronDown className="pill-arrow" />
            </div>
            <div className="dash-filter-pill">
              <select value={filterPrice} onChange={(e) => setFilterPrice(e.target.value)}>
                <option value="">Price</option><option value="under1m">Under 1M</option><option value="1m-3m">1M - 3M</option><option value="3m-5m">3M - 5M</option><option value="over5m">Over 5M</option>
              </select>
              <FaChevronDown className="pill-arrow" />
            </div>
            <div className="dash-filter-pill">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Status</option><option value="For Sale">For Sale</option><option value="For Rent">For Rent</option><option value="Sold">Sold</option><option value="Reserved">Reserved</option>
              </select>
              <FaChevronDown className="pill-arrow" />
            </div>
            <div className="dash-filter-pill">
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">Type</option><option value="House & Lot">House & Lot</option><option value="Lot Only">Lot Only</option><option value="Condo">Condo</option><option value="Commercial">Commercial</option>
              </select>
              <FaChevronDown className="pill-arrow" />
            </div>
          </div>
          <button className="dash-search-btn" onClick={() => { setFilterLocation(''); setFilterPrice(''); setFilterStatus(''); setFilterType(''); setListingSearchQuery(''); setVisibleCount(POSTS_PER_PAGE); }}>Clear Filters</button>
        </div>

        <div className="dash-listings-grid">
          {isLoadingPosts ? ( <SkeletonCard count={8} /> ) : displayListings.length === 0 ? ( <p className="no-listings-msg">No listings found. Try adjusting your filters.</p> ) : (
            displayListings.slice(0, visibleCount).map((listing: any) => (
              <div className="glass-listing-card" key={listing.id} onClick={() => openListingModal(listing)} style={{ cursor: 'pointer' }}>
                <div className="glass-card-content">
                  <div>
                    <h3 className="glass-card-title">{listing.title}{listing.rooms > 0 && <><br /><span className="glass-card-rooms">{listing.rooms} rooms</span></>}</h3>
                    <ul className="glass-card-bullets"><li>→ {listing.location} Location</li><li>→ {formatPriceDisplay(listing.price)}</li></ul>
                    <p className="glass-card-desc">{listing.description}</p>
                  </div>
                  <div className="glass-card-footer">
                    <div className="glass-card-agent">
                      <img src={listing.agentAvatar} alt={listing.agentName} />
                      <div className="agent-meta">
                        <span className="agent-name agent-name-link" onClick={(e) => { e.stopPropagation(); const agentId = listing.originalPost?.userId; if (agentId) navigate(`/profile/${agentId}`); }}>{listing.agentName}</span>
                        <span className="agent-rating-row"><RatingStars rating={listing.agentRating} /><span className="agent-rating-text">{listing.agentRating > 0 ? `${listing.agentRating} Stars` : 'No Reviews'}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="glass-card-right">
                  <div className="glass-card-image">{listing.image && <img src={listing.image} alt={listing.title} />}</div>
                  <button className="glass-inquire-btn" onClick={(e) => { e.stopPropagation(); handleInquire(listing); }}>INQUIRE NOW →</button>
                </div>
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
        {displayListings.length > visibleCount && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
            <button className="dash-search-btn" onClick={() => setVisibleCount(prev => prev + POSTS_PER_PAGE)} style={{ padding: '12px 40px', fontSize: '0.95rem' }}>Load More ({displayListings.length - visibleCount} remaining)</button>
          </div>
        )}
      </div>

      {canCreateListings(userData?.role, user?.email) && ( <button className="agent-fab" onClick={() => setShowCreateModal(true)} title="Create Listing"><FaPlus size={20} /></button> )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="create-listing-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="create-listing-modal" onClick={(e) => e.stopPropagation()}>
            <div className="create-listing-header"><h2>New Listing</h2><FaTimes className="create-listing-close" onClick={() => setShowCreateModal(false)} /></div>
            <div className="create-listing-body">
              <div className="create-listing-field"><label>Listing Title *</label><input type="text" className="create-listing-input" placeholder="e.g. Greenfield Residences" value={listingTitle} onChange={(e) => setListingTitle(e.target.value)} /></div>
              <div className="create-listing-row">
                <div className="create-listing-field"><label>Price (₱) *</label><input type="number" className="create-listing-input" placeholder="e.g. 1000000" value={listingPrice} onChange={(e) => { const v = e.target.value; if (v === '' || Number(v) >= 0) setListingPrice(v); }} min="0" />{listingPrice && <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Display: {formatPriceDisplay(listingPrice)}</span>}</div>
                <div className="create-listing-field"><label>Location *</label><select className="create-listing-select" value={listingLocation} onChange={(e) => setListingLocation(e.target.value)}><option value="" disabled>Select location</option>{BACOLOD_LOCATIONS.map((loc) => (<option key={loc} value={loc}>{loc}</option>))}</select></div>
              </div>
              <div className="create-listing-row"><div className="create-listing-field"><label>Status</label><select className="create-listing-select" value={listingStatus} onChange={(e) => setListingStatus(e.target.value)}><option value="For Sale">For Sale</option><option value="For Rent">For Rent</option><option value="Sold">Sold</option><option value="Reserved">Reserved</option></select></div><div className="create-listing-field"><label>Type</label><select className="create-listing-select" value={listingType} onChange={(e) => setListingType(e.target.value)}><option value="House & Lot">House & Lot</option><option value="Lot Only">Lot Only</option><option value="Condo">Condo</option><option value="Commercial">Commercial</option></select></div></div>
              <div className="create-listing-section-title">Property Details</div>
              <div className="create-listing-row create-listing-row-4"><div className="create-listing-field"><label>Bedrooms</label><input type="number" className="create-listing-input" placeholder="0" min="0" value={listingRooms} onChange={(e) => setListingRooms(e.target.value)} /></div><div className="create-listing-field"><label>Bathrooms</label><input type="number" className="create-listing-input" placeholder="0" min="0" value={listingBathrooms} onChange={(e) => setListingBathrooms(e.target.value)} /></div><div className="create-listing-field"><label>Lot Area</label><input type="text" className="create-listing-input" placeholder="e.g. 200 sqm" value={listingLotArea} onChange={(e) => setListingLotArea(e.target.value)} /></div><div className="create-listing-field"><label>Floor Area</label><input type="text" className="create-listing-input" placeholder="e.g. 140 sqm" value={listingFloorArea} onChange={(e) => setListingFloorArea(e.target.value)} /></div></div>
              <div className="create-listing-row"><div className="create-listing-field"><label>Year Built</label><input type="number" className="create-listing-input" placeholder="e.g. 2024" min="1900" max="2030" value={listingYearBuilt} onChange={(e) => setListingYearBuilt(e.target.value)} /></div><div className="create-listing-field"><label>Amenities</label><input type="text" className="create-listing-input" placeholder="Separate by commas" value={listingAmenities} onChange={(e) => setListingAmenities(e.target.value)} /></div></div>
              <div className="create-listing-field"><label>Description</label><textarea className="create-listing-textarea" placeholder="Describe the property..." value={listingDescription} onChange={(e) => setListingDescription(e.target.value)} /></div>
              <div className="create-listing-section-title">Photos *</div>
              <div className="create-listing-photos">
                {imageFiles.map((file, i) => (<div key={i} className="create-listing-photo-item"><img src={URL.createObjectURL(file)} alt="" /><button onClick={() => removeImage(i)} className="create-listing-photo-remove">&#215;</button></div>))}
                <button className="create-listing-photo-add" onClick={() => fileInputRef.current?.click()}><FaImage size={20} /><span>Add Photos</span></button>
                <input type="file" ref={fileInputRef} hidden accept="image/*" multiple onChange={handleFileSelect} />
              </div>
              <div className="create-listing-section-title">Pin Location on Map *</div>
              <div className="create-listing-map-wrapper">
                <div className="create-listing-map-toggle"><button type="button" className={`create-map-style-btn ${createMapStyle === 'street' ? 'active' : ''}`} onClick={() => setCreateMapStyle('street')}>Street</button><button type="button" className={`create-map-style-btn ${createMapStyle === 'satellite' ? 'active' : ''}`} onClick={() => setCreateMapStyle('satellite')}>Satellite</button></div>
                <MapContainer center={listingLocation && LOCATION_COORDS[listingLocation] ? LOCATION_COORDS[listingLocation] : BACOLOD_CENTER} zoom={14} style={{ height: '260px', width: '100%', borderRadius: '14px', zIndex: 0 }} key={`create-map-${listingLocation}-${createMapStyle}`}>
                  {createMapStyle === 'street' ? ( <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' /> ) : ( <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='&copy; Esri' /> )}
                  <MapClickHandler onPin={(coords) => setListingPinCoords(coords)} />
                  {listingPinCoords && ( <Marker position={listingPinCoords}><Popup>Listing location</Popup></Marker> )}
                </MapContainer>
                {listingPinCoords && ( <p style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '6px', fontWeight: 500 }}><FaMapMarkerAlt size={10} /> Pinned at {listingPinCoords[0].toFixed(5)}, {listingPinCoords[1].toFixed(5)}</p> )}
              </div>
            </div>
            <div className="create-listing-footer"><button className="create-listing-cancel" onClick={() => { resetCreateForm(); setShowCreateModal(false); }}>Cancel</button><button className="create-listing-publish" onClick={handleCreateListing} disabled={isUploading}>{isUploading ? <><FaSpinner className="spin" /> Publishing...</> : 'Publish Listing'}</button></div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingPostId && (
        <div className="create-listing-overlay" onClick={() => setEditingPostId(null)}>
          <div className="create-listing-modal" onClick={e => e.stopPropagation()}>
            <div className="create-listing-header"><h2>Edit Listing</h2><FaTimes className="create-listing-close" onClick={() => setEditingPostId(null)} /></div>
            <div className="create-listing-body">
              <div className="create-listing-field"><label>Listing Title *</label><input type="text" className="create-listing-input" placeholder="e.g. Greenfield Residences" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
              <div className="create-listing-row">
                <div className="create-listing-field"><label>Price (₱) *</label><input type="number" className="create-listing-input" placeholder="e.g. 1000000" value={editPrice} onChange={(e) => { const v = e.target.value; if (v === '' || Number(v) >= 0) setEditPrice(v); }} min="0" />{editPrice && <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Display: {formatPriceDisplay(editPrice)}</span>}</div>
                <div className="create-listing-field"><label>Location *</label><select className="create-listing-select" value={editLocation} onChange={(e) => setEditLocation(e.target.value)}><option value="" disabled>Select location</option>{BACOLOD_LOCATIONS.map((loc) => (<option key={loc} value={loc}>{loc}</option>))}</select></div>
              </div>
              <div className="create-listing-row"><div className="create-listing-field"><label>Status</label><select className="create-listing-select" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}><option value="For Sale">For Sale</option><option value="For Rent">For Rent</option><option value="Sold">Sold</option><option value="Reserved">Reserved</option></select></div><div className="create-listing-field"><label>Type</label><select className="create-listing-select" value={editType} onChange={(e) => setEditType(e.target.value)}><option value="House & Lot">House & Lot</option><option value="Lot Only">Lot Only</option><option value="Condo">Condo</option><option value="Commercial">Commercial</option></select></div></div>
              <div className="create-listing-section-title">Property Details</div>
              <div className="create-listing-row create-listing-row-4"><div className="create-listing-field"><label>Bedrooms</label><input type="number" className="create-listing-input" placeholder="0" min="0" value={editRooms} onChange={(e) => setEditRooms(e.target.value)} /></div><div className="create-listing-field"><label>Bathrooms</label><input type="number" className="create-listing-input" placeholder="0" min="0" value={editBathrooms} onChange={(e) => setEditBathrooms(e.target.value)} /></div><div className="create-listing-field"><label>Lot Area</label><input type="text" className="create-listing-input" placeholder="e.g. 200 sqm" value={editLotArea} onChange={(e) => setEditLotArea(e.target.value)} /></div><div className="create-listing-field"><label>Floor Area</label><input type="text" className="create-listing-input" placeholder="e.g. 140 sqm" value={editFloorArea} onChange={(e) => setEditFloorArea(e.target.value)} /></div></div>
              <div className="create-listing-row"><div className="create-listing-field"><label>Year Built</label><input type="number" className="create-listing-input" placeholder="e.g. 2024" min="1900" max="2030" value={editYearBuilt} onChange={(e) => setEditYearBuilt(e.target.value)} /></div><div className="create-listing-field"><label>Amenities</label><input type="text" className="create-listing-input" placeholder="Separate by commas" value={editAmenities} onChange={(e) => setEditAmenities(e.target.value)} /></div></div>
              <div className="create-listing-field"><label>Description</label><textarea className="create-listing-textarea" placeholder="Describe the property..." value={editCaption} onChange={(e) => setEditCaption(e.target.value)} /></div>
              <div className="create-listing-section-title">Photos *</div>
              <div className="create-listing-photos">
                {editImages.map((img, i) => (<div key={i} className="create-listing-photo-item"><img src={img} alt="" /><button onClick={() => removeEditImage(i)} className="create-listing-photo-remove">&#215;</button></div>))}
                {newEditFiles.map((file, i) => (<div key={`new-${i}`} className="create-listing-photo-item"><img src={URL.createObjectURL(file)} alt="" /><button onClick={() => removeNewEditFile(i)} className="create-listing-photo-remove">&#215;</button></div>))}
                <button className="create-listing-photo-add" onClick={() => editFileRef.current?.click()}><FaImage size={20} /><span>Add Photos</span></button>
                <input type="file" ref={editFileRef} hidden accept="image/*" multiple onChange={handleEditFileSelect} />
              </div>
            </div>
            <div className="create-listing-footer"><button className="create-listing-cancel" onClick={() => setEditingPostId(null)}>Cancel</button><button className="create-listing-publish" onClick={saveEdit} disabled={isUploading}>{isUploading ? <><FaSpinner className="spin" /> Saving...</> : 'Save Changes'}</button></div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL (BULLETPROOFED) */}
      {selectedListing && (() => {
        // 🔥 SAFEGUARD 1: Fallback if images array is malformed or missing
        const rawImgs = selectedListing.images;
        const fallbackImg = selectedListing.image || 'https://via.placeholder.com/600x400?text=No+Image';
        const imgs = Array.isArray(rawImgs) && rawImgs.length > 0 ? rawImgs : [fallbackImg];
        
        // 🔥 SAFEGUARD 2: Fallback if map coordinates are corrupted
        let listingCoords = selectedListing.pinCoords || LOCATION_COORDS[selectedListing.location];
        if (!Array.isArray(listingCoords) || listingCoords.length !== 2 || typeof listingCoords[0] !== 'number' || typeof listingCoords[1] !== 'number') {
          listingCoords = BACOLOD_CENTER;
        }

        const propertyPrice = parsePriceToNumber(selectedListing.price);
        const downPaymentError = mortgageDownPayment < 10 ? 'Minimum 10%' : mortgageDownPayment > 50 ? 'Maximum 50%' : '';
        const rateError = mortgageRate < 3 ? 'Minimum 3%' : mortgageRate > 12 ? 'Maximum 12%' : '';
        const termError = mortgageTerm < 5 ? 'Minimum 5 years' : mortgageTerm > 30 ? 'Maximum 30 years' : '';
        const hasValidationError = !!(downPaymentError || rateError || termError || propertyPrice <= 0);
        const mortgage = !hasValidationError && propertyPrice > 0 ? calculateMortgage(propertyPrice, mortgageDownPayment, mortgageRate, mortgageTerm) : null;
        
        return (
          <div className="listing-modal-overlay" onClick={closeListingModal}>
            <div className="listing-modal" onClick={(e) => e.stopPropagation()}>
              <div className="listing-modal-carousel">
                <img src={imgs[carouselIndex]} alt={selectedListing.title} className="listing-modal-carousel-img" />
                {imgs.length > 1 && (
                  <>
                    <button className="carousel-arrow carousel-arrow-left" onClick={prevImage}><FaChevronLeft /></button>
                    <button className="carousel-arrow carousel-arrow-right" onClick={nextImage}><FaChevronRight /></button>
                    <div className="carousel-dots">{imgs.map((_: any, i: number) => (<span key={i} className={`carousel-dot ${i === carouselIndex ? 'carousel-dot-active' : ''}`} onClick={(e) => { e.stopPropagation(); setCarouselIndex(i); }} />))}</div>
                  </>
                )}
                <span className="listing-modal-status">{selectedListing.status}</span>
                <div className="listing-modal-top-actions">
                  <button className="listing-modal-like" onClick={(e) => { e.stopPropagation(); handleToggleLike(); }}>{isLiked ? <FaHeart color="#ef4444" /> : <FaRegHeart />}</button>
                  <button className="listing-modal-like" onClick={(e) => { e.stopPropagation(); handleToggleSave(selectedListing.id); }} title="Save">{selectedListing.originalPost?.savedBy?.includes(user?.uid) ? <FaBookmark color="#f59e0b" /> : <FaRegBookmark />}</button>
                  <button className="listing-modal-like" onClick={(e) => { e.stopPropagation(); handleReport(selectedListing); }} title="Report"><FaFlag size={14} /></button>
                  <button className="listing-modal-close" onClick={(e) => { e.stopPropagation(); closeListingModal(); }}><FaTimes /></button>
                </div>
                <span className="listing-modal-counter">{carouselIndex + 1} / {imgs.length}</span>
              </div>
              <div className="listing-modal-tabs">
                <button className={`listing-modal-tab ${activeModalTab === 'details' ? 'listing-modal-tab-active' : ''}`} onClick={() => setActiveModalTab('details')}><FaHome size={13} /> Details</button>
                <button className={`listing-modal-tab ${activeModalTab === 'map' ? 'listing-modal-tab-active' : ''}`} onClick={() => setActiveModalTab('map')}><FaMap size={13} /> Map</button>
                {propertyPrice > 0 && ( <button className={`listing-modal-tab ${activeModalTab === 'calculator' ? 'listing-modal-tab-active' : ''}`} onClick={() => setActiveModalTab('calculator')}><FaCalculator size={13} /> Calculator</button> )}
              </div>
              <div className="listing-modal-body" key={activeModalTab}>
                {activeModalTab === 'details' && (
                  <>
                    <div className="listing-modal-body-left">
                      <div className="listing-modal-title-row"><div><h2 className="listing-modal-title">{selectedListing.title}</h2><p className="listing-modal-location"><FaMapMarkerAlt size={12} /> {selectedListing.location}, Bacolod City</p></div><div className="listing-modal-price">{formatPriceDisplay(selectedListing.price)}</div></div>
                      <div className="listing-modal-details">
                        {selectedListing.rooms > 0 && ( <div className="listing-detail-item"><FaBed className="listing-detail-icon" /><div><span className="listing-detail-value">{selectedListing.rooms}</span><span className="listing-detail-label">Bedrooms</span></div></div> )}
                        {selectedListing.bathrooms > 0 && ( <div className="listing-detail-item"><FaBath className="listing-detail-icon" /><div><span className="listing-detail-value">{selectedListing.bathrooms}</span><span className="listing-detail-label">Bathrooms</span></div></div> )}
                        <div className="listing-detail-item"><FaRulerCombined className="listing-detail-icon" /><div><span className="listing-detail-value">{selectedListing.lotArea}</span><span className="listing-detail-label">Lot Area</span></div></div>
                        {selectedListing.floorArea !== 'N/A' && ( <div className="listing-detail-item"><FaRulerCombined className="listing-detail-icon" /><div><span className="listing-detail-value">{selectedListing.floorArea}</span><span className="listing-detail-label">Floor Area</span></div></div> )}
                        {selectedListing.yearBuilt > 0 && ( <div className="listing-detail-item"><FaCalendarAlt className="listing-detail-icon" /><div><span className="listing-detail-value">{selectedListing.yearBuilt}</span><span className="listing-detail-label">Year Built</span></div></div> )}
                      </div>
                      <div className="listing-modal-section"><h4 className="listing-modal-section-title">Description</h4><p className="listing-modal-desc">{selectedListing.fullDescription || selectedListing.description}</p></div>
                      
                      {/* 🔥 SAFEGUARD 3: Ensure amenities is actually an Array before calling .map */}
                      {Array.isArray(selectedListing.amenities) && selectedListing.amenities.length > 0 && ( 
                        <div className="listing-modal-section">
                          <h4 className="listing-modal-section-title">Amenities & Features</h4>
                          <div className="listing-modal-amenities">
                            {selectedListing.amenities.map((a: string, i: number) => (<span key={i} className="listing-amenity-tag">{a}</span>))}
                          </div>
                        </div> 
                      )}

                      <div className="listing-modal-meta"><span>Type: <strong>{selectedListing.type}</strong></span><span>Listed: <strong>{selectedListing.listedDate || 'Recently'}</strong></span></div>
                    </div>
                    <div className="listing-modal-agent-card">
                      <img src={selectedListing.agentAvatar} alt={selectedListing.agentName} className="listing-modal-agent-avatar" style={{ cursor: 'pointer' }} onClick={() => { const agentId = selectedListing.originalPost?.userId; if (agentId) { closeListingModal(); navigate(`/profile/${agentId}`); } }} />
                      <h4 className="listing-modal-agent-name" style={{ cursor: 'pointer' }} onClick={() => { const agentId = selectedListing.originalPost?.userId; if (agentId) { closeListingModal(); navigate(`/profile/${agentId}`); } }}>{selectedListing.agentName}</h4>
                      <span className="listing-modal-agent-role">Listing Agent</span>
                      <div className="listing-modal-agent-rating"><RatingStars rating={selectedListing.agentRating} /><span>{selectedListing.agentRating > 0 ? `${selectedListing.agentRating} Stars` : 'No Reviews'}</span></div>
                      {user?.uid !== selectedListing.originalPost?.userId && ( <button className="listing-modal-share-btn" style={{ marginTop: '6px', fontSize: '0.8rem' }} onClick={() => handleRateAgent(selectedListing.originalPost?.userId, selectedListing.agentName)}><FaStar size={11} /> Rate Agent</button> )}
                      {selectedListing.agentPhone && selectedListing.agentPhone !== 'N/A' && (<p className="listing-modal-agent-phone"><FaPhoneAlt size={11} /> {selectedListing.agentPhone}</p>)}
                      <button className="listing-modal-inquire-btn" onClick={() => handleInquire(selectedListing)}>INQUIRE NOW →</button>
                      <div className="listing-modal-share-wrapper">
                        <button className="listing-modal-share-btn" onClick={() => setShowShareSocials(!showShareSocials)}><FaShare size={12} /> Share Listing</button>
                        <div className={`listing-modal-share-socials ${showShareSocials ? 'show' : ''}`}>
                          <button className="modal-social-btn modal-social-fb" title="Share to Facebook" onClick={() => { const url = `${window.location.origin}/dashboard?listing=${selectedListing.id}`; window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(`${selectedListing.title} - ${formatPriceDisplay(selectedListing.price)} in ${selectedListing.location}`)}`, '_blank', 'width=600,height=400'); }}><FaFacebookF size={14} /></button>
                          <button className="modal-social-btn modal-social-tw" title="Share to X (Twitter)" onClick={() => { const url = `${window.location.origin}/dashboard?listing=${selectedListing.id}`; const text = `Check out this listing: ${selectedListing.title} - ${formatPriceDisplay(selectedListing.price)} in ${selectedListing.location}`; window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400'); }}><FaTwitter size={14} /></button>
                          <button className="modal-social-btn modal-social-ig" title="Share to Instagram" onClick={() => { const url = `${window.location.origin}/dashboard?listing=${selectedListing.id}`; navigator.clipboard.writeText(`${selectedListing.title} - ${formatPriceDisplay(selectedListing.price)} in ${selectedListing.location}\n${url}`); glassToast.success('Link copied! Paste it on Instagram.'); }}><FaInstagram size={14} /></button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {activeModalTab === 'map' && (
                  <div className="listing-modal-map-container">
                    <div className="listing-modal-map-header"><div><h3 className="listing-modal-map-title"><FaMapMarkerAlt size={14} /> {selectedListing.location}, Bacolod City</h3><p className="listing-modal-map-subtitle">Approximate property location</p></div><div className="listing-modal-map-toggle"><button className={`map-style-btn ${mapStyle === 'street' ? 'map-style-btn-active' : ''}`} onClick={() => setMapStyle('street')}>Map</button><button className={`map-style-btn ${mapStyle === 'satellite' ? 'map-style-btn-active' : ''}`} onClick={() => setMapStyle('satellite')}>Satellite</button></div></div>
                    <div className="listing-modal-map-wrapper"><MapContainer center={listingCoords} zoom={15} style={{ width: '100%', height: '100%', borderRadius: '16px' }} scrollWheelZoom={true} key={`${selectedListing.id}-${mapStyle}`}>{mapStyle === 'street' ? ( <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /> ) : ( <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" /> )}<Marker position={listingCoords}><Popup><strong>{selectedListing.title}</strong><br />{selectedListing.location}, Bacolod City<br />{formatPriceDisplay(selectedListing.price)}</Popup></Marker></MapContainer></div>
                  </div>
                )}
                {activeModalTab === 'calculator' && (
                  <div className="listing-modal-calculator-container">
                    <div className="listing-modal-calc-header"><h3 className="listing-modal-calc-title"><FaCalculator size={14} /> Mortgage Calculator</h3><p className="listing-modal-calc-subtitle">Estimate your monthly payments for <strong>{selectedListing.title}</strong></p></div>
                    <div className="listing-modal-calc-body">
                      <div className="listing-modal-calc-inputs">
                        <div className="calc-input-group"><label className="calc-label">Property Price (₱)</label><div className="calc-value-display">₱{propertyPrice.toLocaleString()}</div></div>
                        <div className="calc-input-group"><label className="calc-label">Down Payment (%)</label><div className="calc-input-row"><input type="number" min="10" max="50" step="1" value={mortgageDownPayment} onChange={(e) => setMortgageDownPayment(Number(e.target.value) >= 0 ? Number(e.target.value) : 0)} className={`calc-number-input ${downPaymentError ? 'calc-input-error' : ''}`} /><span className="calc-input-suffix">%</span></div>{downPaymentError ? <span className="calc-validation-error">{downPaymentError}</span> : !hasValidationError && mortgage && <span className="calc-input-hint">₱{mortgage.downPayment.toLocaleString()} down payment</span>}</div>
                        <div className="calc-input-group"><label className="calc-label">Interest Rate (%)</label><div className="calc-input-row"><input type="number" min="3" max="12" step="0.1" value={mortgageRate} onChange={(e) => setMortgageRate(Number(e.target.value) >= 0 ? Number(e.target.value) : 0)} className={`calc-number-input ${rateError ? 'calc-input-error' : ''}`} /><span className="calc-input-suffix">%</span></div>{rateError && <span className="calc-validation-error">{rateError}</span>}</div>
                        <div className="calc-input-group"><label className="calc-label">Loan Term (Years)</label><div className="calc-input-row"><input type="number" min="5" max="30" step="1" value={mortgageTerm} onChange={(e) => setMortgageTerm(Number(e.target.value) >= 0 ? Number(e.target.value) : 0)} className={`calc-number-input ${termError ? 'calc-input-error' : ''}`} /><span className="calc-input-suffix">yrs</span></div>{termError && <span className="calc-validation-error">{termError}</span>}</div>
                      </div>
                      <div className="listing-modal-calc-results">
                        {hasValidationError ? ( <div className="calc-result-card" style={{ textAlign: 'center', gridColumn: '1 / -1' }}><span className="calc-result-label" style={{ color: '#ef4444' }}>Please fix the input errors above.</span></div> ) : mortgage ? (
                          <>
                            <div className="calc-result-card calc-result-primary"><span className="calc-result-label">Monthly Payment</span><span className="calc-result-value">₱{mortgage.monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                            <div className="calc-result-card"><span className="calc-result-label">Loan Amount</span><span className="calc-result-value-sm">₱{mortgage.principal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                            <div className="calc-result-card"><span className="calc-result-label">Down Payment</span><span className="calc-result-value-sm">₱{mortgage.downPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                          </>
                        ) : null}
                        <div className="calc-disclaimer" style={{ gridColumn: '1 / -1', marginTop: '8px' }}><strong>Disclaimer:</strong><p style={{ margin: '6px 0 4px' }}>This mortgage calculator provides estimates only. Approval is subject to bank policies.</p></div>
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
        <div onClick={() => navigate('/dashboard')} className="dash-mobile-nav-item active"><FaHome size={22} /><span>Home</span></div>
        <div onClick={() => navigate('/messages')} className="dash-mobile-nav-item"><div style={{ position: 'relative' }}><FaEnvelope size={22} />{unreadCount > 0 && <span style={{ position: 'absolute', top: '-2px', right: '-10px', background: '#ef4444', color: 'white', fontSize: '0.6rem', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>{unreadCount}</span>}</div><span>Messages</span></div>
        {canAccessTrash(userData?.role, user?.email) && ( <div onClick={() => navigate('/archive')} className="dash-mobile-nav-item"><FaTrash size={22} /><span>Trash</span></div> )}
        <div onClick={() => navigate('/profile')} className="dash-mobile-nav-item"><FaUser size={22} /><span>Profile</span></div>
      </div>
    </div>
  );
}