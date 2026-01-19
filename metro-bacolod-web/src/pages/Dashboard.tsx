import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase-config";
import { signOut } from "firebase/auth";
import { 
  FaHeart, FaRegHeart, FaShare, FaMapMarkerAlt, FaBed, FaBath, 
  FaHome, FaUserFriends, FaStore, FaBookmark, FaSearch
} from "react-icons/fa"; 
import logo from "../assets/MBC Logo.png";
import "../App.css";

// MOCK DATA
const MOCK_POSTS = [
  {
    id: 1,
    agentName: "Metro Bacolod Realty",
    agentAvatar: "https://ui-avatars.com/api/?name=Metro+Realty&background=38BDF8&color=fff",
    time: "2 hours ago",
    content: "Just Listed! Modern minimalist house in Camella Bacolod South. Perfect for starting families.",
    price: "₱3,500,000",
    image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b91d?auto=format&fit=crop&w=1000&q=80",
    location: "Tangub, Bacolod City",
    beds: 3,
    baths: 2,
    likes: 24,
  },
  {
    id: 2,
    agentName: "Juan Dela Cruz",
    agentAvatar: "https://ui-avatars.com/api/?name=Juan+Dela+Cruz&background=random",
    time: "5 hours ago",
    content: "Looking for a prime lot? Corner lot available in Sta. Clara Subdivision. Clean title!",
    price: "₱12,000 / sqm",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80",
    location: "Mandalagan, Bacolod City",
    beds: 0,
    baths: 0,
    likes: 15,
  }
];

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [likedPosts, setLikedPosts] = useState<number[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) navigate("/");
      else setUser(currentUser);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const toggleLike = (postId: number) => {
    if (likedPosts.includes(postId)) {
      setLikedPosts(likedPosts.filter(id => id !== postId));
    } else {
      setLikedPosts([...likedPosts, postId]);
    }
  };

  const handleShare = async (post: any) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Metro Bacolod Connect',
          text: `Check out this property: ${post.content}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="dashboard-layout">
      
      {/* --- NAVBAR --- */}
      <nav className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <img src={logo} alt="MBC" className="brand-logo" />
          <div className="search-wrapper">
            <FaSearch className="search-icon" />
            <input type="text" placeholder="Search properties..." className="search-bar" />
          </div>
        </div>
        
        <div className="nav-right">
          <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>
             {user?.displayName?.split(' ')[0]}
          </span>
          <img 
            src={user?.photoURL || "https://ui-avatars.com/api/?name=User"} 
            alt="Profile" 
            className="nav-avatar"
            onClick={handleLogout}
          />
        </div>
      </nav>

      {/* --- MAIN LAYOUT (3 Columns) --- */}
      <div className="dashboard-body">
        
        {/* LEFT SIDEBAR (Menu) */}
        <aside className="sidebar-left">
          <div className="menu-item active">
            <FaHome size={22} />
            <span>Home</span>
          </div>
          <div className="menu-item">
            <FaUserFriends size={22} />
            <span>Agents</span>
          </div>
          <div className="menu-item">
            <FaStore size={22} />
            <span>Marketplace</span>
          </div>
          <div className="menu-item">
            <FaBookmark size={22} />
            <span>Saved</span>
          </div>
        </aside>

        {/* CENTER FEED (Newsfeed) */}
        <main className="feed-container">
          
          {/* Create Post Input */}
          <div className="post-card create-post-card">
            <img 
              src={user?.photoURL || "https://ui-avatars.com/api/?name=User"} 
              alt="User" 
              className="user-avatar" 
            />
            <input 
              type="text" 
              placeholder={`What are you looking for, ${user?.displayName?.split(' ')[0]}?`} 
              className="create-input" 
            />
          </div>

          {/* POST LOOP */}
          {MOCK_POSTS.map((post) => (
            <div key={post.id} className="post-card">
              <div className="post-header">
                <img src={post.agentAvatar} alt={post.agentName} className="user-avatar" />
                <div>
                  <h4 className="author-name">{post.agentName}</h4>
                  <span className="timestamp">{post.time}</span>
                </div>
              </div>

              <p className="post-text">{post.content}</p>
              
              <div className="post-image-container">
                <img src={post.image} alt="Property" className="post-image" />
              </div>

              {post.beds > 0 && (
                <div className="property-details">
                  <span><FaMapMarkerAlt /> {post.location}</span>
                  <span><FaBed /> {post.beds} Beds</span>
                  <span><FaBath /> {post.baths} Baths</span>
                  <span className="price-badge">{post.price}</span>
                </div>
              )}

              <div className="action-bar">
                <button 
                  className={`action-btn ${likedPosts.includes(post.id) ? 'active-like' : ''}`}
                  onClick={() => toggleLike(post.id)}
                >
                  {likedPosts.includes(post.id) ? <FaHeart /> : <FaRegHeart />}
                  <span>Like</span>
                </button>
                <button className="action-btn" onClick={() => handleShare(post)}>
                  <FaShare />
                  <span>Share</span>
                </button>
              </div>
            </div>
          ))}
        </main>

        {/* RIGHT SIDEBAR (Suggestions) */}
        <aside className="sidebar-right">
          <div className="suggestion-box">
            <h4>Verified Agents</h4>
            <div className="suggestion-item">
              <div className="sug-avatar bg-blue"></div>
              <span>Negros Realty</span>
            </div>
            <div className="suggestion-item">
              <div className="sug-avatar bg-green"></div>
              <span>Bacolod Homes</span>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}