import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { FaArrowLeft, FaTrashRestore, FaTimes, FaHome, FaTrash, FaUser, FaSignOutAlt, FaEnvelope } from "react-icons/fa";
import Swal from 'sweetalert2';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Archive() {
  const [deletedPosts, setDeletedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Properly wait for the user to be authenticated
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate("/");
        return;
      }

      try {
        // 2. Only fetch THIS user's archived posts
        const q = query(
            collection(db, "posts"), 
            where("userId", "==", user.uid),
            where("isArchived", "==", true)
        );
        
        const snap = await getDocs(q);
        const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // 3. Sort client-side to bypass the Firebase Composite Index error
        posts.sort((a: any, b: any) => {
            const dateA = new Date(a.deletedAt || 0).getTime();
            const dateB = new Date(b.deletedAt || 0).getTime();
            return dateB - dateA;
        });

        setDeletedPosts(posts);
      } catch (error) {
        console.error("Error fetching trash:", error);
        toast.error("Failed to load trash.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleRestore = async (id: string) => {
    try {
        await updateDoc(doc(db, "posts", id), { isArchived: false, deletedAt: null });
        setDeletedPosts(prev => prev.filter(p => p.id !== id));
        toast.success("Post Restored!");
    } catch (error) {
        toast.error("Failed to restore.");
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const result = await Swal.fire({ 
        title: 'Delete Forever?', 
        text: "This cannot be undone.", 
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#9ca3af', 
        confirmButtonText: 'Yes, Delete' 
    });

    if(result.isConfirmed) {
        try {
            await deleteDoc(doc(db, "posts", id));
            setDeletedPosts(prev => prev.filter(p => p.id !== id));
            toast.success("Permanently Deleted");
        } catch (error) {
            toast.error("Failed to delete.");
        }
    }
  };

  const handleLogout = () => {
    Swal.fire({ title: 'Log Out?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes', confirmButtonColor: '#111827' })
      .then(async (res) => { if (res.isConfirmed) { await auth.signOut(); navigate("/"); } });
  };

  return (
    <div className="dashboard-revamp" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ToastContainer position="top-right" theme="light" />
      
      {/* HEADER */}
      <div style={{ padding: '20px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '15px', color: '#111827', flexShrink: 0 }}>
        <button 
          onClick={() => navigate('/dashboard')} 
          style={{ background: '#f3f4f6', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <FaArrowLeft />
        </button>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>Trash ({deletedPosts.length})</h2>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f9fafb' }}>
        <main style={{ maxWidth: '800px', width: '100%' }}>
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
                    <div className="spin" style={{ width: '30px', height: '30px', border: '3px solid #e5e7eb', borderTopColor: '#111827', borderRadius: '50%' }}></div>
                </div>
            ) : deletedPosts.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ background: '#e5e7eb', padding: '20px', borderRadius: '50%', marginBottom: '15px' }}>
                        <FaTrash size={40} style={{ color: '#6b7280' }} />
                    </div>
                    <h3 style={{ color: '#374151', margin: '0 0 5px 0' }}>Trash is empty</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Items moved to trash will appear here.</p>
                </div>
            ) : (
                deletedPosts.map(post => (
                    <div key={post.id} style={{ background: 'white', padding: '15px', borderRadius: '16px', marginBottom: '15px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            {post.image ? (
                                <img src={post.image} style={{ width: 60, height: 60, borderRadius: '10px', objectFit: 'cover' }} alt="Listing" />
                            ) : (
                                <div style={{ width: 60, height: 60, borderRadius: '10px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                                    <FaHome size={24} />
                                </div>
                            )}
                            <div>
                                <h4 style={{ color: '#111827', margin: '0 0 4px 0', fontSize: '1rem' }}>{post.title || post.content?.substring(0, 30) || 'Untitled Listing'}</h4>
                                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Deleted: {new Date(post.deletedAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => handleRestore(post.id)} style={{ background: '#f3f4f6', color: '#111827', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: '0.2s' }} title="Restore">
                                <FaTrashRestore />
                            </button>
                            <button onClick={() => handlePermanentDelete(post.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: '0.2s' }} title="Delete Permanently">
                                <FaTimes />
                            </button>
                        </div>
                    </div>
                ))
            )}
        </main>
      </div>

      {/* ========== MOBILE BOTTOM NAV ========== */}
      <div className="dash-mobile-nav">
        <div onClick={() => navigate('/dashboard')} className="dash-mobile-nav-item">
          <FaHome size={22} /><span>Home</span>
        </div>
        
        <div onClick={() => navigate('/messages')} className="dash-mobile-nav-item">
          <FaEnvelope size={22} /><span>Messages</span>
        </div>

        <div className="dash-mobile-nav-item active">
          <FaTrash size={22} /><span>Trash</span>
        </div>

        <div onClick={() => navigate('/profile')} className="dash-mobile-nav-item">
          <FaUser size={22} /><span>Profile</span>
        </div>
      </div>
    </div>
  );
}