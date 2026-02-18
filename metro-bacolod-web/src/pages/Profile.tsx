import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import {
  FaSearch, FaUser, FaCog, FaSignOutAlt, FaCaretDown,
  FaTrash, FaStar, FaStarHalfAlt, FaRegStar, FaHome,
  FaEnvelope, FaTimes, FaImage, FaSpinner, FaPlus
} from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import "../App.css";
import Swal from "sweetalert2";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BACOLOD_LOCATIONS } from "../constants/locations";

// --- MOCK RECENT POSTS ---
const MOCK_RECENT_POSTS = [
  {
    id: "rp-1",
    title: "The Lazy Den 2",
    rooms: 2,
    location: "Quezon Locsin",
    price: "6.8 million php",
    description:
      "Discover available lots in prime locations. Browse land options with complete details to help you choose the perfect place to build or invest.",
    agentName: "Wynands Burger",
    agentRating: 3.8,
    agentAvatar:
      "https://ui-avatars.com/api/?name=WB&background=6366f1&color=fff&rounded=true&size=40",
    image:
      "https://images.pexels.com/photos/3013440/pexels-photo-3013440.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    id: "rp-2",
    title: "The Lazy Den 2",
    rooms: 2,
    location: "Quezon Locsin",
    price: "6.8 million php",
    description:
      "Discover available lots in prime locations. Browse land options with complete details to help you choose the perfect place to build or invest.",
    agentName: "Wynands Burger",
    agentRating: 3.8,
    agentAvatar:
      "https://ui-avatars.com/api/?name=WB&background=6366f1&color=fff&rounded=true&size=40",
    image:
      "https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    id: "rp-3",
    title: "The Lazy Den 2",
    rooms: 2,
    location: "Quezon Locsin",
    price: "6.8 million php",
    description:
      "Discover available lots in prime locations. Browse land options with complete details to help you choose the perfect place to build or invest.",
    agentName: "Wynands Burger",
    agentRating: 3.8,
    agentAvatar:
      "https://ui-avatars.com/api/?name=WB&background=6366f1&color=fff&rounded=true&size=40",
    image:
      "https://images.pexels.com/photos/440731/pexels-photo-440731.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    id: "rp-4",
    title: "The Lazy Den 2",
    rooms: 2,
    location: "Quezon Locsin",
    price: "6.8 million php",
    description:
      "Discover available lots in prime locations. Browse land options with complete details to help you choose the perfect place to build or invest.",
    agentName: "Wynands Burger",
    agentRating: 3.8,
    agentAvatar:
      "https://ui-avatars.com/api/?name=WB&background=6366f1&color=fff&rounded=true&size=40",
    image:
      "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600",
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

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

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
        } catch (err) {
          console.error("Error fetching user data:", err);
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

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

  const handleInquire = () => {
    Swal.fire({
      title: "Inquiry Sent!",
      text: "The agent will contact you shortly.",
      icon: "success",
      confirmButtonColor: "#111827",
    });
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
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to publish: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const displayName = userData?.firstName
    ? `${userData.firstName} ${userData.lastName}`
    : user?.displayName || "User";

  const userRole = userData?.role || "Client";

  return (
    <div className="profile-page">
      <ToastContainer position="top-right" theme="light" />
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
              placeholder="Look for agents..."
            />
          </div>
        </div>
        <div className="dash-nav-right">
          <div
            className="dash-user-trigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="dash-user-text">
              <span className="dash-user-name">{displayName}</span>
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
              {userData?.role === "Agent" && (
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
                user?.photoURL ||
                "https://ui-avatars.com/api/?name=User&background=d1d5db&color=6b7280&rounded=true&size=256"
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
              {userData?.address || "Bacolod"}
            </p>
            <p className="profile-info-line">
              <strong>Number:</strong> {userData?.phone || "—"}
            </p>
            <p className="profile-info-line">
              <strong>Email:</strong> {user?.email || "—"}
            </p>
          </div>
          <p className="profile-bio">
            Lorem Ipsum is simply dummy text of the printing and typesetting
            industry. Lorem Ipsum has been the industry's standard dummy text
            ever since the 1500s, when an unknown printer took a galley of type
            and scrambled it to make a type specimen book. It has survived not
            only five centuries, but also the leap into electronic typesetting,
            remaining essentially unchanged. It was popularised in the 1960s
            with the release of Letraset sheets containing Lorem Ipsum
            passages, and more recently with desktop publishing software like
            Aldus PageMaker including versions of Lorem Ipsum.
          </p>
          <button
            className="profile-create-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <FaPlus size={12} /> Create Listing
          </button>
        </aside>

        {/* --- RIGHT: Recent Posts --- */}
        <section className="profile-posts-section">
          <h2 className="profile-posts-heading">Recent posts:</h2>
          <div className="profile-posts-grid">
            {MOCK_RECENT_POSTS.map((listing) => (
              <div className="glass-listing-card profile-card" key={listing.id}>
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
                      <li>→ {listing.price}</li>
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
                    onClick={() => handleInquire()}
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

      {/* ========== MOBILE BOTTOM NAV ========== */}
      <div className="dash-mobile-nav">
        <div className="mobile-nav-item" onClick={() => navigate("/dashboard")}>
          <FaHome />
          <span>Home</span>
        </div>
        <div className="mobile-nav-item active">
          <FaUser />
          <span>Profile</span>
        </div>
        <div className="mobile-nav-item" onClick={() => navigate("/dashboard")}>
          <FaEnvelope />
          <span>Messages</span>
        </div>
      </div>
    </div>
  );
}
