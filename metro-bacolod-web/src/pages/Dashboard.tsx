import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { signOut } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, getDocs, addDoc, updateDoc } from "firebase/firestore"; 
import { 
  FaHeart, FaRegHeart, FaShare, FaMapMarkerAlt, FaBookmark, FaSearch,
  FaUser, FaCog, FaSignOutAlt, FaCaretDown, 
  FaImage, FaSpinner,
  FaHome, FaTrash, FaFilter, FaEnvelope, FaPen, FaSave, FaTimes
} from "react-icons/fa"; 
import logo from "../assets/MBC Logo.png";
import "../App.css";
import Swal from 'sweetalert2';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BACOLOD_LOCATIONS } from "../constants/locations";

// --- COMPONENT: IMAGE SLIDER ---
const ImageSlider = ({ images }: { images: string[] }) => {
    const [idx, setIdx] = useState(0);
    if (!images || images.length === 0) return null;

    if (images.length === 1) {
        return <img src={images[0]} alt="Post" style={{ width: '100%', borderRadius: '8px', display: 'block', maxHeight: '500px', objectFit: 'cover' }} />;
    }

    return (
        <div style={{position: 'relative', borderRadius: '8px', overflow: 'hidden', maxHeight: '500px'}}>
            <img src={images[idx]} alt={`Slide ${idx}`} style={{width: '100%', height: 'auto', minHeight: '300px', objectFit: 'cover', display: 'block'}} />
            <button onClick={(e) => {e.stopPropagation(); setIdx(idx === 0 ? images.length - 1 : idx - 1)}} 
                style={{position:'absolute', top:'50%', left: 10, transform: 'translateY(-50%)', background:'rgba(0,0,0,0.6)', color:'white', border:'none', borderRadius:'50%', width:35, height:35, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>‹</button>
            <button onClick={(e) => {e.stopPropagation(); setIdx(idx === images.length - 1 ? 0 : idx + 1)}} 
                style={{position:'absolute', top:'50%', right: 10, transform: 'translateY(-50%)', background:'rgba(0,0,0,0.6)', color:'white', border:'none', borderRadius:'50%', width:35, height:35, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>›</button>
            <div style={{position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem'}}>{idx + 1} / {images.length}</div>
        </div>
    );
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

  // --- EDIT MODE STATES ---
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [newEditFiles, setNewEditFiles] = useState<File[]>([]);
  const editFileRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

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

  useEffect(() => {
    if (location.state?.welcome && user && !toastShown.current) {
      const displayName = userData?.firstName 
        ? `${userData.firstName} ${userData.lastName}` 
        : (user.displayName || 'User');

      toast.success(`👋 Welcome back, ${displayName}!`, { theme: "dark" });
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
      
      const fetchedPosts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timeAgo: formatTimeAgo(data.createdAt) 
        };
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

  const toggleDropdown = (postId: string) => activeDropdown === postId ? setActiveDropdown(null) : setActiveDropdown(postId);
  
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
      
      toast.success("Post published!");
      setNewCaption(""); setPostLocation(""); setImageFiles([]);
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
          await updateDoc(postRef, {
              content: editCaption,
              images: finalImages,
              image: finalImages[0] 
          });

          toast.success("Post updated!");
          setEditingPostId(null);
          fetchPosts(filterLocation);

      } catch (error) {
          toast.error("Failed to update post");
      } finally {
          setIsUploading(false);
      }
  };

  const handleLogout = () => {
    Swal.fire({ title: 'Log Out?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes' })
    .then(async (res) => { if(res.isConfirmed) { await signOut(auth); navigate("/"); } });
  };
  
  const handleDelete = async (postId: string) => { 
      setActiveDropdown(null);
      const result = await Swal.fire({ title: 'Move to Trash?', text: "Items in trash will be deleted after 30 days.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Yes, move to trash', background: '#1e293b', color: '#fff' });
      if (result.isConfirmed) {
          try {
              const postRef = doc(db, "posts", postId);
              await updateDoc(postRef, { deletedAt: new Date().toISOString(), isArchived: true });
              setPosts(posts.filter(p => p.id !== postId));
              toast.success("Post moved to Trash", { theme: "dark" });
          } catch (error) { toast.error("Failed to move to trash", { theme: "dark" }); }
      }
  };

  const handleShare = async (post: any) => {
    const shareUrl = window.location.href; 
    const shareText = `Check out this listing by ${post.userName}: ${post.content}`;
    const listContainerStyle = 'display: flex; flex-direction: column; border: 1px solid #334155; border-radius: 8px; overflow: hidden; margin-top: 10px;';
    const itemStyle = 'padding: 15px; cursor: pointer; border-bottom: 1px solid #334155; color: #e2e8f0; text-align: left; font-size: 0.9rem; font-weight: 500; transition: background 0.2s;';
    const lastItemStyle = itemStyle.replace('border-bottom: 1px solid #334155;', ''); 
    const hoverEvents = 'onmouseover="this.style.background=\'#334155\'" onmouseout="this.style.background=\'transparent\'"';

    await Swal.fire({
      title: '<span style="color: white; font-size: 1.1rem; font-weight: 600;">Share Post</span>',
      html: `
        <div style="${listContainerStyle}">
          <div id="share-fb" style="${itemStyle}" ${hoverEvents}>Share to Facebook</div>
          <div id="share-x" style="${itemStyle}" ${hoverEvents}>Share to X (Twitter)</div>
          <div id="share-copy" style="${lastItemStyle}" ${hoverEvents}>Copy Link</div>
          ${('share' in navigator) ? `<div id="share-native" style="border-top: 1px solid #334155; padding: 15px; cursor: pointer; color: #94a3b8; text-align: center; font-size: 0.85rem;" ${hoverEvents}>More Options...</div>` : ''}
        </div>
      `,
      showConfirmButton: false, showCloseButton: true, background: '#1e293b', padding: '20px', width: '320px', 
      didOpen: () => {
        document.getElementById('share-fb')?.addEventListener('click', () => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank'); Swal.close(); });
        document.getElementById('share-x')?.addEventListener('click', () => { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank'); Swal.close(); });
        document.getElementById('share-copy')?.addEventListener('click', () => { navigator.clipboard.writeText(`${shareText} ${shareUrl}`); toast.success("Link copied", { theme: "dark", autoClose: 2000 }); Swal.close(); });
        document.getElementById('share-native')?.addEventListener('click', async () => { try { if (navigator.share) { await navigator.share({ title: 'Metro Bacolod Connect', text: shareText, url: shareUrl }); } Swal.close(); } catch (err) { /* ignore */ } });
      }
    });
  };

  const handleInquire = () => {
      Swal.fire({ title: 'Contact Agent', text: 'Messaging feature is coming soon!', icon: 'info', background: '#1e293b', color: '#fff' });
  };

  return (
    <div className="dashboard-layout">
      <ToastContainer position="top-right" theme="dark" toastStyle={{ backgroundColor: "#1e293b", color: "white" }} />

      <nav className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <img src={logo} alt="MBC" className="brand-logo" />
          <div className="search-wrapper"><FaSearch className="search-icon" /><input type="text" placeholder="Search..." className="search-bar" /></div>
        </div>
        <div className="nav-right" style={{ position: "relative" }}>
          <div className="user-menu-trigger" onClick={() => setIsDropdownOpen(!isDropdownOpen)} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <div style={{textAlign: 'right'}}>
                <div style={{ fontWeight: "700", fontSize: "0.9rem", color: 'white' }}>{userData?.firstName ? `${userData.firstName} ${userData.lastName}` : (user?.displayName || "Loading...")}</div>
                <div style={{ fontSize: "0.75rem", color: '#aaa' }}>{userData?.role || "User"} • {userData?.customId}</div>
            </div>
            <img src={user?.photoURL || "https://ui-avatars.com/api/?name=User"} alt="Profile" className="nav-avatar" style={{ borderRadius: '50%', width: '40px', height: '40px', objectFit: 'cover' }} />
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
          {userData?.role === 'Agent' && (<div className="menu-item" onClick={() => navigate('/archive')}><FaTrash size={22} /> <span>Trash</span></div>)}
        </aside>

        <main className="feed-container">
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e293b', padding: '10px 20px', borderRadius: '12px', border: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaFilter /> Filtering by:
                </span>
                <select value={filterLocation} onChange={handleFilterChange} style={{ background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', outline: 'none' }}>
                    <option value="All">Show All Locations</option>
                    {BACOLOD_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
            </div>

            {userData?.role === 'Agent' && (
                <div className="post-card create-post-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <img src={user?.photoURL} className="user-avatar" style={{width: '50px', height: '50px', borderRadius: '50%'}} />
                        <div style={{flex: 1}}>
                             <textarea className="create-input" placeholder={`What are you listing today, ${userData?.firstName || 'Agent'}?`} value={newCaption} onChange={(e) => setNewCaption(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreatePost(); }}} />
                             {imageFiles.length > 0 && (
                                 <div style={{display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '10px'}}>
                                     {imageFiles.map((file, i) => (
                                         <div key={i} style={{position:'relative'}}>
                                             <img src={URL.createObjectURL(file)} style={{width: 60, height: 60, borderRadius: 8, objectFit: 'cover'}} />
                                             <button onClick={() => removeImage(i)} style={{position:'absolute', top:0, right:0, background:'red', color:'white', border:'none', borderRadius:'50%', width:15, height:15, fontSize:10, cursor:'pointer'}}>x</button>
                                         </div>
                                     ))}
                                 </div>
                             )}
                             <div style={{display:'flex', justifyContent:'space-between', marginTop: '10px'}}>
                                <div style={{display: 'flex', gap: '10px'}}>
                                    <button onClick={() => fileInputRef.current?.click()} style={{background: 'transparent', border:'none', color: '#38BDF8', cursor: 'pointer', display: 'flex', gap: '5px', alignItems: 'center'}}><FaImage /> Photos</button>
                                    <input type="file" ref={fileInputRef} hidden accept="image/*" multiple onChange={handleFileSelect} />
                                    <select value={postLocation} onChange={(e) => setPostLocation(e.target.value)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '20px', padding: '5px 10px' }}>
                                        <option value="" disabled>Location</option>
                                        {BACOLOD_LOCATIONS.map(loc => <option key={loc} value={loc} style={{color:'black'}}>{loc}</option>)}
                                    </select>
                                </div>
                                <button onClick={handleCreatePost} className="primary-btn" disabled={isUploading}>{isUploading ? <FaSpinner className="spin"/> : "Post"}</button>
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {posts.length === 0 ? (
                <p style={{textAlign: 'center', color: '#aaa', marginTop: '40px'}}>No listings found in <span style={{color: '#38BDF8'}}>{filterLocation || "this area"}</span>.</p>
            ) : (
                posts.map((post: any) => (
                    <div key={post.id} className="post-card" style={{marginTop: '20px', padding: '15px'}}>
                        {editingPostId === post.id ? (
                            <div>
                                <h4 style={{color: 'white', marginBottom: '10px'}}>Edit Post</h4>
                                <textarea className="create-input" value={editCaption} onChange={(e) => setEditCaption(e.target.value)} style={{ width: '100%', minHeight: '80px', background: '#0f172a', border: '1px solid #334155' }} />
                                <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '15px 0'}}>
                                    {editImages.map((img, i) => (<div key={i} style={{position:'relative'}}><img src={img} style={{width: 70, height: 70, borderRadius: 8, objectFit: 'cover'}} /><button onClick={() => removeEditImage(i)} style={{position:'absolute', top:-5, right:-5, background:'#ef4444', color:'white', border:'none', borderRadius:'50%', width:20, height:20, fontSize:12, cursor:'pointer'}}>x</button></div>))}
                                    {newEditFiles.map((file, i) => (<div key={i} style={{position:'relative'}}><img src={URL.createObjectURL(file)} style={{width: 70, height: 70, borderRadius: 8, objectFit: 'cover', border: '1px solid #38BDF8'}} /><button onClick={() => removeNewEditFile(i)} style={{position:'absolute', top:-5, right:-5, background:'#ef4444', color:'white', border:'none', borderRadius:'50%', width:20, height:20, fontSize:12, cursor:'pointer'}}>x</button></div>))}
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <button onClick={() => editFileRef.current?.click()} style={{color: '#38BDF8', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', gap: '5px', alignItems: 'center'}}><FaImage /> Add Photos</button>
                                    <input type="file" ref={editFileRef} hidden accept="image/*" multiple onChange={handleEditFileSelect} />
                                    <div style={{display: 'flex', gap: '10px'}}><button onClick={() => setEditingPostId(null)} style={{background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer'}}>Cancel</button><button onClick={saveEdit} className="primary-btn" disabled={isUploading}>{isUploading ? "Saving..." : "Save"}</button></div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px'}}>
                                    <img src={post.userAvatar} style={{width: 40, height: 40, borderRadius: '50%'}} />
                                    <div style={{flex: 1}}><h4 style={{color:'white', margin: 0}}>{post.userName}</h4><span style={{fontSize: '0.8rem', color: '#aaa'}}>{post.userRole} • {post.timeAgo}</span></div>
                                    {user?.uid === post.userId && (<div style={{position: 'relative'}}><button onClick={() => toggleDropdown(post.id)} style={{background:'transparent', border:'none', color:'#aaa', fontSize:'1.2rem', cursor:'pointer'}}>⋮</button>{activeDropdown === post.id && (<div style={{position:'absolute', right:0, top:20, background:'#1e293b', border:'1px solid #334155', borderRadius:8, zIndex:10, width:160, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)'}}><button onClick={() => startEdit(post)} style={{width:'100%', padding:'12px', background:'transparent', color:'white', border:'none', cursor:'pointer', textAlign:'left', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', borderBottom: '1px solid #334155'}}><FaPen size={12} /> Edit Post</button><button onClick={() => handleDelete(post.id)} style={{width:'100%', padding:'12px', background:'transparent', color:'#ef4444', border:'none', cursor:'pointer', textAlign:'left', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem'}}><FaTrash size={12} /> Move to Trash</button></div>)}</div>)}
                                </div>
                                <p style={{color:'#ddd', marginBottom: '10px'}}>{post.content}</p>
                                <div style={{marginBottom: '10px'}}>{post.images && post.images.length > 0 ? (<ImageSlider images={post.images} />) : post.image ? (<img src={post.image} alt="Post" style={{width: '100%', borderRadius: 8}} />) : null}</div>
                                <div style={{marginTop: '10px', display:'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    {post.location ? (<span style={{background:'rgba(16, 185, 129, 0.1)', color:'#10B981', padding:'2px 8px', borderRadius:10, fontSize:'0.8rem', display:'flex', alignItems:'center', gap:4}}><FaMapMarkerAlt /> {post.location}</span>) : <div></div>}
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => handleShare(post)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}><FaShare /> Share</button>
                                        {userData?.role !== 'Agent' && user?.uid !== post.userId && (<button onClick={handleInquire} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><FaEnvelope /> Inquire</button>)}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))
            )}
        </main>
        
        <aside className="sidebar-right">
           <div className="suggestion-box">
             <h4>Verified Agents</h4>
             <div className="suggestion-item"><div className="sug-avatar bg-blue" style={{borderRadius: '50%'}}></div><span>Negros Realty</span></div>
           </div>
        </aside>

        {/* --- MOBILE BOTTOM NAVIGATION (Visible only on Mobile via CSS) --- */}
        <div className="mobile-bottom-nav" style={{ 
            display: 'none', /* Hidden by default (desktop), shown via CSS media query */
            position: 'fixed', bottom: 0, left: 0, width: '100%', 
            background: '#1e293b', borderTop: '1px solid #334155', 
            justifyContent: 'space-around', alignItems: 'center', padding: '10px 0', zIndex: 100 
        }}>
            <div onClick={() => navigate('/dashboard')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white', cursor: 'pointer' }}>
                <FaHome size={24} />
                <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Home</span>
            </div>
            
            {/* Show Trash only for Agents */}
            {userData?.role === 'Agent' && (
                <div onClick={() => navigate('/archive')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#ef4444', cursor: 'pointer' }}>
                    <FaTrash size={24} />
                    <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Trash</span>
                </div>
            )}

            <div onClick={() => navigate('/profile')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8', cursor: 'pointer' }}>
                <FaUser size={24} />
                <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Profile</span>
            </div>

            <div onClick={handleLogout} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8', cursor: 'pointer' }}>
                <FaSignOutAlt size={24} />
                <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Logout</span>
            </div>
        </div>

        {/* CSS to show Bottom Nav on Mobile */}
        <style>{`
            @media (max-width: 768px) {
                .mobile-bottom-nav { display: flex !important; }
            }
        `}</style>

      </div>
    </div>
  );
}