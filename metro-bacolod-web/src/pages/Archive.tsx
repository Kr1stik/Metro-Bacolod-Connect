import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { FaArrowLeft, FaTrashRestore, FaTimes, FaHome, FaTrash, FaUser, FaEnvelope, FaCalendarAlt, FaFilter } from "react-icons/fa";
import { canAccessTrash, canManagePost } from "../constants/roles";
import Swal from 'sweetalert2';
import { glassToast } from '../components/GlassToast';
import "../App.css";

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
        glassToast.error("Failed to load trash.");
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
          glassToast.error("You don't have permission to restore this post.");
          return;
        }
        await updateDoc(doc(db, "posts", id), { isArchived: false, deletedAt: null });
        setDeletedPosts(prev => prev.filter(p => p.id !== id));
        glassToast.success("Post Restored!");
    } catch (error) {
        glassToast.error("Failed to restore.");
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
              glassToast.error("You don't have permission to delete this post.");
              return;
            }
            await deleteDoc(doc(db, "posts", id));
            setDeletedPosts(prev => prev.filter(p => p.id !== id));
            glassToast.success("Permanently Deleted");
        } catch (error) {
            glassToast.error("Failed to delete.");
        }
    }
  };

  const handleLogout = () => {
    Swal.fire({ title: 'Log Out?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes', confirmButtonColor: '#111827' })
      .then(async (res) => { if (res.isConfirmed) { await auth.signOut(); navigate("/"); } });
  };

  const quickBtnClass = (active: boolean) => 
    `archive-quick-btn ${active ? 'archive-quick-btn-active' : ''}`;

  return (
    <div className="dashboard-revamp archive-page">
      {/* HEADER */}
      <div className="archive-header">
        <button onClick={() => navigate('/dashboard')} className="archive-back-btn">
          <FaArrowLeft />
        </button>
        <h2 className="archive-title">Trash ({filteredPosts.length})</h2>
      </div>

      {/* DATE FILTER BAR */}
      <div className="archive-filter-bar">
        {/* Quick Filters */}
        <div className="archive-quick-filters">
          <FaFilter size={13} className="archive-filter-icon" />
          <button className={quickBtnClass(activeQuickFilter === 'all')} onClick={() => applyQuickFilter('all')}>All</button>
          <button className={quickBtnClass(activeQuickFilter === 'today')} onClick={() => applyQuickFilter('today')}>Today</button>
          <button className={quickBtnClass(activeQuickFilter === 'week')} onClick={() => applyQuickFilter('week')}>This Week</button>
          <button className={quickBtnClass(activeQuickFilter === 'month')} onClick={() => applyQuickFilter('month')}>This Month</button>
        </div>
        {/* Date Range Inputs */}
        <div className="archive-date-range">
          <div className="archive-date-group">
            <FaCalendarAlt size={13} className="archive-date-icon" />
            <span className="archive-date-label">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setActiveQuickFilter("custom"); }}
              className="archive-date-input"
            />
          </div>
          <div className="archive-date-group">
            <span className="archive-date-label">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setActiveQuickFilter("custom"); }}
              className="archive-date-input"
            />
          </div>
          {(dateFrom || dateTo) && activeQuickFilter !== 'all' && (
            <button onClick={() => applyQuickFilter('all')} className="archive-clear-btn">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* BODY */}
      <div className="archive-body">
        <main className="archive-main">
            {loading ? (
                <div className="archive-loading">
                    <div className="spin archive-spinner"></div>
                </div>
            ) : filteredPosts.length === 0 ? (
                <div className="archive-empty">
                    <div className="archive-empty-icon">
                        <FaTrash size={40} />
                    </div>
                    <h3 className="archive-empty-title">
                      {deletedPosts.length === 0 ? 'Trash is empty' : 'No items match this date range'}
                    </h3>
                    <p className="archive-empty-text">
                      {deletedPosts.length === 0 ? 'Items moved to trash will appear here.' : 'Try adjusting your date filters.'}
                    </p>
                </div>
            ) : (
                filteredPosts.map(post => (
                    <div key={post.id} className="archive-post-card">
                        <div className="archive-post-info">
                            {post.image ? (
                                <img src={post.image} className="archive-post-image" alt="Listing" />
                            ) : (
                                <div className="archive-post-placeholder">
                                    <FaHome size={24} />
                                </div>
                            )}
                            <div className="archive-post-details">
                                <h4 className="archive-post-title">{post.title || post.content?.substring(0, 30) || 'Untitled Listing'}</h4>
                                <span className="archive-post-date">Deleted: {new Date(post.deletedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            </div>
                        </div>
                        <div className="archive-post-actions">
                            <button onClick={() => handleRestore(post.id)} className="archive-restore-btn" title="Restore">
                                <FaTrashRestore />
                            </button>
                            <button onClick={() => handlePermanentDelete(post.id)} className="archive-delete-btn" title="Delete Permanently">
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