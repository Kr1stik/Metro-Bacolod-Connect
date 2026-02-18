import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { signOut } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, getDocs, addDoc, updateDoc } from "firebase/firestore";
import {
  FaSearch, FaUser, FaCog, FaSignOutAlt, FaCaretDown,
  FaImage, FaSpinner, FaHome, FaTrash, FaEnvelope,
  FaPen, FaTimes, FaMapMarkerAlt, FaPlus, FaStar,
  FaStarHalfAlt, FaRegStar, FaShare, FaChevronDown,
  FaChevronLeft, FaChevronRight, FaBed, FaBath, FaRulerCombined,
  FaCalendarAlt, FaPhoneAlt, FaHeart, FaRegHeart
} from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import "../App.css";
import Swal from 'sweetalert2';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BACOLOD_LOCATIONS } from "../constants/locations";

// --- MOCK LISTINGS DATA ---
const MOCK_LISTINGS = [
  {
    id: 'mock-1',
    title: 'The Lazy Den 2',
    rooms: 2,
    bathrooms: 1,
    lotArea: '120 sqm',
    floorArea: '85 sqm',
    yearBuilt: 2021,
    location: 'Villamonte',
    price: '0.5 million php',
    description: 'Discover available lots in prime locations. Browse land options with complete details to help you choose the perfect place to build or invest.',
    fullDescription: 'Discover available lots in prime locations. Browse land options with complete details to help you choose the perfect place to build or invest. This cozy 2-bedroom home features an open-plan kitchen, tiled flooring throughout, and a small garden area perfect for morning coffee. Located near schools, churches, and the local market. Fully fenced with a carport for one vehicle.',
    amenities: ['Carport', 'Garden', 'Tiled Flooring', 'Fenced', 'Near Schools'],
    agentName: 'Wynands Burger',
    agentRating: 3.9,
    agentPhone: '+63 912 345 6789',
    agentAvatar: 'https://ui-avatars.com/api/?name=WB&background=6366f1&color=fff&rounded=true&size=40',
    image: 'https://images.pexels.com/photos/3013440/pexels-photo-3013440.jpeg?auto=compress&cs=tinysrgb&w=600',
    images: [
      'https://images.pexels.com/photos/3013440/pexels-photo-3013440.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1643384/pexels-photo-1643384.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    status: 'For Sale',
    type: 'House & Lot',
    listedDate: 'Jan 15, 2026',
  },
  {
    id: 'mock-2',
    title: 'Greenfield Residences',
    rooms: 3,
    bathrooms: 2,
    lotArea: '200 sqm',
    floorArea: '140 sqm',
    yearBuilt: 2024,
    location: 'Mandalagan',
    price: '2.8 million php',
    description: 'Modern 3-bedroom home in a peaceful subdivision. Includes carport, garden space, and 24/7 gated security for your family.',
    fullDescription: 'Modern 3-bedroom home in a peaceful subdivision. Includes carport, garden space, and 24/7 gated security for your family. Features a modern kitchen with granite countertops, spacious living area with high ceilings, master bedroom with en-suite bathroom, and a balcony overlooking the community garden. HOA includes pool, clubhouse, and playground access.',
    amenities: ['Swimming Pool', 'Clubhouse', 'Playground', 'Gated Security', 'Carport', 'Balcony'],
    agentName: 'Maria Santos',
    agentRating: 4.5,
    agentPhone: '+63 917 888 1234',
    agentAvatar: 'https://ui-avatars.com/api/?name=MS&background=10b981&color=fff&rounded=true&size=40',
    image: 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=600',
    images: [
      'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2635038/pexels-photo-2635038.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/3797991/pexels-photo-3797991.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    status: 'Pre-Selling',
    type: 'House & Lot',
    listedDate: 'Feb 2, 2026',
  },
  {
    id: 'mock-3',
    title: 'Vista Heights Lot',
    rooms: 0,
    bathrooms: 0,
    lotArea: '300 sqm',
    floorArea: 'N/A',
    yearBuilt: 0,
    location: 'Taculing',
    price: '1.2 million php',
    description: 'Prime residential lot with scenic hilltop views. Perfect for custom-built dream homes with ample space and complete privacy.',
    fullDescription: 'Prime residential lot with scenic hilltop views. Perfect for custom-built dream homes with ample space and complete privacy. The lot is flat and ready for construction, with access to main roads, water, and electricity. Located in a fast-developing residential zone with nearby commercial establishments. Ideal for families looking to design their forever home.',
    amenities: ['Flat Terrain', 'Road Access', 'Water & Electric Ready', 'Hilltop View', 'Near Commercial Area'],
    agentName: 'Carlos Reyes',
    agentRating: 4.2,
    agentPhone: '+63 920 555 7890',
    agentAvatar: 'https://ui-avatars.com/api/?name=CR&background=f59e0b&color=fff&rounded=true&size=40',
    image: 'https://images.pexels.com/photos/440731/pexels-photo-440731.jpeg?auto=compress&cs=tinysrgb&w=600',
    images: [
      'https://images.pexels.com/photos/440731/pexels-photo-440731.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    status: 'For Sale',
    type: 'Lot Only',
    listedDate: 'Dec 10, 2025',
  },
  {
    id: 'mock-4',
    title: 'Sunrise Condotel',
    rooms: 1,
    bathrooms: 1,
    lotArea: 'N/A',
    floorArea: '36 sqm',
    yearBuilt: 2023,
    location: 'Estefania',
    price: '3.5 million php',
    description: 'Fully furnished studio condo with premium amenities. Walking distance to malls and business centers in the heart of the city.',
    fullDescription: 'Fully furnished studio condo with premium amenities. Walking distance to malls and business centers in the heart of the city. Unit comes with built-in closets, a modern kitchenette, split-type aircon, and premium tiled bathroom. Building amenities include rooftop infinity pool, gym, co-working space, and 24/7 concierge. Perfect for young professionals or as a rental investment.',
    amenities: ['Furnished', 'Infinity Pool', 'Gym', 'Co-working Space', 'Concierge', 'Aircon'],
    agentName: 'Patricia Lim',
    agentRating: 4.8,
    agentPhone: '+63 933 222 4567',
    agentAvatar: 'https://ui-avatars.com/api/?name=PL&background=8b5cf6&color=fff&rounded=true&size=40',
    image: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600',
    images: [
      'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2462015/pexels-photo-2462015.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2029731/pexels-photo-2029731.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/3773575/pexels-photo-3773575.png?auto=compress&cs=tinysrgb&w=800',
    ],
    status: 'Ready for Occupancy',
    type: 'Condo',
    listedDate: 'Jan 28, 2026',
  },
  {
    id: 'mock-5',
    title: 'Hacienda Grande',
    rooms: 4,
    bathrooms: 3,
    lotArea: '450 sqm',
    floorArea: '280 sqm',
    yearBuilt: 2019,
    location: 'Bata',
    price: '6.2 million php',
    description: 'Spacious 4-bedroom Spanish-style home with a large backyard. Ideal for growing families seeking a quiet neighborhood.',
    fullDescription: 'Spacious 4-bedroom Spanish-style home with a large backyard. Ideal for growing families seeking a quiet neighborhood. Features terracotta roof tiles, arched doorways, a wraparound veranda, and mature landscaping. The kitchen is fully equipped with custom cabinetry. The master suite includes a walk-in closet and jacuzzi tub. Two-car garage with maid\'s quarters.',
    amenities: ['2-Car Garage', 'Maid\'s Quarter', 'Jacuzzi', 'Walk-in Closet', 'Veranda', 'Landscaped Garden'],
    agentName: 'Roberto Cruz',
    agentRating: 4.1,
    agentPhone: '+63 945 111 3333',
    agentAvatar: 'https://ui-avatars.com/api/?name=RC&background=ef4444&color=fff&rounded=true&size=40',
    image: 'https://images.pexels.com/photos/53610/large-home-residential-house-architecture-53610.jpeg?auto=compress&cs=tinysrgb&w=600',
    images: [
      'https://images.pexels.com/photos/53610/large-home-residential-house-architecture-53610.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2102587/pexels-photo-2102587.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    status: 'For Sale',
    type: 'House & Lot',
    listedDate: 'Nov 5, 2025',
  },
  {
    id: 'mock-6',
    title: 'Metro Commercial Space',
    rooms: 0,
    bathrooms: 1,
    lotArea: '180 sqm',
    floorArea: '160 sqm',
    yearBuilt: 2022,
    location: 'Mansilingan',
    price: '4.0 million php',
    description: 'Commercial space on a high-traffic road. Great for retail shops, offices, or food establishments with high foot traffic.',
    fullDescription: 'Commercial space on a high-traffic road. Great for retail shops, offices, or food establishments with high foot traffic. Features a wide glass frontage for maximum visibility, a mezzanine level for storage or office use, two comfort rooms, and rear loading access. High-speed internet-ready with existing electrical capacity for commercial equipment.',
    amenities: ['Glass Frontage', 'Mezzanine', 'Rear Loading', 'Internet Ready', 'High Electrical Capacity'],
    agentName: 'Diana Bermudo',
    agentRating: 3.7,
    agentPhone: '+63 918 777 9999',
    agentAvatar: 'https://ui-avatars.com/api/?name=DB&background=06b6d4&color=fff&rounded=true&size=40',
    image: 'https://images.pexels.com/photos/443383/pexels-photo-443383.jpeg?auto=compress&cs=tinysrgb&w=600',
    images: [
      'https://images.pexels.com/photos/443383/pexels-photo-443383.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1098982/pexels-photo-1098982.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/269077/pexels-photo-269077.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    status: 'For Lease',
    type: 'Commercial',
    listedDate: 'Feb 10, 2026',
  },
];

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

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [posts, setPosts] = useState<any[]>([]);
  const [newCaption, setNewCaption] = useState("");
  const [postLocation, setPostLocation] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

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

  // Detail modal state
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

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

  // --- WELCOME TOAST ---
  useEffect(() => {
    if (location.state?.welcome && user && !toastShown.current) {
      const displayName = userData?.firstName
        ? `${userData.firstName} ${userData.lastName}`
        : (user.displayName || 'User');
      toast.success(`Welcome back, ${displayName}!`, { theme: "light" });
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

  const handleCreatePost = async () => {
    if (imageFiles.length === 0) return toast.warning("Upload at least 1 image.");
    if (!postLocation) return toast.warning("Select a location!");
    setIsUploading(true);
    try {
      const uniqueId = userData?.customId || "USER";
      const role = userData?.role || "Client";
      const imageUrls: string[] = [];
      const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dg6kzqq5n";
      const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "jdj7tsar";
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
      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        userName: userData?.firstName ? `${userData.firstName} ${userData.lastName}` : (user.displayName || "Metro User"),
        userAvatar: user.photoURL,
        userCustomId: uniqueId,
        userRole: role,
        content: newCaption,
        location: postLocation,
        images: imageUrls,
        image: imageUrls[0],
        createdAt: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        savedBy: [],
        isArchived: false
      });
      toast.success("Listing published!");
      setNewCaption(""); setPostLocation(""); setImageFiles([]);
      setShowCreateModal(false);
      fetchPosts(filterLocation);
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to post: " + error.message);
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
    if (editImages.length === 0 && newEditFiles.length === 0) return toast.warning("Post must have at least one image.");
    setIsUploading(true);
    try {
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
      const postRef = doc(db, "posts", editingPostId);
      await updateDoc(postRef, { content: editCaption, images: finalImages, image: finalImages[0] });
      toast.success("Listing updated!");
      setEditingPostId(null);
      fetchPosts(filterLocation);
    } catch (error) {
      toast.error("Failed to update listing");
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
        await updateDoc(postRef, { deletedAt: new Date().toISOString(), isArchived: true });
        setPosts(posts.filter(p => p.id !== postId));
        toast.success("Listing moved to Trash");
      } catch (error) { toast.error("Failed to move to trash"); }
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
        document.getElementById('share-copy')?.addEventListener('click', () => { navigator.clipboard.writeText(`${shareText} ${shareUrl}`); toast.success("Link copied!"); Swal.close(); });
      }
    });
  };

  const handleInquire = () => {
    Swal.fire({ title: 'Contact Agent', text: 'Messaging feature is coming soon!', icon: 'info' });
  };

  const openListingModal = (listing: any) => {
    setSelectedListing(listing);
    setCarouselIndex(0);
    setIsLiked(false);
  };

  const closeListingModal = () => {
    setSelectedListing(null);
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

  // --- Build display listings: real posts adapted + mock data ---
  const realListings = posts.map(post => ({
    id: post.id,
    title: post.content?.split('\n')[0]?.substring(0, 40) || 'New Listing',
    rooms: 0,
    bathrooms: 0,
    lotArea: 'N/A',
    floorArea: 'N/A',
    yearBuilt: 0,
    location: post.location || 'Bacolod',
    price: 'Contact for price',
    description: post.content || 'No description provided.',
    fullDescription: post.content || 'No description provided.',
    amenities: [],
    agentName: post.userName || 'Unknown Agent',
    agentRating: 4.0,
    agentPhone: 'N/A',
    agentAvatar: post.userAvatar || 'https://ui-avatars.com/api/?name=U&rounded=true',
    image: post.images?.[0] || post.image || '',
    images: post.images || (post.image ? [post.image] : []),
    status: 'For Sale',
    type: 'Property',
    listedDate: post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
    isReal: true,
    originalPost: post,
  }));

  const displayListings = [...realListings, ...MOCK_LISTINGS.map(m => ({ ...m, isReal: false, originalPost: null }))];

  return (
    <div className="dashboard-revamp">
      <ToastContainer position="top-right" theme="light" />

      {/* ========== NAVBAR ========== */}
      <nav className="dash-nav">
        <div className="dash-nav-left">
          <img src={logo} alt="MBC" className="dash-logo" />
          <div className="dash-search-wrapper">
            <FaSearch className="dash-search-icon" />
            <input type="text" placeholder="Look for agents..." className="dash-search-input" />
          </div>
        </div>
        <div className="dash-nav-right">
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
              {userData?.role === 'Agent' && (
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
                      <li>→ {listing.price}</li>
                    </ul>
                    <p className="glass-card-desc">{listing.description}</p>
                  </div>
                  <div className="glass-card-footer">
                    <div className="glass-card-agent">
                      <img src={listing.agentAvatar} alt={listing.agentName} />
                      <div className="agent-meta">
                        <span className="agent-name">{listing.agentName}</span>
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
                  <button className="glass-inquire-btn" onClick={(e) => { e.stopPropagation(); handleInquire(); }}>
                    INQUIRE NOW →
                  </button>
                </div>

                {/* Owner Actions (only for real posts owned by user) */}
                {listing.isReal && user?.uid === listing.originalPost?.userId && (
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
      {userData?.role === 'Agent' && (
        <button className="agent-fab" onClick={() => setShowCreateModal(true)} title="Create Listing">
          <FaPlus size={20} />
        </button>
      )}

      {/* ========== CREATE POST MODAL ========== */}
      {showCreateModal && (
        <div className="dash-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="dash-modal-card" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h2>New Listing</h2>
              <FaTimes className="dash-modal-close" onClick={() => setShowCreateModal(false)} />
            </div>
            <textarea
              className="dash-modal-textarea"
              placeholder={`What are you listing today, ${userData?.firstName || 'Agent'}?`}
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
            />
            {imageFiles.length > 0 && (
              <div className="dash-modal-previews">
                {imageFiles.map((file, i) => (
                  <div key={i} className="dash-modal-preview-item">
                    <img src={URL.createObjectURL(file)} alt="" />
                    <button onClick={() => removeImage(i)} className="dash-preview-remove">&#215;</button>
                  </div>
                ))}
              </div>
            )}
            <div className="dash-modal-actions">
              <button onClick={() => fileInputRef.current?.click()} className="dash-modal-action-btn"><FaImage /> Photos</button>
              <input type="file" ref={fileInputRef} hidden accept="image/*" multiple onChange={handleFileSelect} />
              <select value={postLocation} onChange={(e) => setPostLocation(e.target.value)} className="dash-modal-select">
                <option value="" disabled>Select Location</option>
                {BACOLOD_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <button onClick={handleCreatePost} disabled={isUploading} className="dash-modal-publish">
              {isUploading ? <FaSpinner className="spin" /> : 'Publish Listing'}
            </button>
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
        return (
          <div className="listing-modal-overlay" onClick={closeListingModal}>
            <div className="listing-modal" onClick={(e) => e.stopPropagation()}>
              {/* Close Button */}
              <button className="listing-modal-close" onClick={closeListingModal}>
                <FaTimes />
              </button>

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
                {/* Like Button */}
                <button className="listing-modal-like" onClick={() => setIsLiked(!isLiked)}>
                  {isLiked ? <FaHeart color="#ef4444" /> : <FaRegHeart />}
                </button>
                {/* Image Counter */}
                <span className="listing-modal-counter">{carouselIndex + 1} / {imgs.length}</span>
              </div>

              {/* Modal Body */}
              <div className="listing-modal-body">
                <div className="listing-modal-body-left">
                  {/* Title & Price */}
                  <div className="listing-modal-title-row">
                    <div>
                      <h2 className="listing-modal-title">{selectedListing.title}</h2>
                      <p className="listing-modal-location">
                        <FaMapMarkerAlt size={12} /> {selectedListing.location}, Bacolod City
                      </p>
                    </div>
                    <div className="listing-modal-price">{selectedListing.price}</div>
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
                  />
                  <h4 className="listing-modal-agent-name">{selectedListing.agentName}</h4>
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
                  <button className="listing-modal-inquire-btn" onClick={() => handleInquire()}>
                    INQUIRE NOW →
                  </button>
                  <button className="listing-modal-share-btn" onClick={() => handleShare(selectedListing)}>
                    <FaShare size={12} /> Share Listing
                  </button>
                </div>
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
        {userData?.role === 'Agent' && (
          <div onClick={() => navigate('/archive')} className="dash-mobile-nav-item">
            <FaTrash size={22} /><span>Trash</span>
          </div>
        )}
        <div onClick={() => navigate('/profile')} className="dash-mobile-nav-item">
          <FaUser size={22} /><span>Profile</span>
        </div>
        <div onClick={handleLogout} className="dash-mobile-nav-item">
          <FaSignOutAlt size={22} /><span>Logout</span>
        </div>
      </div>
    </div>
  );
}
