import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config"; // Now this import will work!
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { 
  FaTrashRestore, FaTimes, FaUser, FaCaretDown, FaHome, FaUserFriends, 
  FaStore, FaBookmark, FaTrashAlt, FaClock 
} from "react-icons/fa"; 
import logo from "../assets/MBC Logo.png";
import "../App.css";
import Swal from 'sweetalert2';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Archive() {
  const [user, setUser] = useState<any>(null);
  const [archivedPosts, setArchivedPosts] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) navigate("/");
      else {
        setUser(currentUser);
        fetchArchivedPosts(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // --- FETCH ARCHIVED POSTS (Direct from Firebase) ---
  const fetchArchivedPosts = async (userId: string) => {
    try {
      const q = query(
        collection(db, "posts"), 
        where("isArchived", "==", true),
        where("userId", "==", userId) // Only show MY archived posts
      );
      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArchivedPosts(posts);
    } catch (error) {
      console.error("Failed to load archive", error);
      toast.error("Could not load trash");
    }
  };

  // --- RESTORE FUNCTION ---
  const handleRestore = async (postId: string) => {
    try {
      await updateDoc(doc(db, "posts", postId), {
        isArchived: false,
        deletedAt: null 
      });
      setArchivedPosts(prev => prev.filter(p => p.id !== postId));
      toast.success("Post restored to timeline", { theme: "dark" });
    } catch (error) {
      toast.error("Failed to restore", { theme: "dark" });
    }
  };

  // --- HARD DELETE (PERMANENT) ---
  const handlePermanentDelete = async (postId: string) => {
    const result = await Swal.fire({
      title: 'Delete Forever?', 
      text: "This action cannot be undone.", 
      icon: 'warning',
      showCancelButton: true, 
      confirmButtonColor: '#d33', 
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete forever', 
      background: '#1e293b', 
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "posts", postId));
        setArchivedPosts(prev => prev.filter(p => p.id !== postId));
        toast.success("Post permanently deleted", { theme: "dark" });
      } catch (error) {
        toast.error("Could not delete", { theme: "dark" });
      }
    }
  };

  // --- 30-DAY COUNTDOWN HELPER ---
  const getDaysRemaining = (deletedAt: string) => {
    if (!deletedAt) return 30;
    const deleteDate = new Date(deletedAt).getTime();
    const currentDate = new Date().getTime();
    const diffTime = Math.abs(currentDate - deleteDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const remaining = 30 - diffDays;
    return remaining > 0 ? remaining : 0;
  };

  const handleLogout = async () => { /* reuse logout */ };

  return (
    <div className="dashboard-layout">
      {/* NAVBAR */}
      <nav className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <img src={logo} alt="MBC" className="brand-logo" onClick={() => navigate('/dashboard')} style={{cursor: 'pointer'}} />
          <h3 style={{ margin: 0, color: 'white', fontWeight: 600 }}>Archive</h3>
        </div>
        <div className="nav-right" style={{ position: "relative" }}>
          <div className="user-menu-trigger" onClick={() => setIsDropdownOpen(!isDropdownOpen)} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
             <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>{user?.displayName?.split(' ')[0]}</span>
             <img src={user?.photoURL || "https://ui-avatars.com/api/?name=User"} alt="Profile" className="nav-avatar" style={{ borderRadius: '50%', width: '40px', height: '40px', objectFit: 'cover' }} />
             <FaCaretDown size={12} color="#aaa" />
          </div>
        </div>
      </nav>

      <div className="dashboard-body">
        <aside className="sidebar-left">
          <div className="menu-item" onClick={() => navigate('/dashboard')}><FaHome size={22} /> <span>Listings</span></div>
          <div className="menu-item"><FaUserFriends size={22} /> <span>Agents</span></div>
          <div className="menu-item"><FaStore size={22} /> <span>Marketplace</span></div>
          <div className="menu-item"><FaBookmark size={22} /> <span>Saved</span></div>
          <div className="menu-item active" style={{ color: '#ef4444' }}><FaTrashAlt size={22} /> <span>Trash</span></div>
        </aside>

        <main className="feed-container">
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155' }}>
             <h2 style={{ color: 'white', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
               <FaTrashAlt color="#ef4444" /> Trash
             </h2>
             <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '5px' }}>
               Items are automatically removed after 30 days.
             </p>
          </div>

          {archivedPosts.length === 0 ? (
             <p style={{textAlign: 'center', color: '#aaa', marginTop: '40px', fontStyle: 'italic'}}>Trash is empty.</p>
          ) : (
            archivedPosts.map((post: any) => {
              const daysLeft = getDaysRemaining(post.deletedAt);
              return (
                <div key={post.id} className="post-card" style={{ position: 'relative', marginTop: '20px', opacity: 0.8 }}>
                  <div style={{ padding: '15px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.1)' }}>
                     <span style={{ color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaClock /> Auto-delete in {daysLeft} days
                     </span>
                     <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          onClick={() => handleRestore(post.id)}
                          style={{ background: 'transparent', border: '1px solid #38BDF8', color: '#38BDF8', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}
                        >
                          <FaTrashRestore /> Restore
                        </button>
                        <button 
                          onClick={() => handlePermanentDelete(post.id)}
                          style={{ background: '#ef4444', border: 'none', color: 'white', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}
                        >
                          <FaTimes /> Delete
                        </button>
                     </div>
                  </div>

                  <div style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                      <img src={post.userAvatar || "https://ui-avatars.com/api/?name=User"} style={{ borderRadius: '50%', width: '40px', height: '40px' }} />
                      <div>
                        <h4 className="author-name" style={{margin: 0, color: 'white'}}>{post.userName}</h4>
                        <span className="timestamp" style={{fontSize: '0.8rem', color: '#94a3b8'}}>{post.timeAgo}</span>
                      </div>
                    </div>
                    <p style={{ color: '#ccc' }}>{post.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </main>
      </div>
      <ToastContainer position="top-right" theme="dark" />
    </div>
  );
}