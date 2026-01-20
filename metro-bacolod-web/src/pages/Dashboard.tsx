import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase-config";
import { signOut } from "firebase/auth";
import api from "../services/api"; 
import { 
  FaHeart, FaRegHeart, FaShare, FaMapMarkerAlt, FaBookmark, FaSearch,
  FaUser, FaCog, FaSignOutAlt, FaCaretDown, 
  FaImage, FaPaperPlane, FaSpinner,
  FaEllipsisH, FaTrash, FaEdit, FaHome, FaUserFriends, FaStore, FaChevronLeft, FaChevronRight
} from "react-icons/fa"; 
import logo from "../assets/MBC Logo.png";
import "../App.css";
import Swal from 'sweetalert2';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BACOLOD_LOCATIONS } from "../constants/locations";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  
  // Post Creation State
  const [posts, setPosts] = useState<any[]>([]); 
  const [newCaption, setNewCaption] = useState("");
  const [postLocation, setPostLocation] = useState("");
  
  // CHANGED: Now storing an ARRAY of files
  const [imageFiles, setImageFiles] = useState<File[]>([]); 
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchPosts();
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) navigate("/");
      else setUser(currentUser);
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchPosts = async () => {
    try {
      const userLocation = user?.address || ""; 
      const response = await api.get(`/posts?userLocation=${userLocation}`);
      setPosts(response.data);
    } catch (error) {
      console.error("Failed to load posts", error);
    }
  };

  useEffect(() => {
    if (location.state && location.state.welcome) {
      toast.success(`👋 Welcome back, ${auth.currentUser?.displayName || 'User'}!`, {
        position: "top-right", autoClose: 3000, theme: "dark",
      });
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // --- NEW: HANDLE FILE SELECTION ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const totalFiles = imageFiles.length + selectedFiles.length;

      if (totalFiles > 10) {
        toast.warning("Maximum 10 images allowed!", { theme: "dark" });
        return;
      }
      
      setImageFiles([...imageFiles, ...selectedFiles]);
    }
  };

  const removeImage = (index: number) => {
    const newFiles = [...imageFiles];
    newFiles.splice(index, 1);
    setImageFiles(newFiles);
  };

  // --- CREATE POST (UPDATED) ---
  const handleCreatePost = async () => {
    // Validation: Min 1 Image
    if (imageFiles.length === 0) {
      toast.warning("Please upload at least 1 image.", { theme: "dark" });
      return;
    }
    if (imageFiles.length > 10) {
      toast.warning("Maximum 10 images allowed.", { theme: "dark" });
      return;
    }
    if (!postLocation) {
        toast.warning("Please select a location!", { theme: "dark" });
        return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('userId', user.uid);
      formData.append('agentName', user.displayName || "Metro Agent");
      formData.append('agentAvatar', user.photoURL || "");
      formData.append('content', newCaption);
      formData.append('location', postLocation);
      
      // Append all images with the same key 'images'
      imageFiles.forEach((file) => {
        formData.append('images', file);
      });

      await api.post('/posts/create', formData); 
      
      toast.success("Post published!", { theme: "dark" });
      
      setNewCaption("");
      setPostLocation("");
      setImageFiles([]); // Clear array
      
      fetchPosts(); 
    } catch (error) {
      console.error("Post Error:", error);
      toast.error("Failed to post.", { theme: "dark" });
    } finally {
      setIsUploading(false);
    }
  };

  // ... (handleDelete, handleEdit, toggleSave, handleLogout, toggleLike, handleShare remain same) ...
  const handleDelete = async (postId: string) => {
    setActiveMenuPostId(null); 
    const result = await Swal.fire({
      title: 'Move to Trash?', text: "You can undo this immediately.", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, remove', background: '#1e293b', color: '#fff'
    });
    if (result.isConfirmed) {
      const originalPosts = [...posts];
      setPosts(posts.filter(p => p.id !== postId));
      try {
        await api.delete(`/posts/${postId}`, { data: { userId: user.uid } });
        const UndoToast = ({ closeToast }: any) => (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Post deleted</span>
            <button onClick={async () => {
                try { await api.put(`/posts/${postId}/restore`, { userId: user.uid }); setPosts(originalPosts); toast.success("Restored!", { theme: "dark" }); closeToast(); } catch (err) { toast.error("Failed to restore", { theme: "dark" }); }
              }} style={{ background: 'transparent', border: '1px solid white', color: 'white', borderRadius: '4px', padding: '2px 8px', marginLeft: '10px', cursor: 'pointer', fontSize: '0.8rem' }}>UNDO</button>
          </div>
        );
        toast(<UndoToast />, { position: "bottom-center", autoClose: 5000, theme: "dark", hideProgressBar: false });
      } catch (error) { setPosts(originalPosts); toast.error("Could not delete", { theme: "dark" }); }
    }
  };

  const handleEdit = async (post: any) => {
    setActiveMenuPostId(null);
    const { value: newContent } = await Swal.fire({
      input: 'textarea', inputLabel: 'Edit Caption', inputValue: post.content,
      showCancelButton: true, background: '#1e293b', color: '#fff'
    });
    if (newContent) {
      try { await api.put(`/posts/${post.id}`, { userId: user.uid, content: newContent }); setPosts(posts.map(p => p.id === post.id ? { ...p, content: newContent } : p)); toast.success("Updated", { theme: "dark" }); } catch (error) { toast.error("Update failed", { theme: "dark" }); }
    }
  };

  const toggleSave = async (postId: string) => {
    const updatedPosts = posts.map(p => {
      if (p.id === postId) {
        const isSaved = p.savedBy?.includes(user.uid);
        return { ...p, savedBy: isSaved ? p.savedBy.filter((id: string) => id !== user.uid) : [...(p.savedBy || []), user.uid] };
      }
      return p;
    });
    setPosts(updatedPosts);
    try { await api.put(`/posts/${postId}/save`, { userId: user.uid }); } catch (error) { toast.error("Connection error", { theme: "dark" }); }
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    Swal.fire({ title: 'Log Out?', text: "Are you sure?", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#3b82f6', confirmButtonText: 'Yes, log out', background: '#1e293b', color: '#fff' }).then(async (result) => { if (result.isConfirmed) { await signOut(auth); navigate("/"); } });
  };

  const toggleLike = (postId: string | number) => {
     // Trigger reload to update UI properly with backend logic or implement optimistic update
     fetchPosts(); // Simple reload for now
     api.put(`/posts/${postId}/like`, { userId: user.uid });
  };
  
  const handleShare = async (post: any) => {
      if (navigator.share) { try { await navigator.share({ title: 'Metro Bacolod Connect', text: post.content, url: window.location.href }); } catch (error) { console.log('Error sharing:', error); } } else { toast.info("Link copied!", { position: "bottom-right", theme: "dark" }); }
  };

  // --- HELPER: IMAGE SLIDER COMPONENT ---
  const ImageSlider = ({ images }: { images: string[] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || images.length === 0) return null;
    if (images.length === 1) return <img src={images[0]} alt="Post" className="post-image" style={{ width: '100%', display: 'block' }} />;

    const nextSlide = () => setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    const prevSlide = () => setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));

    return (
      <div className="post-image-container" style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', marginBottom: '15px' }}>
        <img src={images[currentIndex]} alt={`Slide ${currentIndex}`} style={{ width: '100%', height: '400px', objectFit: 'cover', display: 'block' }} />
        
        <button onClick={prevSlide} style={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaChevronLeft /></button>
        <button onClick={nextSlide} style={{ position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaChevronRight /></button>
        
        <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '10px', color: 'white', fontSize: '0.8rem' }}>
          {currentIndex + 1} / {images.length}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-layout">
      {/* NAVBAR */}
      <nav className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <img src={logo} alt="MBC" className="brand-logo" />
          <div className="search-wrapper"><FaSearch className="search-icon" /><input type="text" placeholder="Search..." className="search-bar" /></div>
        </div>
        <div className="nav-right" style={{ position: "relative" }}>
          <div className="user-menu-trigger" onClick={() => setIsDropdownOpen(!isDropdownOpen)} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>{user?.displayName?.split(' ')[0]}</span>
            <img src={user?.photoURL || "https://ui-avatars.com/api/?name=User"} alt="Profile" className="nav-avatar" />
            <FaCaretDown size={12} color="#aaa" />
          </div>
          {isDropdownOpen && (
            <div className="dropdown-menu-container">
              <div className="dropdown-item" onClick={() => navigate('/profile')}><FaUser className="dropdown-icon" /> Profile</div>
              <div className="dropdown-item" onClick={() => navigate('/settings')}><FaCog className="dropdown-icon" /> Settings</div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item logout-item" onClick={handleLogout}><FaSignOutAlt className="dropdown-icon" /> Logout</div>
            </div>
          )}
        </div>
      </nav>

      <div className="dashboard-body">
        <aside className="sidebar-left">
          <div className="menu-item active"><FaHome size={22} /> <span>Listings</span></div>
          <div className="menu-item"><FaUserFriends size={22} /> <span>Agents</span></div>
          <div className="menu-item"><FaStore size={22} /> <span>Marketplace</span></div>
          <div className="menu-item"><FaBookmark size={22} /> <span>Saved</span></div>
        </aside>

        <main className="feed-container">
          <div className="post-card create-post-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: '15px' }}>
              <img src={user?.photoURL || "https://ui-avatars.com/api/?name=User"} alt="User" className="user-avatar" style={{ width: '50px', height: '50px' }} />
              <div style={{ flex: 1 }}>
                <textarea 
                  className="create-input" 
                  placeholder={`What are you listing today, ${user?.displayName?.split(' ')[0]}?`}
                  value={newCaption} onChange={(e) => setNewCaption(e.target.value)} rows={2}
                  style={{ resize: 'none', background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', fontSize: '1.1rem', marginBottom: '10px' }}
                />
                
                {/* PREVIEW GRID */}
                {imageFiles.length > 0 && (
                   <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '15px', paddingBottom: '5px' }}>
                     {imageFiles.map((file, index) => (
                       <div key={index} style={{ position: 'relative', minWidth: '100px' }}>
                         <img src={URL.createObjectURL(file)} alt="Preview" style={{ width: '100px', height: '100px', borderRadius: '8px', objectFit: 'cover' }} />
                         <button onClick={() => removeImage(index)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>✕</button>
                       </div>
                     ))}
                   </div>
                )}

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '15px' }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button onClick={() => fileInputRef.current?.click()} style={{ background: 'transparent', border: 'none', color: '#38BDF8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', padding: '5px 10px', borderRadius: '20px' }}>
                      <FaImage size={16} /> <span>Photos ({imageFiles.length}/10)</span>
                    </button>
                    {/* ADDED 'multiple' ATTRIBUTE */}
                    <input type="file" ref={fileInputRef} hidden accept="image/*" multiple onChange={handleFileSelect} />

                    <div style={{ position: 'relative' }}>
                        <FaMapMarkerAlt style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10B981', pointerEvents: 'none', fontSize: '14px' }} />
                        <select value={postLocation} onChange={(e) => setPostLocation(e.target.value)} style={{ padding: '6px 15px 6px 32px', background: 'rgba(255,255,255,0.08)', border: 'none', color: postLocation ? 'white' : '#aaa', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem', outline: 'none' }}>
                          <option value="" disabled>Add Location</option>
                          {BACOLOD_LOCATIONS.map((loc) => (<option key={loc} value={loc} style={{ color: "black" }}>{loc}</option>))}
                        </select>
                    </div>
                  </div>
                  <button onClick={handleCreatePost} disabled={isUploading} className="primary-btn" style={{ width: 'auto', padding: '8px 24px', fontSize: '0.9rem', borderRadius: '20px', display: 'flex', gap: '8px', alignItems: 'center', opacity: isUploading ? 0.7 : 1 }}>
                    {isUploading ? <FaSpinner className="spin" /> : <FaPaperPlane />} <span>Post</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {posts.length === 0 ? (
             <p style={{textAlign: 'center', color: '#aaa', marginTop: '40px', fontStyle: 'italic'}}>No listings yet.</p>
          ) : (
            posts.map((post: any) => (
              <div key={post.id} className="post-card" style={{ position: 'relative', marginTop: '20px' }}>
                <div className="post-header" style={{ justifyContent: 'space-between', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <img src={post.agentAvatar} alt="Avatar" className="user-avatar" />
                    <div>
                      <h4 className="author-name" style={{margin: 0, color: 'white'}}>{post.agentName}</h4>
                      <span className="timestamp" style={{fontSize: '0.8rem', color: '#888'}}>{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {post.userId === user?.uid && (
                    <div style={{ position: 'relative' }}>
                      <FaEllipsisH className="menu-icon" style={{ cursor: 'pointer', color: '#aaa' }} onClick={() => setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)} />
                      {activeMenuPostId === post.id && (
                        <div className="dropdown-menu-container" style={{ top: '30px', right: '0', width: '140px' }}>
                          <div className="dropdown-item" onClick={() => handleEdit(post)}><FaEdit /> Edit</div>
                          <div className="dropdown-item logout-item" onClick={() => handleDelete(post.id)}><FaTrash /> Delete</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="post-text" style={{ lineHeight: '1.5', marginBottom: '15px' }}>{post.content}</p>

                {/* --- DISPLAY IMAGES (Supports Legacy Single String or New Array) --- */}
                {Array.isArray(post.images) && post.images.length > 0 ? (
                  <ImageSlider images={post.images} />
                ) : post.image ? (
                  // Legacy support for old posts with single 'image' string
                  <div className="post-image-container" style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '15px' }}>
                    <img src={post.image} alt="Property" className="post-image" style={{ width: '100%', display: 'block' }} />
                  </div>
                ) : null}

                {(post.location || post.price) && (
                  <div className="property-details" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                    {post.location && <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '4px 10px', borderRadius: '15px', fontSize: '0.85rem' }}><FaMapMarkerAlt /> {post.location}</span>}
                    {post.price && <span className="price-badge" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', padding: '4px 10px', borderRadius: '15px', fontSize: '0.85rem', fontWeight: 'bold' }}>{post.price}</span>}
                  </div>
                )}
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '10px' }}></div>
                <div className="action-bar" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button className={`action-btn ${post.likedBy?.includes(user?.uid) ? 'active-like' : ''}`} onClick={() => toggleLike(post.id)} style={{ background: 'transparent', border: 'none', color: post.likedBy?.includes(user?.uid) ? '#ec4899' : '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {post.likedBy?.includes(user?.uid) ? <FaHeart /> : <FaRegHeart />} <span>{post.likes > 0 ? post.likes : 'Like'}</span>
                  </button>
                  <button className="action-btn" onClick={() => handleShare(post)} style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><FaShare /> <span>Share</span></button>
                  <button className={`action-btn ${post.savedBy?.includes(user?.uid) ? 'active-save' : ''}`} onClick={() => toggleSave(post.id)} style={{ background: 'transparent', border: 'none', color: post.savedBy?.includes(user?.uid) ? '#38BDF8' : '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><FaBookmark /> <span>{post.savedBy?.includes(user?.uid) ? 'Saved' : 'Save'}</span></button>
                </div>
              </div>
            ))
          )}
        </main>
        
        <aside className="sidebar-right">
          <div className="suggestion-box">
            <h4>Verified Agents</h4>
            <div className="suggestion-item"><div className="sug-avatar bg-blue"></div><span>Negros Realty</span></div>
            <div className="suggestion-item"><div className="sug-avatar bg-green"></div><span>Bacolod Homes</span></div>
          </div>
        </aside>
      </div>
      <ToastContainer position="top-right" theme="dark" />
    </div>
  );
}