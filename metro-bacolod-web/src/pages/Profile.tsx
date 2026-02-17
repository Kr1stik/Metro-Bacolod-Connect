import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import {
  FaSearch, FaUser, FaCog, FaSignOutAlt, FaCaretDown,
  FaTrash, FaStar, FaStarHalfAlt, FaRegStar, FaHome,
  FaEnvelope
} from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import "../App.css";
import Swal from "sweetalert2";

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

  const displayName = userData?.firstName
    ? `${userData.firstName} ${userData.lastName}`
    : user?.displayName || "User";

  const userRole = userData?.role || "Client";

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
            onClick={() => navigate("/dashboard")}
          >
            Create post
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
