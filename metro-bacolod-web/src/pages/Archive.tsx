import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import { FaArrowLeft, FaTrashRestore, FaTimes, FaHome, FaTrash, FaUser, FaSignOutAlt } from "react-icons/fa";
import Swal from 'sweetalert2';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Archive() {
  const [deletedPosts, setDeletedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDeleted = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(collection(db, "posts"), where("isArchived", "==", true), orderBy("deletedAt", "desc"));
      const snap = await getDocs(q);
      const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDeletedPosts(posts);
      setLoading(false);
    };
    fetchDeleted();
  }, []);

  const handleRestore = async (id: string) => {
    await updateDoc(doc(db, "posts", id), { isArchived: false, deletedAt: null });
    setDeletedPosts(prev => prev.filter(p => p.id !== id));
    toast.success("Post Restored!");
  };

  const handlePermanentDelete = async (id: string) => {
    const result = await Swal.fire({ title: 'Delete Forever?', text: "This cannot be undone.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes, Delete' });
    if(result.isConfirmed) {
        await deleteDoc(doc(db, "posts", id));
        setDeletedPosts(prev => prev.filter(p => p.id !== id));
        toast.success("Permanently Deleted");
    }
  };

  return (
    <div className="dashboard-layout">
      <ToastContainer theme="dark" />
      
      {/* MOBILE HEADER */}
      <div style={{ padding: '20px', background: '#1e293b', display: 'flex', alignItems: 'center', gap: '15px', color: 'white' }}>
        <FaArrowLeft style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')} />
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Trash ({deletedPosts.length})</h2>
      </div>

      <div className="dashboard-body" style={{ display: 'flex', justifyContent: 'center' }}>
        <main className="feed-container" style={{ maxWidth: '800px', width: '100%', padding: '20px' }}>
            {loading ? <p style={{color:'white'}}>Loading...</p> : deletedPosts.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', marginTop: '50px' }}>
                    <FaTrash size={50} style={{ marginBottom: '15px', opacity: 0.5 }} />
                    <p>Trash is empty.</p>
                </div>
            ) : (
                deletedPosts.map(post => (
                    <div key={post.id} style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            {post.image && <img src={post.image} style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover' }} />}
                            <div>
                                <p style={{ color: 'white', margin: 0, fontWeight: 'bold' }}>{post.content.substring(0, 30)}...</p>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Deleted: {new Date(post.deletedAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => handleRestore(post.id)} style={{ background: '#10B981', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}><FaTrashRestore /></button>
                            <button onClick={() => handlePermanentDelete(post.id)} style={{ background: '#EF4444', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}><FaTimes /></button>
                        </div>
                    </div>
                ))
            )}
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="mobile-bottom-nav" style={{ 
            display: 'none', /* Hidden on Desktop via CSS */
            position: 'fixed', bottom: 0, left: 0, width: '100%', 
            background: '#1e293b', borderTop: '1px solid #334155', 
            justifyContent: 'space-around', alignItems: 'center', padding: '10px 0', zIndex: 100 
      }}>
          <div onClick={() => navigate('/dashboard')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8', cursor: 'pointer' }}>
              <FaHome size={24} />
              <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Home</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#ef4444', cursor: 'pointer' }}>
              <FaTrash size={24} />
              <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Trash</span>
          </div>
          <div onClick={() => navigate('/profile')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8', cursor: 'pointer' }}>
              <FaUser size={24} />
              <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Profile</span>
          </div>
          <div onClick={() => auth.signOut().then(() => navigate("/"))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8', cursor: 'pointer' }}>
              <FaSignOutAlt size={24} />
              <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Logout</span>
          </div>
      </div>

      {/* Force Mobile Nav to Show on Small Screens */}
      <style>{`
          @media (max-width: 768px) {
              .mobile-bottom-nav { display: flex !important; }
          }
      `}</style>
    </div>
  );
}