import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { FaArrowLeft, FaTrashRestore, FaTimes, FaHome, FaTrash, FaUser, FaEnvelope, FaCalendarAlt, FaFilter } from "react-icons/fa";
import { canAccessTrash, canManagePost } from "../constants/roles";
import Swal from 'sweetalert2';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Archive() {
  const [deletedPosts, setDeletedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate("/");
        return;
      }

      // RBAC: Only Agents and Admin can access Trash
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const userData = userSnap.exists() ? userSnap.data() : null;
      if (!canAccessTrash(userData?.role, user.email)) {
        navigate("/dashboard");
        return;
      }

      try {
        const q = query(
            collection(db, "posts"), 
            where("userId", "==", user.uid),
            where("isArchived", "==", true)
        );
        
        const snap = await getDocs(q);
        const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
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

  // Quick filter helpers
  const applyQuickFilter = (filter: string) => {
    setActiveQuickFilter(filter);
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (filter === "all") {
      setDateFrom("");
      setDateTo("");
    } else if (filter === "today") {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (filter === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      setDateFrom(weekAgo.toISOString().split("T")[0]);
      setDateTo(todayStr);
    } else if (filter === "month") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      setDateFrom(monthAgo.toISOString().split("T")[0]);
      setDateTo(todayStr);
    }
  };

  // Filter posts by date range
  const filteredPosts = useMemo(() => {
    if (!dateFrom && !dateTo) return deletedPosts;
    return deletedPosts.filter((post) => {
      const deletedDate = new Date(post.deletedAt);
      if (isNaN(deletedDate.getTime())) return false;
      const deletedDay = deletedDate.toISOString().split("T")[0];
      if (dateFrom && deletedDay < dateFrom) return false;
      if (dateTo && deletedDay > dateTo) return false;
      return true;
    });
  }, [deletedPosts, dateFrom, dateTo]);

  const handleRestore = async (id: string) => {
    try {
        const postSnap = await getDoc(doc(db, "posts", id));
        if (!postSnap.exists() || !canManagePost(auth.currentUser?.uid, postSnap.data()?.userId, auth.currentUser?.email)) {
          toast.error("You don't have permission to restore this post.");
          return;
        }
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
            const postSnap = await getDoc(doc(db, "posts", id));
            if (!postSnap.exists() || !canManagePost(auth.currentUser?.uid, postSnap.data()?.userId, auth.currentUser?.email)) {
              toast.error("You don't have permission to delete this post.");
              return;
            }
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

  const quickBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    border: active ? '1.5px solid #111827' : '1px solid #e5e7eb',
    borderRadius: '20px',
    background: active ? '#111827' : 'white',
    color: active ? 'white' : '#374151',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: '0.2s',
    whiteSpace: 'nowrap'
  });

  return (
    <div className="dashboard-revamp" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ToastContainer position="top-right" theme="light" />
      
      {/* HEADER */}
      <div style={{ padding: '16px 20px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '15px', color: '#111827', flexShrink: 0 }}>
        <button 
          onClick={() => navigate('/dashboard')} 
          style={{ background: '#f3f4f6', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <FaArrowLeft />
        </button>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>Trash ({filteredPosts.length})</h2>
      </div>

      {/* DATE FILTER BAR */}
      <div style={{ padding: '12px 20px', background: 'white', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
        {/* Quick Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <FaFilter size={13} style={{ color: '#6b7280', marginRight: '2px' }} />
          <button style={quickBtnStyle(activeQuickFilter === 'all')} onClick={() => applyQuickFilter('all')}>All</button>
          <button style={quickBtnStyle(activeQuickFilter === 'today')} onClick={() => applyQuickFilter('today')}>Today</button>
          <button style={quickBtnStyle(activeQuickFilter === 'week')} onClick={() => applyQuickFilter('week')}>This Week</button>
          <button style={quickBtnStyle(activeQuickFilter === 'month')} onClick={() => applyQuickFilter('month')}>This Month</button>
        </div>
        {/* Date Range Inputs */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaCalendarAlt size={13} style={{ color: '#6b7280' }} />
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setActiveQuickFilter("custom"); }}
              style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '6px 10px', fontSize: '0.85rem', color: '#374151', outline: 'none', background: '#f9fafb' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setActiveQuickFilter("custom"); }}
              style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '6px 10px', fontSize: '0.85rem', color: '#374151', outline: 'none', background: '#f9fafb' }}
            />
          </div>
          {(dateFrom || dateTo) && activeQuickFilter !== 'all' && (
            <button onClick={() => applyQuickFilter('all')} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500, padding: '4px 8px' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f9fafb' }}>
        <main style={{ maxWidth: '800px', width: '100%' }}>
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
                    <div className="spin" style={{ width: '30px', height: '30px', border: '3px solid #e5e7eb', borderTopColor: '#111827', borderRadius: '50%' }}></div>
                </div>
            ) : filteredPosts.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ background: '#e5e7eb', padding: '20px', borderRadius: '50%', marginBottom: '15px' }}>
                        <FaTrash size={40} style={{ color: '#6b7280' }} />
                    </div>
                    <h3 style={{ color: '#374151', margin: '0 0 5px 0' }}>
                      {deletedPosts.length === 0 ? 'Trash is empty' : 'No items match this date range'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      {deletedPosts.length === 0 ? 'Items moved to trash will appear here.' : 'Try adjusting your date filters.'}
                    </p>
                </div>
            ) : (
                filteredPosts.map(post => (
                    <div key={post.id} style={{ background: 'white', padding: '15px', borderRadius: '16px', marginBottom: '15px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                            {post.image ? (
                                <img src={post.image} style={{ width: 60, height: 60, borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} alt="Listing" />
                            ) : (
                                <div style={{ width: 60, height: 60, borderRadius: '10px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexShrink: 0 }}>
                                    <FaHome size={24} />
                                </div>
                            )}
                            <div style={{ minWidth: 0 }}>
                                <h4 style={{ color: '#111827', margin: '0 0 4px 0', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{post.title || post.content?.substring(0, 30) || 'Untitled Listing'}</h4>
                                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Deleted: {new Date(post.deletedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
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