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
  FaCalendarAlt, FaPhoneAlt, FaHeart, FaRegHeart
} from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import "../App.css";
import Swal from 'sweetalert2';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BACOLOD_LOCATIONS } from "../constants/locations";

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
  };

  const handleCreateListing = async () => {
    if (!listingTitle.trim()) return toast.warning("Enter a listing title.");
    if (!listingLocation) return toast.warning("Select a location.");
    if (!listingPrice.trim()) return toast.warning("Enter a price.");
    if (imageFiles.length === 0) return toast.warning("Upload at least 1 image.");

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
        createdAt: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        savedBy: [],
        isArchived: false,
      });

      toast.success("Listing published!");
      resetCreateForm();
      setShowCreateModal(false);
      fetchPosts(filterLocation);
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to publish: " + error.message);
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

  const handleInquire = async (listing?: any) => {
    if (!listing) return;

    const agentId = listing.originalPost?.userId;
    
    // Prevent messaging yourself
    if (user?.uid === agentId) {
      return toast.info("You cannot inquire about your own listing.");
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
      toast.error("Failed to start chat.");
    }
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
    listedDate: post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
    originalPost: post,
  }));

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
                  <button className="glass-inquire-btn" onClick={(e) => { e.stopPropagation(); handleInquire(listing); }}>
                    INQUIRE NOW →
                </button>
                </div>

                {/* Owner Actions (only for posts owned by user) */}
                {user?.uid === listing.originalPost?.userId && (
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
                  <label>Price *</label>
                  <input
                    type="text"
                    className="create-listing-input"
                    placeholder="e.g. 2.8 million php"
                    value={listingPrice}
                    onChange={(e) => setListingPrice(e.target.value)}
                  />
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
                  <button className="listing-modal-inquire-btn" onClick={() => handleInquire(selectedListing)}>
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

        {userData?.role === 'Agent' && (
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