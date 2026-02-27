import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import {
  FaUsers, FaHome, FaFlag, FaChartBar, FaSignOutAlt,
  FaTrash, FaSearch, FaBan, FaCheckCircle, FaChevronDown,
  FaArrowLeft, FaTimes, FaExclamationTriangle, FaEye
} from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import "../App.css";
import Swal from "sweetalert2";
import { glassToast } from "../components/GlassToast";
import { isAdmin } from "../constants/roles";

type AdminTab = "dashboard" | "users" | "posts" | "reports";

export default function Admin() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [usersPage, setUsersPage] = useState(1);
  const [postsPage, setPostsPage] = useState(1);
  const ROWS_PER_PAGE = 10;
  const navigate = useNavigate();

  // --- AUTH + ADMIN CHECK ---
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser || !isAdmin(currentUser.email)) {
        navigate("/dashboard");
        return;
      }
      setUser(currentUser);
      await fetchAllData();
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const fetchAllData = async () => {
    try {
      // Fetch users
      const usersSnap = await getDocs(collection(db, "users"));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch posts
      const postsSnap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
      setPosts(postsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch reports
      const reportsSnap = await getDocs(query(collection(db, "reports"), orderBy("createdAt", "desc")));
      setReports(reportsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Admin fetch error:", err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  // --- USER MANAGEMENT ---
  const handleChangeRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "Seller" ? "Client" : "Seller";
    const result = await Swal.fire({
      title: `Change role to ${newRole}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#111827",
      confirmButtonText: "Yes, change",
    });
    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, "users", userId), { role: newRole });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        glassToast.success(`Role changed to ${newRole}`);
      } catch { glassToast.error("Failed to change role."); }
    }
  };

  const handleDeactivateUser = async (userId: string, isActive: boolean) => {
    const action = isActive ? "deactivate" : "reactivate";
    const result = await Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} this user?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#111827",
      confirmButtonText: `Yes, ${action}`,
    });
    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, "users", userId), { isDeactivated: isActive });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isDeactivated: isActive } : u));
        glassToast.success(`User ${action}d.`);
      } catch { glassToast.error(`Failed to ${action} user.`); }
    }
  };

  // --- POST MANAGEMENT ---
  const handleRemovePost = async (postId: string) => {
    const result = await Swal.fire({
      title: "Remove this listing?",
      text: "This will move the listing to trash.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#111827",
      confirmButtonText: "Remove",
    });
    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, "posts", postId), { isArchived: true, deletedAt: new Date().toISOString() });
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, isArchived: true } : p));
        glassToast.success("Listing removed.");
      } catch { glassToast.error("Failed to remove listing."); }
    }
  };

  // --- REPORT MANAGEMENT ---
  const handleDismissReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, "reports", reportId), { status: "dismissed" });
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: "dismissed" } : r));
      glassToast.success("Report dismissed.");
    } catch { glassToast.error("Failed to dismiss report."); }
  };

  const handleResolveReport = async (reportId: string, postId: string) => {
    const result = await Swal.fire({
      title: "Resolve & Remove Listing?",
      text: "This will archive the reported listing and mark the report as resolved.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#111827",
      confirmButtonText: "Resolve",
    });
    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, "posts", postId), { isArchived: true, deletedAt: new Date().toISOString() });
        await updateDoc(doc(db, "reports", reportId), { status: "resolved" });
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: "resolved" } : r));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, isArchived: true } : p));
        glassToast.success("Report resolved and listing removed.");
      } catch { glassToast.error("Failed to resolve report."); }
    }
  };

  // --- STATS ---
  const totalUsers = users.length;
  const totalSellers = users.filter(u => u.role === "Seller").length;
  const totalClients = users.filter(u => u.role === "Client").length;
  const activePosts = posts.filter(p => !p.isArchived).length;
  const archivedPosts = posts.filter(p => p.isArchived).length;
  const pendingReports = reports.filter(r => r.status === "pending").length;

  // --- FILTERED DATA ---
  const filteredUsers = users.filter(u => {
    const sq = searchQuery.toLowerCase();
    const name = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
    return name.includes(sq) || (u.email || "").toLowerCase().includes(sq) || (u.customId || "").toLowerCase().includes(sq);
  });

  const filteredPosts = posts.filter(p => {
    const sq = searchQuery.toLowerCase();
    return (p.title || "").toLowerCase().includes(sq) || (p.content || "").toLowerCase().includes(sq) || (p.userName || "").toLowerCase().includes(sq);
  });

  // Paginated data
  const totalUserPages = Math.ceil(filteredUsers.length / ROWS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((usersPage - 1) * ROWS_PER_PAGE, usersPage * ROWS_PER_PAGE);
  const totalPostPages = Math.ceil(filteredPosts.length / ROWS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice((postsPage - 1) * ROWS_PER_PAGE, postsPage * ROWS_PER_PAGE);

  // Reset page when search changes
  useEffect(() => { setUsersPage(1); setPostsPage(1); }, [searchQuery]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'Inter', sans-serif" }}>
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif", background: '#f9fafb' }}>
      {/* ========== SIDEBAR ========== */}
      <aside style={{
        width: '260px', background: '#111827', color: 'white', padding: '24px 0',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0,
        height: '100vh', zIndex: 50, boxShadow: '4px 0 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ padding: '0 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={logo} alt="MBC" style={{ width: '36px' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>Admin Panel</h2>
            <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Metro Bacolod Connect</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {([
            { key: "dashboard", icon: <FaChartBar size={16} />, label: "Dashboard" },
            { key: "users", icon: <FaUsers size={16} />, label: "Users" },
            { key: "posts", icon: <FaHome size={16} />, label: "Posts" },
            { key: "reports", icon: <FaFlag size={16} />, label: "Reports" },
          ] as { key: AdminTab; icon: any; label: string }[]).map(item => (
            <button
              key={item.key}
              onClick={() => { setActiveTab(item.key); setSearchQuery(""); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.9rem',
                fontWeight: activeTab === item.key ? '600' : '500', width: '100%', textAlign: 'left',
                background: activeTab === item.key ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: activeTab === item.key ? 'white' : '#9ca3af',
                transition: '0.2s',
              }}
            >
              {item.icon} {item.label}
              {item.key === 'reports' && pendingReports > 0 && (
                <span style={{ marginLeft: 'auto', background: '#ef4444', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '700' }}>
                  {pendingReports}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', width: '100%', textAlign: 'left', background: 'transparent', color: '#9ca3af', transition: '0.2s' }}>
            <FaArrowLeft size={16} /> Back to Dashboard
          </button>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', width: '100%', textAlign: 'left', background: 'transparent', color: '#ef4444', transition: '0.2s' }}>
            <FaSignOutAlt size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <main style={{ flex: 1, marginLeft: '260px', padding: '32px 40px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'posts' && 'Post Management'}
              {activeTab === 'reports' && 'Reports'}
            </h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.85rem' }}>
              {activeTab === 'dashboard' && 'Platform statistics and overview'}
              {activeTab === 'users' && `${totalUsers} total users`}
              {activeTab === 'posts' && `${activePosts} active listings`}
              {activeTab === 'reports' && `${pendingReports} pending reports`}
            </p>
          </div>
          {(activeTab === 'users' || activeTab === 'posts') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0 14px' }}>
              <FaSearch style={{ color: '#9ca3af' }} />
              <input
                type="text"
                placeholder={activeTab === 'users' ? "Search users..." : "Search posts..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', padding: '10px 0', fontSize: '0.85rem', width: '240px', background: 'transparent' }}
              />
            </div>
          )}
        </div>

        {/* ====== DASHBOARD TAB ====== */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              {[
                { label: 'Total Users', value: totalUsers, color: '#3b82f6', icon: <FaUsers /> },
                { label: 'Sellers', value: totalSellers, color: '#10b981', icon: <FaCheckCircle /> },
                { label: 'Clients', value: totalClients, color: '#8b5cf6', icon: <FaUsers /> },
                { label: 'Active Listings', value: activePosts, color: '#f59e0b', icon: <FaHome /> },
                { label: 'Archived', value: archivedPosts, color: '#6b7280', icon: <FaTrash /> },
                { label: 'Pending Reports', value: pendingReports, color: '#ef4444', icon: <FaFlag /> },
              ].map((stat, i) => (
                <div key={i} style={{
                  background: 'white', borderRadius: '16px', padding: '24px',
                  border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex', alignItems: 'center', gap: '16px'
                }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: `${stat.color}15`, color: stat.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                  }}>
                    {stat.icon}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>{stat.label}</p>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: '700', color: '#111827' }}>Recent Reports</h3>
              {reports.filter(r => r.status === 'pending').length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No pending reports. All clear!</p>
              ) : (
                reports.filter(r => r.status === 'pending').slice(0, 5).map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600', color: '#111' }}>
                        <FaExclamationTriangle size={11} color="#f59e0b" /> {r.postTitle || 'Untitled'}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                        Reason: {r.reason} • By: {r.reporterName || 'Anonymous'}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('reports')}
                      style={{ background: '#111827', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Review
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ====== USERS TAB ====== */}
        {activeTab === 'users' && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={u.photoURL || `https://ui-avatars.com/api/?name=${u.firstName || 'U'}+${u.lastName || ''}&rounded=true&size=36`}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                          alt=""
                        />
                        <span style={{ fontWeight: '600', color: '#111' }}>{u.firstName || ''} {u.lastName || ''}</span>
                      </div>
                    </td>
                    <td style={tdStyle}><span style={{ color: '#6b7280' }}>{u.email}</span></td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600',
                        background: u.role === 'Seller' ? '#ecfdf5' : '#eff6ff',
                        color: u.role === 'Seller' ? '#10b981' : '#3b82f6',
                      }}>
                        {u.role || 'Client'}
                      </span>
                    </td>
                    <td style={tdStyle}><span style={{ color: '#9ca3af', fontSize: '0.78rem', fontFamily: 'monospace' }}>{u.customId || '—'}</span></td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600',
                        background: u.isDeactivated ? '#fef2f2' : '#ecfdf5',
                        color: u.isDeactivated ? '#ef4444' : '#10b981',
                      }}>
                        {u.isDeactivated ? 'Deactivated' : 'Active'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleChangeRole(u.id, u.role)} style={actionBtnStyle} title="Change Role">
                          <FaUsers size={12} />
                        </button>
                        <button onClick={() => handleDeactivateUser(u.id, !u.isDeactivated)} style={{ ...actionBtnStyle, color: u.isDeactivated ? '#10b981' : '#ef4444' }} title={u.isDeactivated ? 'Reactivate' : 'Deactivate'}>
                          <FaBan size={12} />
                        </button>
                        <button onClick={() => navigate(`/profile/${u.id}`)} style={actionBtnStyle} title="View Profile">
                          <FaEye size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalUserPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  Showing {(usersPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(usersPage * ROWS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button disabled={usersPage <= 1} onClick={() => setUsersPage(p => p - 1)} style={{ ...actionBtnStyle, opacity: usersPage <= 1 ? 0.4 : 1 }}>Prev</button>
                  <button disabled={usersPage >= totalUserPages} onClick={() => setUsersPage(p => p + 1)} style={{ ...actionBtnStyle, opacity: usersPage >= totalUserPages ? 0.4 : 1 }}>Next</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====== POSTS TAB ====== */}
        {activeTab === 'posts' && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <th style={thStyle}>Listing</th>
                  <th style={thStyle}>Owner</th>
                  <th style={thStyle}>Location</th>
                  <th style={thStyle}>Price</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPosts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: p.isArchived ? 0.5 : 1 }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {p.images?.[0] && <img src={p.images[0]} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} alt="" />}
                        <span style={{ fontWeight: '600', color: '#111', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{p.title || 'Untitled'}</span>
                      </div>
                    </td>
                    <td style={tdStyle}><span style={{ color: '#6b7280' }}>{p.userName || '—'}</span></td>
                    <td style={tdStyle}><span style={{ color: '#6b7280' }}>{p.location || '—'}</span></td>
                    <td style={tdStyle}><span style={{ fontWeight: '600', color: '#111' }}>{p.price || '—'}</span></td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600',
                        background: p.isArchived ? '#fef2f2' : '#ecfdf5',
                        color: p.isArchived ? '#ef4444' : '#10b981',
                      }}>
                        {p.isArchived ? 'Archived' : p.status || 'Active'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {!p.isArchived && (
                        <button onClick={() => handleRemovePost(p.id)} style={{ ...actionBtnStyle, color: '#ef4444' }} title="Remove">
                          <FaTrash size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPostPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  Showing {(postsPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(postsPage * ROWS_PER_PAGE, filteredPosts.length)} of {filteredPosts.length}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button disabled={postsPage <= 1} onClick={() => setPostsPage(p => p - 1)} style={{ ...actionBtnStyle, opacity: postsPage <= 1 ? 0.4 : 1 }}>Prev</button>
                  <button disabled={postsPage >= totalPostPages} onClick={() => setPostsPage(p => p + 1)} style={{ ...actionBtnStyle, opacity: postsPage >= totalPostPages ? 0.4 : 1 }}>Next</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====== REPORTS TAB ====== */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reports.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '40px', textAlign: 'center' }}>
                <FaCheckCircle size={32} color="#10b981" />
                <p style={{ margin: '12px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>No reports yet. All clear!</p>
              </div>
            ) : (
              reports.map(r => (
                <div key={r.id} style={{
                  background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb',
                  padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  opacity: r.status !== 'pending' ? 0.6 : 1,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <FaExclamationTriangle size={13} color={r.status === 'pending' ? '#f59e0b' : '#9ca3af'} />
                      <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#111' }}>{r.postTitle || 'Untitled Post'}</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '600',
                        background: r.status === 'pending' ? '#fef3c7' : r.status === 'resolved' ? '#ecfdf5' : '#f3f4f6',
                        color: r.status === 'pending' ? '#d97706' : r.status === 'resolved' ? '#10b981' : '#6b7280',
                      }}>
                        {r.status}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                      Reason: <strong>{r.reason}</strong> • Reported by: {r.reporterName || 'Anonymous'} • {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                  {r.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                      <button onClick={() => handleDismissReport(r.id)} style={{ ...actionBtnStyle, padding: '8px 14px', fontSize: '0.78rem' }} title="Dismiss">
                        <FaTimes size={11} /> Dismiss
                      </button>
                      <button onClick={() => handleResolveReport(r.id, r.postId)} style={{ background: '#111827', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaCheckCircle size={11} /> Resolve
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Responsive sidebar collapse for mobile */}
      <style>{`
        @media (max-width: 768px) {
          aside { width: 60px !important; padding: 16px 0 !important; }
          aside h2, aside span, aside button span, aside nav button { font-size: 0 !important; }
          aside nav button { justify-content: center !important; padding: 12px !important; }
          aside nav button svg { font-size: 1.2rem !important; }
          main { margin-left: 60px !important; padding: 20px 16px !important; }
          table { font-size: 0.75rem !important; }
        }
      `}</style>
    </div>
  );
}

// Shared styles
const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '12px 16px' };
const actionBtnStyle: React.CSSProperties = { background: '#f3f4f6', border: 'none', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '500', transition: '0.2s' };
