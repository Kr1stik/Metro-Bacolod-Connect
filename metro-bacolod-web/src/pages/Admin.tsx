import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where, onSnapshot, addDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import {
  FaUsers, FaHome, FaFlag, FaChartBar, FaSignOutAlt,
  FaTrash, FaSearch, FaBan, FaCheckCircle, FaChevronDown,
  FaArrowLeft, FaTimes, FaExclamationTriangle, FaEye,
  FaShieldAlt, FaIdCard, FaCertificate, FaTimesCircle,
  FaDownload, FaEnvelope, FaCog, FaStar, FaHistory,
  FaSort, FaSortUp, FaSortDown, FaFilter, FaChevronRight,
  FaUserSlash, FaSpinner, FaChevronUp,
  FaBars, FaUndo, FaTachometerAlt, FaArrowUp, FaArrowDown, FaUserShield
} from "react-icons/fa";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import logo from "../assets/MBC Logo.png";
import "../App.css";
import Swal from "sweetalert2";
import { glassToast } from "../components/GlassToast";
import { isAdmin, fetchAdminEmails } from "../constants/roles";

type AdminTab = "dashboard" | "users" | "posts" | "reports" | "verifications" | "activity" | "analytics" | "settings" | "reported-users" | "featured";

export default function Admin() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [usersPage, setUsersPage] = useState(1);
  const [postsPage, setPostsPage] = useState(1);
  const ROWS_PER_PAGE = 10;
  const navigate = useNavigate();

  // Sorting state
  const [userSort, setUserSort] = useState<{ field: string; dir: "asc" | "desc" }>({ field: "createdAt", dir: "desc" });
  const [postSort, setPostSort] = useState<{ field: string; dir: "asc" | "desc" }>({ field: "createdAt", dir: "desc" });

  // Filter state
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [postStatusFilter, setPostStatusFilter] = useState<string>("all");
  const [reportStatusFilter, setReportStatusFilter] = useState<string>("all");

  // Bulk selection
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());

  // User Detail Drawer
  const [drawerUser, setDrawerUser] = useState<any>(null);

  // Email Broadcast
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState<string>("all");
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Sidebar collapse for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Post Detail Drawer
  const [drawerPost, setDrawerPost] = useState<any>(null);

  // Verification filter
  const [verificationFilter, setVerificationFilter] = useState<string>("pending");

  // Reports search
  const [reportSearchQuery, setReportSearchQuery] = useState("");

  // Activity log pagination & search
  const [activityPage, setActivityPage] = useState(1);
  const [activitySearch, setActivitySearch] = useState("");
  const ACTIVITY_PER_PAGE = 20;

  // Broadcast preview
  const [showBroadcastPreview, setShowBroadcastPreview] = useState(false);

  // --- ACTIVITY LOG HELPER ---
  const logActivity = useCallback(async (action: string, details: string, targetId?: string) => {
    try {
      const logEntry = {
        action,
        details,
        targetId: targetId || "",
        adminEmail: user?.email || "",
        adminName: user?.displayName || "",
        timestamp: new Date().toISOString(),
      };
      await addDoc(collection(db, "activityLogs"), logEntry);
      setActivityLogs(prev => [logEntry, ...prev]);
    } catch (err) {
      console.warn("Failed to log activity:", err);
    }
  }, [user]);

  // --- AUTH + ADMIN CHECK ---
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate("/dashboard");
        return;
      }
      await fetchAdminEmails();
      if (!isAdmin(currentUser.email)) {
        navigate("/dashboard");
        return;
      }
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  // --- REAL-TIME LISTENERS ---
  useEffect(() => {
    if (!user) return;

    // Real-time users listener
    const unsub1 = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Real-time posts listener
    const unsub2 = onSnapshot(query(collection(db, "posts"), orderBy("createdAt", "desc")), (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Real-time reports listener
    const unsub3 = onSnapshot(query(collection(db, "reports"), orderBy("createdAt", "desc")), (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Activity logs
    const unsub4 = onSnapshot(query(collection(db, "activityLogs"), orderBy("timestamp", "desc")), (snap) => {
      setActivityLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  // --- VERIFICATION MANAGEMENT ---
  const pendingVerifications = users.filter(u => u.verificationStatus === "pending");

  const handleApproveVerification = async (userId: string) => {
    const result = await Swal.fire({
      title: "Approve this user?",
      text: "They will be able to create listings after approval. An email notification will be sent.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      confirmButtonText: "Approve",
    });
    if (result.isConfirmed) {
      try {
        // Update Firestore directly for real-time UI update
        await updateDoc(doc(db, "users", userId), { isVerified: true, verificationStatus: "approved", verifiedAt: new Date().toISOString() });
        
        // Call backend API to send approval email via Resend
        try {
          const { default: api } = await import("../services/api");
          await api.put(`/users/${userId}/verify-approve`);
        } catch (emailErr) {
          console.warn("Email notification may not have been sent:", emailErr);
        }

        const targetUser = users.find(u => u.id === userId);
        await logActivity("verify_approve", `Approved verification for ${targetUser?.firstName} ${targetUser?.lastName}`, userId);
        glassToast.success("User verified, approved, and notified via email!");
      } catch { glassToast.error("Failed to approve user."); }
    }
  };

  const handleRejectVerification = async (userId: string) => {
    const { value: reason } = await Swal.fire({
      title: "Reject verification?",
      input: "textarea",
      inputLabel: "Reason for rejection (optional)",
      inputPlaceholder: "e.g. ID image is unclear, PRC number is invalid...",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Reject",
    });
    if (reason !== undefined) {
      try {
        await updateDoc(doc(db, "users", userId), { verificationStatus: "rejected", rejectionReason: reason || "" });
        
        // Call backend API to send rejection email via Resend
        try {
          const { default: api } = await import("../services/api");
          await api.put(`/users/${userId}/verify-reject`, { reason: reason || "" });
        } catch (emailErr) {
          console.warn("Email notification may not have been sent:", emailErr);
        }

        const targetUser = users.find(u => u.id === userId);
        await logActivity("verify_reject", `Rejected verification for ${targetUser?.firstName} ${targetUser?.lastName}: ${reason}`, userId);
        glassToast.success("User verification rejected and notified via email.");
      } catch { glassToast.error("Failed to reject verification."); }
    }
  };

  // --- USER MANAGEMENT ---
  const handleChangeRole = async (userId: string, currentRole: string) => {
    const roles = ["Client", "Seller", "Agent"];
    const otherRoles = roles.filter(r => r !== currentRole);
    const { value: newRole } = await Swal.fire({
      title: "Change role to:",
      input: "select",
      inputOptions: Object.fromEntries(otherRoles.map(r => [r, r])),
      showCancelButton: true,
      confirmButtonColor: "#111827",
      confirmButtonText: "Change",
    });
    if (newRole) {
      const VALID_ROLES = ["Client", "Seller", "Agent"];
      if (!VALID_ROLES.includes(newRole)) return glassToast.error("Invalid role selected.");
      try {
        await updateDoc(doc(db, "users", userId), { role: newRole });
        await logActivity("role_change", `Changed role of user to ${newRole}`, userId);
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
        await logActivity(`user_${action}`, `${action}d user`, userId);
        glassToast.success(`User ${action}d.`);
      } catch { glassToast.error(`Failed to ${action} user.`); }
    }
  };

  // --- BULK ACTIONS ---
  const handleBulkDeactivateUsers = async () => {
    if (selectedUsers.size === 0) return glassToast.error("No users selected.");
    const result = await Swal.fire({
      title: `Deactivate ${selectedUsers.size} users?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Deactivate All",
    });
    if (result.isConfirmed) {
      try {
        const promises = Array.from(selectedUsers).map(id => updateDoc(doc(db, "users", id), { isDeactivated: true }));
        await Promise.all(promises);
        await logActivity("bulk_deactivate", `Bulk deactivated ${selectedUsers.size} users`);
        setSelectedUsers(new Set());
        glassToast.success(`${selectedUsers.size} users deactivated.`);
      } catch { glassToast.error("Bulk deactivation failed."); }
    }
  };

  const handleBulkArchivePosts = async () => {
    if (selectedPosts.size === 0) return glassToast.error("No posts selected.");
    const result = await Swal.fire({
      title: `Archive ${selectedPosts.size} posts?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Archive All",
    });
    if (result.isConfirmed) {
      try {
        const promises = Array.from(selectedPosts).map(id => updateDoc(doc(db, "posts", id), { isArchived: true, deletedAt: new Date().toISOString() }));
        await Promise.all(promises);
        await logActivity("bulk_archive", `Bulk archived ${selectedPosts.size} posts`);
        setSelectedPosts(new Set());
        glassToast.success(`${selectedPosts.size} posts archived.`);
      } catch { glassToast.error("Bulk archive failed."); }
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
        await logActivity("post_archive", `Archived post`, postId);
        glassToast.success("Listing removed.");
      } catch { glassToast.error("Failed to remove listing."); }
    }
  };

  const handleToggleFeatured = async (postId: string, currentlyFeatured: boolean) => {
    try {
      await updateDoc(doc(db, "posts", postId), { isFeatured: !currentlyFeatured });
      await logActivity(currentlyFeatured ? "post_unfeature" : "post_feature", `${currentlyFeatured ? "Unfeatured" : "Featured"} post`, postId);
      glassToast.success(currentlyFeatured ? "Post unfeatured." : "Post featured!");
    } catch { glassToast.error("Failed to update featured status."); }
  };

  // --- POST RESTORE (UNARCHIVE) ---
  const handleRestorePost = async (postId: string) => {
    const result = await Swal.fire({
      title: "Restore this listing?",
      text: "This will make the listing active again.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      confirmButtonText: "Restore",
    });
    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, "posts", postId), { isArchived: false, deletedAt: null });
        await logActivity("post_restore", `Restored post from archive`, postId);
        glassToast.success("Listing restored.");
      } catch { glassToast.error("Failed to restore listing."); }
    }
  };

  // --- HARD DELETE POST ---
  const handleHardDeletePost = async (postId: string) => {
    const result = await Swal.fire({
      title: "Permanently delete this listing?",
      text: "This action cannot be undone. The listing will be permanently removed.",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete Permanently",
      input: "text",
      inputPlaceholder: 'Type "DELETE" to confirm',
      inputValidator: (value) => value !== "DELETE" ? 'Type "DELETE" to confirm' : null,
    });
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "posts", postId));
        await logActivity("post_hard_delete", `Permanently deleted post`, postId);
        glassToast.success("Listing permanently deleted.");
      } catch { glassToast.error("Failed to delete listing."); }
    }
  };

  // --- HARD DELETE USER ---
  const handleHardDeleteUser = async (userId: string) => {
    const result = await Swal.fire({
      title: "Permanently delete this user?",
      text: "This action cannot be undone. All user data will be permanently removed.",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete Permanently",
      input: "text",
      inputPlaceholder: 'Type "DELETE" to confirm',
      inputValidator: (value) => value !== "DELETE" ? 'Type "DELETE" to confirm' : null,
    });
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "users", userId));
        await logActivity("user_hard_delete", `Permanently deleted user`, userId);
        if (drawerUser?.id === userId) setDrawerUser(null);
        glassToast.success("User permanently deleted.");
      } catch { glassToast.error("Failed to delete user."); }
    }
  };

  // --- BULK REACTIVATE USERS ---
  const handleBulkReactivateUsers = async () => {
    if (selectedUsers.size === 0) return glassToast.error("No users selected.");
    const result = await Swal.fire({
      title: `Reactivate ${selectedUsers.size} users?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      confirmButtonText: "Reactivate All",
    });
    if (result.isConfirmed) {
      try {
        const promises = Array.from(selectedUsers).map(id => updateDoc(doc(db, "users", id), { isDeactivated: false }));
        await Promise.all(promises);
        await logActivity("bulk_reactivate", `Bulk reactivated ${selectedUsers.size} users`);
        setSelectedUsers(new Set());
        glassToast.success(`${selectedUsers.size} users reactivated.`);
      } catch { glassToast.error("Bulk reactivation failed."); }
    }
  };

  // --- BULK UNARCHIVE POSTS ---
  const handleBulkUnarchivePosts = async () => {
    if (selectedPosts.size === 0) return glassToast.error("No posts selected.");
    const result = await Swal.fire({
      title: `Restore ${selectedPosts.size} posts?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      confirmButtonText: "Restore All",
    });
    if (result.isConfirmed) {
      try {
        const promises = Array.from(selectedPosts).map(id => updateDoc(doc(db, "posts", id), { isArchived: false, deletedAt: null }));
        await Promise.all(promises);
        await logActivity("bulk_unarchive", `Bulk restored ${selectedPosts.size} posts`);
        setSelectedPosts(new Set());
        glassToast.success(`${selectedPosts.size} posts restored.`);
      } catch { glassToast.error("Bulk restore failed."); }
    }
  };

  // --- PROMOTE / DEMOTE ADMIN ---
  const handlePromoteToAdmin = async (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    const result = await Swal.fire({
      title: "Promote to Admin?",
      text: `This will give ${targetUser?.firstName || ''} ${targetUser?.lastName || ''} full admin access.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#111827",
      confirmButtonText: "Promote",
      input: "text",
      inputPlaceholder: 'Type "PROMOTE" to confirm',
      inputValidator: (value) => value !== "PROMOTE" ? 'Type "PROMOTE" to confirm' : null,
    });
    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, "users", userId), { role: "Admin" });
        await logActivity("admin_promote", `Promoted ${targetUser?.firstName} ${targetUser?.lastName} to Admin`, userId);
        glassToast.success("User promoted to Admin.");
      } catch { glassToast.error("Failed to promote user."); }
    }
  };

  const handleDemoteFromAdmin = async (userId: string) => {
    if (userId === user?.uid) return glassToast.error("You cannot demote yourself.");
    const targetUser = users.find(u => u.id === userId);
    const result = await Swal.fire({
      title: "Demote from Admin?",
      text: `This will remove admin access from ${targetUser?.firstName || ''} ${targetUser?.lastName || ''} and set their role to Client.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Demote",
      input: "text",
      inputPlaceholder: 'Type "DEMOTE" to confirm',
      inputValidator: (value) => value !== "DEMOTE" ? 'Type "DEMOTE" to confirm' : null,
    });
    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, "users", userId), { role: "Client" });
        await logActivity("admin_demote", `Demoted ${targetUser?.firstName} ${targetUser?.lastName} from Admin`, userId);
        glassToast.success("Admin access removed.");
      } catch { glassToast.error("Failed to demote user."); }
    }
  };

  // --- REVOKE VERIFICATION ---
  const handleRevokeVerification = async (userId: string) => {
    const result = await Swal.fire({
      title: "Revoke verification?",
      text: "This user will lose their verified status.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Revoke",
    });
    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, "users", userId), { isVerified: false, verificationStatus: "revoked" });
        const targetUser = users.find(u => u.id === userId);
        await logActivity("verify_revoke", `Revoked verification for ${targetUser?.firstName} ${targetUser?.lastName}`, userId);
        glassToast.success("Verification revoked.");
      } catch { glassToast.error("Failed to revoke verification."); }
    }
  };

  // --- FEATURED ORDERING ---
  const handleChangeFeaturedOrder = async (postId: string, direction: "up" | "down") => {
    const sorted = [...featuredPosts].sort((a, b) => (a.featuredOrder || 0) - (b.featuredOrder || 0));
    const idx = sorted.findIndex(p => p.id === postId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    try {
      const currentOrder = sorted[idx].featuredOrder || idx;
      const swapOrder = sorted[swapIdx].featuredOrder || swapIdx;
      await Promise.all([
        updateDoc(doc(db, "posts", sorted[idx].id), { featuredOrder: swapOrder }),
        updateDoc(doc(db, "posts", sorted[swapIdx].id), { featuredOrder: currentOrder }),
      ]);
      glassToast.success("Featured order updated.");
    } catch { glassToast.error("Failed to reorder."); }
  };

  // --- REPORT MANAGEMENT ---
  const handleDismissReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, "reports", reportId), { status: "dismissed" });
      await logActivity("report_dismiss", `Dismissed report`, reportId);
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
        await logActivity("report_resolve", `Resolved report and archived post`, reportId);
        glassToast.success("Report resolved and listing removed.");
      } catch { glassToast.error("Failed to resolve report."); }
    }
  };

  // --- EMAIL BROADCAST ---
  const handleSendBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastBody.trim()) return glassToast.error("Subject and body are required.");
    if (broadcastSubject.trim().length > 200) return glassToast.error("Subject must be under 200 characters.");
    if (broadcastBody.trim().length > 5000) return glassToast.error("Body must be under 5000 characters.");
    setIsSendingBroadcast(true);
    try {
      let targetEmails: string[] = [];
      if (broadcastTarget === "all") targetEmails = users.filter(u => u.email && !u.isDeactivated).map(u => u.email);
      else if (broadcastTarget === "sellers") targetEmails = users.filter(u => u.role === "Seller" && u.email && !u.isDeactivated).map(u => u.email);
      else if (broadcastTarget === "agents") targetEmails = users.filter(u => u.role === "Agent" && u.email && !u.isDeactivated).map(u => u.email);
      else if (broadcastTarget === "clients") targetEmails = users.filter(u => u.role === "Client" && u.email && !u.isDeactivated).map(u => u.email);

      // Store broadcast in Firestore for backend to pick up
      await addDoc(collection(db, "emailBroadcasts"), {
        subject: broadcastSubject,
        body: broadcastBody,
        targetGroup: broadcastTarget,
        targetEmails,
        sentBy: user?.email || "",
        status: "queued",
        createdAt: new Date().toISOString(),
      });

      await logActivity("email_broadcast", `Sent email to ${targetEmails.length} ${broadcastTarget} users: "${broadcastSubject}"`);
      setBroadcastSubject("");
      setBroadcastBody("");
      glassToast.success(`Broadcast queued for ${targetEmails.length} recipients.`);
    } catch { glassToast.error("Failed to send broadcast."); }
    setIsSendingBroadcast(false);
  };

  // --- EXPORT / CSV ---
  const exportUsersCSV = () => {
    const headers = ["Name", "Email", "Role", "Custom ID", "Status", "Verified", "Created At"];
    const rows = users.map(u => [
      `${u.firstName || ""} ${u.lastName || ""}`,
      u.email || "",
      u.role || "Client",
      u.customId || "",
      u.isDeactivated ? "Deactivated" : "Active",
      u.isVerified ? "Yes" : "No",
      u.createdAt || "",
    ]);
    downloadCSV(headers, rows, "mbc-users-export.csv");
    logActivity("export", "Exported users CSV");
  };

  const exportPostsCSV = () => {
    const headers = ["Title", "Owner", "Location", "Price", "Status", "Created At"];
    const rows = posts.map(p => [
      p.title || "",
      p.userName || "",
      p.location || "",
      p.price || "",
      p.isArchived ? "Archived" : (p.status || "Active"),
      p.createdAt || "",
    ]);
    downloadCSV(headers, rows, "mbc-posts-export.csv");
    logActivity("export", "Exported posts CSV");
  };

  const exportReportsCSV = () => {
    const headers = ["Post Title", "Reason", "Description", "Reporter", "Status", "Created At"];
    const rows = reports.map(r => [
      r.postTitle || "",
      r.reason || "",
      (r.description || "").replace(/\n/g, " "),
      r.reporterName || "",
      r.status || "",
      r.createdAt || "",
    ]);
    downloadCSV(headers, rows, "mbc-reports-export.csv");
    logActivity("export", "Exported reports CSV");
  };

  const downloadCSV = (headers: string[], rows: string[][], filename: string) => {
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // --- STATS ---
  const totalUsers = users.length;
  const totalSellers = users.filter(u => u.role === "Seller").length;
  const totalAgents = users.filter(u => u.role === "Agent").length;
  const totalClients = users.filter(u => u.role === "Client").length;
  const pendingVerCount = pendingVerifications.length;
  const activePosts = posts.filter(p => !p.isArchived).length;
  const archivedPosts = posts.filter(p => p.isArchived).length;
  const pendingReports = reports.filter(r => r.status === "pending").length;
  const featuredPosts = posts.filter(p => p.isFeatured && !p.isArchived);

  // --- ANALYTICS DATA ---
  const roleDistribution = [
    { name: "Clients", value: totalClients, color: "#8b5cf6" },
    { name: "Sellers", value: totalSellers, color: "#10b981" },
    { name: "Agents", value: totalAgents, color: "#2563eb" },
  ];

  // Users over time (by month)
  const getUsersByMonth = () => {
    const months: Record<string, number> = {};
    users.forEach(u => {
      if (u.createdAt) {
        const month = u.createdAt.substring(0, 7); // YYYY-MM
        months[month] = (months[month] || 0) + 1;
      }
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, count]) => ({
      month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      users: count,
    }));
  };

  const getPostsByMonth = () => {
    const months: Record<string, number> = {};
    posts.forEach(p => {
      if (p.createdAt) {
        const month = p.createdAt.substring(0, 7);
        months[month] = (months[month] || 0) + 1;
      }
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, count]) => ({
      month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      posts: count,
    }));
  };

  const reportsByStatus = [
    { name: "Pending", value: reports.filter(r => r.status === "pending").length, color: "#f59e0b" },
    { name: "Resolved", value: reports.filter(r => r.status === "resolved").length, color: "#10b981" },
    { name: "Dismissed", value: reports.filter(r => r.status === "dismissed").length, color: "#6b7280" },
  ];

  // --- REPORTED USERS AGGREGATION ---
  const getReportedUsers = () => {
    const userReportMap: Record<string, { userId: string; name: string; email: string; count: number; reports: any[] }> = {};
    reports.forEach(r => {
      if (r.postOwnerId) {
        if (!userReportMap[r.postOwnerId]) {
          const targetUser = users.find(u => u.id === r.postOwnerId);
          userReportMap[r.postOwnerId] = {
            userId: r.postOwnerId,
            name: targetUser ? `${targetUser.firstName} ${targetUser.lastName}` : r.postOwnerName || "Unknown",
            email: targetUser?.email || "",
            count: 0,
            reports: [],
          };
        }
        userReportMap[r.postOwnerId].count++;
        userReportMap[r.postOwnerId].reports.push(r);
      }
    });
    return Object.values(userReportMap).sort((a, b) => b.count - a.count);
  };

  // --- SORTING ---
  const sortData = (data: any[], sort: { field: string; dir: "asc" | "desc" }) => {
    return [...data].sort((a, b) => {
      const aVal = a[sort.field] || "";
      const bVal = b[sort.field] || "";
      if (sort.dir === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  };

  const toggleSort = (field: string, current: { field: string; dir: "asc" | "desc" }, setter: Function) => {
    if (current.field === field) {
      setter({ field, dir: current.dir === "asc" ? "desc" : "asc" });
    } else {
      setter({ field, dir: "asc" });
    }
  };

  const SortIcon = ({ field, current }: { field: string; current: { field: string; dir: string } }) => {
    if (current.field !== field) return <FaSort size={10} style={{ marginLeft: '4px', color: '#9ca3af' }} />;
    return current.dir === "asc" ? <FaSortUp size={10} style={{ marginLeft: '4px' }} /> : <FaSortDown size={10} style={{ marginLeft: '4px' }} />;
  };

  // --- FILTERED DATA ---
  const filteredUsers = users.filter(u => {
    const sq = searchQuery.toLowerCase();
    const name = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
    const matchesSearch = name.includes(sq) || (u.email || "").toLowerCase().includes(sq) || (u.customId || "").toLowerCase().includes(sq);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredPosts = posts.filter(p => {
    const sq = searchQuery.toLowerCase();
    const matchesSearch = (p.title || "").toLowerCase().includes(sq) || (p.content || "").toLowerCase().includes(sq) || (p.userName || "").toLowerCase().includes(sq);
    const matchesStatus = postStatusFilter === "all" || (postStatusFilter === "archived" ? p.isArchived : !p.isArchived);
    return matchesSearch && matchesStatus;
  });

  const filteredReports = reports.filter(r => {
    const matchesStatus = reportStatusFilter === "all" || r.status === reportStatusFilter;
    const sq = reportSearchQuery.toLowerCase();
    const matchesSearch = !sq || (r.postTitle || "").toLowerCase().includes(sq) || (r.reporterName || "").toLowerCase().includes(sq) || (r.reason || "").toLowerCase().includes(sq);
    return matchesStatus && matchesSearch;
  });

  const sortedUsers = sortData(filteredUsers, userSort);
  const sortedPosts = sortData(filteredPosts, postSort);

  // Paginated data
  const totalUserPages = Math.ceil(sortedUsers.length / ROWS_PER_PAGE);
  const paginatedUsers = sortedUsers.slice((usersPage - 1) * ROWS_PER_PAGE, usersPage * ROWS_PER_PAGE);
  const totalPostPages = Math.ceil(sortedPosts.length / ROWS_PER_PAGE);
  const paginatedPosts = sortedPosts.slice((postsPage - 1) * ROWS_PER_PAGE, postsPage * ROWS_PER_PAGE);

  // Reset page when search/filter changes
  useEffect(() => { setUsersPage(1); setPostsPage(1); }, [searchQuery, roleFilter, postStatusFilter]);
  useEffect(() => { setActivityPage(1); }, [activitySearch]);

  // --- FILTERED ACTIVITY LOGS ---
  const filteredActivityLogs = activityLogs.filter(log => {
    if (!activitySearch) return true;
    const sq = activitySearch.toLowerCase();
    return (log.action || "").toLowerCase().includes(sq) ||
      (log.details || "").toLowerCase().includes(sq) ||
      (log.adminEmail || "").toLowerCase().includes(sq);
  });
  const totalActivityPages = Math.ceil(filteredActivityLogs.length / ACTIVITY_PER_PAGE);
  const paginatedActivityLogs = filteredActivityLogs.slice((activityPage - 1) * ACTIVITY_PER_PAGE, activityPage * ACTIVITY_PER_PAGE);

  // --- EXPORT ACTIVITY LOG CSV ---
  const exportActivityCSV = () => {
    const headers = ["Action", "Details", "Admin", "Target ID", "Timestamp"];
    const rows = filteredActivityLogs.map(log => [
      log.action || "",
      log.details || "",
      log.adminEmail || "",
      log.targetId || "",
      log.timestamp || "",
    ]);
    downloadCSV(headers, rows, "mbc-activity-log-export.csv");
    logActivity("export", "Exported activity log CSV");
  };

  // --- VERIFICATION FILTERED LIST ---
  const filteredVerifications = users.filter(u => {
    if (verificationFilter === "pending") return u.verificationStatus === "pending";
    if (verificationFilter === "approved") return u.verificationStatus === "approved";
    if (verificationFilter === "rejected") return u.verificationStatus === "rejected";
    if (verificationFilter === "revoked") return u.verificationStatus === "revoked";
    return u.verificationStatus === "pending" || u.verificationStatus === "approved" || u.verificationStatus === "rejected" || u.verificationStatus === "revoked";
  });

  // --- RECENT SIGNUPS (last 24h) ---
  const recentSignups = users.filter(u => {
    if (!u.createdAt) return false;
    const diff = Date.now() - new Date(u.createdAt).getTime();
    return diff < 24 * 60 * 60 * 1000;
  });

  // --- USER POST COUNT HELPER ---
  const getUserPostCount = (userId: string) => posts.filter(p => p.userId === userId).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'Inter', sans-serif" }}>
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif", background: '#f9fafb' }}>
      {/* ========== MOBILE HAMBURGER ========== */}
      <button
        className="admin-hamburger"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          display: 'none', position: 'fixed', top: '16px', left: '16px', zIndex: 60,
          background: '#111827', color: 'white', border: 'none', borderRadius: '10px',
          padding: '10px 12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <FaBars size={18} />
      </button>

      {/* ========== MOBILE OVERLAY ========== */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          style={{ display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 49 }}
        />
      )}

      {/* ========== SIDEBAR ========== */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar-open' : ''}`} style={{
        width: '260px', background: '#111827', color: 'white', padding: '24px 0',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0,
        height: '100vh', zIndex: 50, boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
        overflowY: 'auto',
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
            { key: "dashboard", icon: <FaTachometerAlt size={16} />, label: "Dashboard" },
            { key: "analytics", icon: <FaChartBar size={16} />, label: "Analytics" },
            { key: "verifications", icon: <FaShieldAlt size={16} />, label: "Verifications" },
            { key: "users", icon: <FaUsers size={16} />, label: "Users" },
            { key: "posts", icon: <FaHome size={16} />, label: "Posts" },
            { key: "featured", icon: <FaStar size={16} />, label: "Featured" },
            { key: "reports", icon: <FaFlag size={16} />, label: "Reports" },
            { key: "reported-users", icon: <FaUserSlash size={16} />, label: "Reported Users" },
            { key: "activity", icon: <FaHistory size={16} />, label: "Activity Log" },
            { key: "settings", icon: <FaCog size={16} />, label: "Settings" },
          ] as { key: AdminTab; icon: any; label: string }[]).map(item => (
            <button
              key={item.key}
              onClick={() => { setActiveTab(item.key); setSearchQuery(""); setReportSearchQuery(""); setActivitySearch(""); setSidebarOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px',
                borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
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
              {item.key === 'verifications' && pendingVerCount > 0 && (
                <span style={{ marginLeft: 'auto', background: '#f59e0b', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '700' }}>
                  {pendingVerCount}
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
      <main className="admin-main" style={{ flex: 1, marginLeft: '260px', padding: '32px 40px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'analytics' && 'Analytics & Charts'}
              {activeTab === 'verifications' && 'Identity Verification'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'posts' && 'Post Management'}
              {activeTab === 'featured' && 'Featured Listings'}
              {activeTab === 'reports' && 'Reports'}
              {activeTab === 'reported-users' && 'Reported Users'}
              {activeTab === 'activity' && 'Activity Log'}
              {activeTab === 'settings' && 'Platform Settings'}
            </h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.85rem' }}>
              {activeTab === 'dashboard' && 'Real-time platform statistics'}
              {activeTab === 'analytics' && 'User and content growth trends'}
              {activeTab === 'verifications' && `${pendingVerCount} pending verifications`}
              {activeTab === 'users' && `${totalUsers} total users`}
              {activeTab === 'posts' && `${activePosts} active listings`}
              {activeTab === 'featured' && `${featuredPosts.length} featured listings`}
              {activeTab === 'reports' && `${pendingReports} pending reports`}
              {activeTab === 'reported-users' && 'Users with the most reports'}
              {activeTab === 'activity' && `${activityLogs.length} logged actions`}
              {activeTab === 'settings' && 'Email broadcast & platform configuration'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search bar for applicable tabs */}
            {['users', 'posts'].includes(activeTab) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0 14px' }}>
                <FaSearch style={{ color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder={activeTab === 'users' ? "Search users..." : "Search posts..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ border: 'none', outline: 'none', padding: '10px 0', fontSize: '0.85rem', width: '200px', background: 'transparent' }}
                />
              </div>
            )}
            {/* Filters */}
            {activeTab === 'users' && (
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '0.85rem', background: 'white', cursor: 'pointer' }}>
                <option value="all">All Roles</option>
                <option value="Client">Client</option>
                <option value="Seller">Seller</option>
                <option value="Agent">Agent</option>
              </select>
            )}
            {activeTab === 'posts' && (
              <select value={postStatusFilter} onChange={e => setPostStatusFilter(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '0.85rem', background: 'white', cursor: 'pointer' }}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            )}
            {activeTab === 'reports' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0 14px' }}>
                  <FaSearch style={{ color: '#9ca3af' }} />
                  <input type="text" placeholder="Search reports..." value={reportSearchQuery}
                    onChange={(e) => setReportSearchQuery(e.target.value)}
                    style={{ border: 'none', outline: 'none', padding: '10px 0', fontSize: '0.85rem', width: '180px', background: 'transparent' }} />
                </div>
                <select value={reportStatusFilter} onChange={e => setReportStatusFilter(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '0.85rem', background: 'white', cursor: 'pointer' }}>
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </>
            )}
            {activeTab === 'verifications' && (
              <select value={verificationFilter} onChange={e => setVerificationFilter(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '0.85rem', background: 'white', cursor: 'pointer' }}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="revoked">Revoked</option>
                <option value="all">All</option>
              </select>
            )}
            {activeTab === 'activity' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0 14px' }}>
                <FaSearch style={{ color: '#9ca3af' }} />
                <input type="text" placeholder="Search activity..." value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  style={{ border: 'none', outline: 'none', padding: '10px 0', fontSize: '0.85rem', width: '180px', background: 'transparent' }} />
              </div>
            )}
            {/* Export buttons */}
            {activeTab === 'users' && (
              <button onClick={exportUsersCSV} style={{ ...actionBtnStyle, padding: '10px 16px' }} title="Export CSV">
                <FaDownload size={12} /> Export
              </button>
            )}
            {activeTab === 'posts' && (
              <button onClick={exportPostsCSV} style={{ ...actionBtnStyle, padding: '10px 16px' }} title="Export CSV">
                <FaDownload size={12} /> Export
              </button>
            )}
            {activeTab === 'reports' && (
              <button onClick={exportReportsCSV} style={{ ...actionBtnStyle, padding: '10px 16px' }} title="Export CSV">
                <FaDownload size={12} /> Export
              </button>
            )}
            {activeTab === 'activity' && (
              <button onClick={exportActivityCSV} style={{ ...actionBtnStyle, padding: '10px 16px' }} title="Export CSV">
                <FaDownload size={12} /> Export
              </button>
            )}
          </div>
        </div>

        {/* ====== DASHBOARD TAB ====== */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              {[
                { label: 'Total Users', value: totalUsers, color: '#3b82f6', icon: <FaUsers /> },
                { label: 'Sellers', value: totalSellers, color: '#10b981', icon: <FaCheckCircle /> },
                { label: 'Agents', value: totalAgents, color: '#2563eb', icon: <FaCertificate /> },
                { label: 'Clients', value: totalClients, color: '#8b5cf6', icon: <FaUsers /> },
                { label: 'Pending Verification', value: pendingVerCount, color: '#f59e0b', icon: <FaShieldAlt /> },
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

            {/* Quick charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: '700', color: '#111827' }}>User Growth</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={getUsersByMonth()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: '700', color: '#111827' }}>Role Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={roleDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {roleDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent activity */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
              {/* Recent Reports */}
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
                      <button onClick={() => setActiveTab('reports')} style={{ background: '#111827', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>
                        Review
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Pending Verifications Quick-Action */}
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: '700', color: '#111827' }}>Pending Verifications</h3>
                {pendingVerifications.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No pending verifications.</p>
                ) : (
                  pendingVerifications.slice(0, 5).map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600', color: '#111' }}>
                          <FaShieldAlt size={11} color="#f59e0b" /> {u.firstName} {u.lastName}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                          {u.role} • {u.email}
                        </p>
                      </div>
                      <button onClick={() => setActiveTab('verifications')} style={{ background: '#111827', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>
                        Review
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Recent Signups (last 24h) */}
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: '700', color: '#111827' }}>Recent Signups (24h)</h3>
                {recentSignups.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No new signups in the last 24 hours.</p>
                ) : (
                  recentSignups.slice(0, 5).map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.firstName || 'U'}+${u.lastName || ''}&rounded=true&size=32`} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                        <div>
                          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600', color: '#111' }}>{u.firstName} {u.lastName}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>{u.role || 'Client'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ====== ANALYTICS TAB ====== */}
        {activeTab === 'analytics' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              {/* User Growth */}
              <div style={{ ...cardStyle }}>
                <h3 style={cardTitleStyle}>User Registrations (Monthly)</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={getUsersByMonth()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Post Growth */}
              <div style={{ ...cardStyle }}>
                <h3 style={cardTitleStyle}>Listings Created (Monthly)</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={getPostsByMonth()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="posts" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Role Distribution */}
              <div style={{ ...cardStyle }}>
                <h3 style={cardTitleStyle}>User Role Distribution</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={roleDistribution} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={(props: any) => `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`}>
                      {roleDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Reports by Status */}
              <div style={{ ...cardStyle }}>
                <h3 style={cardTitleStyle}>Reports by Status</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={reportsByStatus} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {reportsByStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* System Health */}
            <div style={{ ...cardStyle }}>
              <h3 style={cardTitleStyle}>System Health Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {[
                  { label: "Database Records", value: totalUsers + posts.length + reports.length, status: "healthy" },
                  { label: "Deactivated Users", value: users.filter(u => u.isDeactivated).length, status: users.filter(u => u.isDeactivated).length > 10 ? "warning" : "healthy" },
                  { label: "Unverified Pros", value: users.filter(u => u.verificationStatus === "pending").length, status: pendingVerCount > 5 ? "warning" : "healthy" },
                  { label: "Archived Posts", value: archivedPosts, status: "healthy" },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '16px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280' }}>{item.label}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#111' }}>{item.value}</p>
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: item.status === 'healthy' ? '#10b981' : '#f59e0b',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ====== USERS TAB ====== */}
        {activeTab === 'users' && (
          <div>
            {/* Bulk actions bar */}
            {selectedUsers.size > 0 && (
              <div style={{ background: '#111827', color: 'white', padding: '12px 20px', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{selectedUsers.size} user(s) selected</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleBulkDeactivateUsers} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' }}>
                    <FaBan size={11} /> Deactivate All
                  </button>
                  <button onClick={handleBulkReactivateUsers} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' }}>
                    <FaCheckCircle size={11} /> Reactivate All
                  </button>
                  <button onClick={() => setSelectedUsers(new Set())} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' }}>
                    Clear
                  </button>
                </div>
              </div>
            )}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                    <th style={{ ...thStyle, width: '40px' }}>
                      <input type="checkbox"
                        checked={paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUsers.has(u.id))}
                        onChange={(e) => {
                          const newSet = new Set(selectedUsers);
                          paginatedUsers.forEach(u => e.target.checked ? newSet.add(u.id) : newSet.delete(u.id));
                          setSelectedUsers(newSet);
                        }}
                      />
                    </th>
                    <th style={thStyle} onClick={() => toggleSort("firstName", userSort, setUserSort)}>
                      User <SortIcon field="firstName" current={userSort} />
                    </th>
                    <th style={thStyle} onClick={() => toggleSort("email", userSort, setUserSort)}>
                      Email <SortIcon field="email" current={userSort} />
                    </th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                      onClick={(e) => { if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'BUTTON') setDrawerUser(u); }}>
                      <td style={tdStyle} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedUsers.has(u.id)}
                          onChange={() => {
                            const newSet = new Set(selectedUsers);
                            newSet.has(u.id) ? newSet.delete(u.id) : newSet.add(u.id);
                            setSelectedUsers(newSet);
                          }}
                        />
                      </td>
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
                          background: u.role === 'Seller' ? '#ecfdf5' : u.role === 'Agent' ? '#eff6ff' : u.role === 'Admin' ? '#fef3c7' : '#f3f4f6',
                          color: u.role === 'Seller' ? '#10b981' : u.role === 'Agent' ? '#2563eb' : u.role === 'Admin' ? '#d97706' : '#6b7280',
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
                      <td style={tdStyle} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleChangeRole(u.id, u.role)} style={actionBtnStyle} title="Change Role">
                            <FaUsers size={12} />
                          </button>
                          <button onClick={() => handleDeactivateUser(u.id, !u.isDeactivated)} style={{ ...actionBtnStyle, color: u.isDeactivated ? '#10b981' : '#ef4444' }} title={u.isDeactivated ? 'Reactivate' : 'Deactivate'}>
                            <FaBan size={12} />
                          </button>
                          <button onClick={() => setDrawerUser(u)} style={actionBtnStyle} title="View Details">
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
                    Showing {(usersPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(usersPage * ROWS_PER_PAGE, sortedUsers.length)} of {sortedUsers.length}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button disabled={usersPage <= 1} onClick={() => setUsersPage(p => p - 1)} style={{ ...actionBtnStyle, opacity: usersPage <= 1 ? 0.4 : 1 }}>Prev</button>
                    <button disabled={usersPage >= totalUserPages} onClick={() => setUsersPage(p => p + 1)} style={{ ...actionBtnStyle, opacity: usersPage >= totalUserPages ? 0.4 : 1 }}>Next</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====== POSTS TAB ====== */}
        {activeTab === 'posts' && (
          <div>
            {selectedPosts.size > 0 && (
              <div style={{ background: '#111827', color: 'white', padding: '12px 20px', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{selectedPosts.size} post(s) selected</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleBulkArchivePosts} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' }}>
                    <FaTrash size={11} /> Archive All
                  </button>
                  <button onClick={handleBulkUnarchivePosts} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' }}>
                    <FaUndo size={11} /> Restore All
                  </button>
                  <button onClick={() => setSelectedPosts(new Set())} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' }}>
                    Clear
                  </button>
                </div>
              </div>
            )}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                    <th style={{ ...thStyle, width: '40px' }}>
                      <input type="checkbox"
                        checked={paginatedPosts.length > 0 && paginatedPosts.every(p => selectedPosts.has(p.id))}
                        onChange={(e) => {
                          const newSet = new Set(selectedPosts);
                          paginatedPosts.forEach(p => e.target.checked ? newSet.add(p.id) : newSet.delete(p.id));
                          setSelectedPosts(newSet);
                        }}
                      />
                    </th>
                    <th style={thStyle} onClick={() => toggleSort("title", postSort, setPostSort)}>
                      Listing <SortIcon field="title" current={postSort} />
                    </th>
                    <th style={thStyle}>Owner</th>
                    <th style={thStyle}>Location</th>
                    <th style={thStyle} onClick={() => toggleSort("price", postSort, setPostSort)}>
                      Price <SortIcon field="price" current={postSort} />
                    </th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPosts.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: p.isArchived ? 0.6 : 1, cursor: 'pointer' }}
                      onClick={(e) => { if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'BUTTON') setDrawerPost(p); }}>
                      <td style={tdStyle}>
                        <input type="checkbox" checked={selectedPosts.has(p.id)}
                          onChange={() => {
                            const newSet = new Set(selectedPosts);
                            newSet.has(p.id) ? newSet.delete(p.id) : newSet.add(p.id);
                            setSelectedPosts(newSet);
                          }}
                        />
                      </td>
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
                          background: p.isArchived ? '#fef2f2' : p.isFeatured ? '#fef3c7' : '#ecfdf5',
                          color: p.isArchived ? '#ef4444' : p.isFeatured ? '#d97706' : '#10b981',
                        }}>
                          {p.isArchived ? 'Archived' : p.isFeatured ? 'Featured' : (p.status || 'Active')}
                        </span>
                      </td>
                      <td style={tdStyle} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => setDrawerPost(p)} style={actionBtnStyle} title="View Details">
                            <FaEye size={12} />
                          </button>
                          {!p.isArchived && (
                            <>
                              <button onClick={() => handleToggleFeatured(p.id, !!p.isFeatured)} style={{ ...actionBtnStyle, color: p.isFeatured ? '#d97706' : '#9ca3af' }} title={p.isFeatured ? "Unfeature" : "Feature"}>
                                <FaStar size={12} />
                              </button>
                              <button onClick={() => handleRemovePost(p.id)} style={{ ...actionBtnStyle, color: '#ef4444' }} title="Archive">
                                <FaTrash size={12} />
                              </button>
                            </>
                          )}
                          {p.isArchived && (
                            <>
                              <button onClick={() => handleRestorePost(p.id)} style={{ ...actionBtnStyle, color: '#10b981' }} title="Restore">
                                <FaUndo size={12} />
                              </button>
                              <button onClick={() => handleHardDeletePost(p.id)} style={{ ...actionBtnStyle, color: '#ef4444' }} title="Delete Permanently">
                                <FaTimesCircle size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPostPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    Showing {(postsPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(postsPage * ROWS_PER_PAGE, sortedPosts.length)} of {sortedPosts.length}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button disabled={postsPage <= 1} onClick={() => setPostsPage(p => p - 1)} style={{ ...actionBtnStyle, opacity: postsPage <= 1 ? 0.4 : 1 }}>Prev</button>
                    <button disabled={postsPage >= totalPostPages} onClick={() => setPostsPage(p => p + 1)} style={{ ...actionBtnStyle, opacity: postsPage >= totalPostPages ? 0.4 : 1 }}>Next</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====== FEATURED LISTINGS TAB ====== */}
        {activeTab === 'featured' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {featuredPosts.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', gridColumn: '1 / -1' }}>
                <FaStar size={32} color="#d97706" />
                <p style={{ margin: '12px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>No featured listings yet. Feature posts from the Posts tab.</p>
              </div>
            ) : (
              [...featuredPosts].sort((a, b) => (a.featuredOrder || 0) - (b.featuredOrder || 0)).map((p, idx) => (
                <div key={p.id} style={{ ...cardStyle }}>
                  {p.images?.[0] && <img src={p.images[0]} style={{ width: '100%', height: '160px', borderRadius: '10px', objectFit: 'cover', marginBottom: '12px' }} alt="" />}
                  <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: '700', color: '#111' }}>{p.title || 'Untitled'}</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>{p.location || '—'} • {p.price || '—'}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#9ca3af' }}>By: {p.userName || '—'} • Order: #{idx + 1}</p>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                    <button onClick={() => handleChangeFeaturedOrder(p.id, "up")} disabled={idx === 0} style={{ ...actionBtnStyle, padding: '8px 10px', opacity: idx === 0 ? 0.4 : 1 }} title="Move Up">
                      <FaArrowUp size={12} />
                    </button>
                    <button onClick={() => handleChangeFeaturedOrder(p.id, "down")} disabled={idx === featuredPosts.length - 1} style={{ ...actionBtnStyle, padding: '8px 10px', opacity: idx === featuredPosts.length - 1 ? 0.4 : 1 }} title="Move Down">
                      <FaArrowDown size={12} />
                    </button>
                    <button onClick={() => handleToggleFeatured(p.id, true)} style={{ ...actionBtnStyle, color: '#ef4444', padding: '8px 14px' }}>
                      <FaStar size={12} /> Unfeature
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ====== VERIFICATIONS TAB ====== */}
        {activeTab === 'verifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredVerifications.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '40px', textAlign: 'center' }}>
                <FaCheckCircle size={32} color="#10b981" />
                <p style={{ margin: '12px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>No {verificationFilter === 'all' ? '' : verificationFilter} verifications found.</p>
              </div>
            ) : (
              filteredVerifications.map(u => (
                <div key={u.id} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  {/* User Info Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <img
                      src={u.photoURL || `https://ui-avatars.com/api/?name=${u.firstName || 'U'}+${u.lastName || ''}&rounded=true&size=48`}
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                      alt=""
                    />
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#111' }}>
                        {u.firstName} {u.lastName}
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                        {u.email} &middot;{' '}
                        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '600',
                          background: u.role === 'Seller' ? '#ecfdf5' : '#eff6ff',
                          color: u.role === 'Seller' ? '#10b981' : '#2563eb'
                        }}>
                          {u.role}
                        </span>
                        {' '}&middot;{' '}
                        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '600',
                          background: u.verificationStatus === 'approved' ? '#ecfdf5' : u.verificationStatus === 'rejected' ? '#fef2f2' : u.verificationStatus === 'revoked' ? '#fef2f2' : '#fef3c7',
                          color: u.verificationStatus === 'approved' ? '#10b981' : u.verificationStatus === 'rejected' ? '#ef4444' : u.verificationStatus === 'revoked' ? '#ef4444' : '#d97706',
                        }}>
                          {u.verificationStatus}
                        </span>
                        {' '}&middot; ID: <span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{u.customId}</span>
                        {' '}&middot; Registered: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Seller: Gov ID (Front & Back) */}
                  {u.role === 'Seller' && (
                    <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '12px', border: '1px solid #fde68a', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <FaIdCard size={14} color="#d97706" />
                        <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#92400e' }}>Government-Issued ID</span>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        {/* Front */}
                        {u.governmentIdFrontUrl ? (
                          <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#92400e', marginBottom: '6px' }}>Front Side</p>
                            <a href={u.governmentIdFrontUrl} target="_blank" rel="noopener noreferrer">
                              <img src={u.governmentIdFrontUrl} alt="Gov ID Front" style={{ maxWidth: '280px', maxHeight: '200px', borderRadius: '10px', border: '2px solid #e5e7eb', objectFit: 'cover', cursor: 'pointer' }} />
                            </a>
                          </div>
                        ) : u.governmentIdUrl ? (
                          <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#92400e', marginBottom: '6px' }}>ID Photo</p>
                            <a href={u.governmentIdUrl} target="_blank" rel="noopener noreferrer">
                              <img src={u.governmentIdUrl} alt="Gov ID" style={{ maxWidth: '280px', maxHeight: '200px', borderRadius: '10px', border: '2px solid #e5e7eb', objectFit: 'cover', cursor: 'pointer' }} />
                            </a>
                          </div>
                        ) : <p style={{ color: '#d97706', fontSize: '0.85rem' }}>No front ID uploaded.</p>}
                        {/* Back */}
                        {u.governmentIdBackUrl && (
                          <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#92400e', marginBottom: '6px' }}>Back Side</p>
                            <a href={u.governmentIdBackUrl} target="_blank" rel="noopener noreferrer">
                              <img src={u.governmentIdBackUrl} alt="Gov ID Back" style={{ maxWidth: '280px', maxHeight: '200px', borderRadius: '10px', border: '2px solid #e5e7eb', objectFit: 'cover', cursor: 'pointer' }} />
                            </a>
                          </div>
                        )}
                        {/* OCR */}
                        {(u.governmentIdOcrText) && (
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <p style={{ fontSize: '0.78rem', fontWeight: '600', color: '#92400e', marginBottom: '6px' }}>Extracted Text (OCR):</p>
                            <pre style={{ background: '#fef3c7', padding: '12px', borderRadius: '8px', fontSize: '0.75rem', color: '#78350f', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '180px', overflow: 'auto', margin: 0, border: '1px solid #fde68a' }}>
                              {u.governmentIdOcrText}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Agent: PRC License + Front & Back */}
                  {u.role === 'Agent' && (
                    <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <FaCertificate size={14} color="#2563eb" />
                        <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1e40af' }}>PRC License Verification</span>
                      </div>
                      <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#1e40af' }}>
                        License No: <span style={{ fontWeight: '700', fontFamily: 'monospace', fontSize: '1.1rem', color: '#1d4ed8' }}>{u.prcLicenseNo || '—'}</span>
                      </p>
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        {u.prcIdFrontUrl && (
                          <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e40af', marginBottom: '6px' }}>PRC ID — Front</p>
                            <a href={u.prcIdFrontUrl} target="_blank" rel="noopener noreferrer">
                              <img src={u.prcIdFrontUrl} alt="PRC Front" style={{ maxWidth: '280px', maxHeight: '200px', borderRadius: '10px', border: '2px solid #e5e7eb', objectFit: 'cover', cursor: 'pointer' }} />
                            </a>
                          </div>
                        )}
                        {u.prcIdBackUrl && (
                          <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e40af', marginBottom: '6px' }}>PRC ID — Back</p>
                            <a href={u.prcIdBackUrl} target="_blank" rel="noopener noreferrer">
                              <img src={u.prcIdBackUrl} alt="PRC Back" style={{ maxWidth: '280px', maxHeight: '200px', borderRadius: '10px', border: '2px solid #e5e7eb', objectFit: 'cover', cursor: 'pointer' }} />
                            </a>
                          </div>
                        )}
                        {u.prcOcrText && (
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <p style={{ fontSize: '0.78rem', fontWeight: '600', color: '#1e40af', marginBottom: '6px' }}>Extracted Text (OCR):</p>
                            <pre style={{ background: '#dbeafe', padding: '12px', borderRadius: '8px', fontSize: '0.75rem', color: '#1e3a5f', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '180px', overflow: 'auto', margin: 0, border: '1px solid #bfdbfe' }}>
                              {u.prcOcrText}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setDrawerUser(u)} style={{ ...actionBtnStyle, padding: '10px 18px', fontSize: '0.82rem' }}>
                      <FaEye size={12} /> View Details
                    </button>
                    {u.verificationStatus === 'pending' && (
                      <>
                        <button onClick={() => handleRejectVerification(u.id)} style={{ ...actionBtnStyle, padding: '10px 18px', fontSize: '0.82rem', color: '#ef4444', background: '#fef2f2' }}>
                          <FaTimesCircle size={12} /> Reject
                        </button>
                        <button onClick={() => handleApproveVerification(u.id)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FaCheckCircle size={12} /> Approve
                        </button>
                      </>
                    )}
                    {u.verificationStatus === 'approved' && (
                      <button onClick={() => handleRevokeVerification(u.id)} style={{ ...actionBtnStyle, padding: '10px 18px', fontSize: '0.82rem', color: '#ef4444', background: '#fef2f2' }}>
                        <FaTimesCircle size={12} /> Revoke
                      </button>
                    )}
                    {(u.verificationStatus === 'rejected' || u.verificationStatus === 'revoked') && (
                      <button onClick={() => handleApproveVerification(u.id)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaCheckCircle size={12} /> Re-Approve
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ====== REPORTS TAB ====== */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredReports.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '40px', textAlign: 'center' }}>
                <FaCheckCircle size={32} color="#10b981" />
                <p style={{ margin: '12px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>No reports found.</p>
              </div>
            ) : (
              filteredReports.map(r => (
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
                    {r.description && (
                      <div style={{ marginTop: '8px', background: '#f9fafb', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#374151', fontWeight: '600' }}>Description / Proof:</p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#4b5563', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{r.description}</p>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px', flexDirection: 'column', alignItems: 'flex-end' }}>
                    {r.postOwnerId && (
                      <button onClick={() => { const u = users.find(u => u.id === r.postOwnerId); if (u) setDrawerUser(u); }} style={{ ...actionBtnStyle, padding: '6px 12px', fontSize: '0.72rem' }} title="View Post Owner">
                        <FaEye size={10} /> Owner
                      </button>
                    )}
                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleDismissReport(r.id)} style={{ ...actionBtnStyle, padding: '8px 14px', fontSize: '0.78rem' }} title="Dismiss">
                          <FaTimes size={11} /> Dismiss
                        </button>
                        <button onClick={() => handleResolveReport(r.id, r.postId)} style={{ background: '#111827', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FaCheckCircle size={11} /> Resolve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ====== REPORTED USERS TAB ====== */}
        {activeTab === 'reported-users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {getReportedUsers().length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center' }}>
                <FaCheckCircle size={32} color="#10b981" />
                <p style={{ margin: '12px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>No reported users.</p>
              </div>
            ) : (
              getReportedUsers().map(ru => (
                <div key={ru.userId} style={{ ...cardStyle }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FaUserSlash size={16} color="#ef4444" />
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#111' }}>{ru.name}</h4>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280' }}>{ru.email}</p>
                      </div>
                    </div>
                    <span style={{ background: '#fef2f2', color: '#ef4444', padding: '4px 12px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700' }}>
                      {ru.count} report{ru.count > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {ru.reports.slice(0, 3).map((r: any) => (
                      <div key={r.id} style={{ fontSize: '0.8rem', color: '#6b7280', padding: '6px 10px', background: '#f9fafb', borderRadius: '6px' }}>
                        <strong>{r.reason}</strong> — {r.postTitle || 'Untitled'} ({r.status})
                      </div>
                    ))}
                    {ru.reports.length > 3 && <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>...and {ru.reports.length - 3} more</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button onClick={() => { const u = users.find(u => u.id === ru.userId); if (u) setDrawerUser(u); }} style={actionBtnStyle}>
                      <FaEye size={12} /> View User
                    </button>
                    <button onClick={() => handleDeactivateUser(ru.userId, true)} style={{ ...actionBtnStyle, color: '#ef4444' }}>
                      <FaBan size={12} /> Deactivate
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ====== ACTIVITY LOG TAB ====== */}
        {activeTab === 'activity' && (
          <div style={{ ...cardStyle }}>
            {filteredActivityLogs.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>No activity logs found.</p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {paginatedActivityLogs.map((log, i) => (
                    <div key={log.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FaHistory size={12} color="#6b7280" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600', color: '#111' }}>
                          {log.action?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>{log.details}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#9ca3af' }}>
                          by {log.adminEmail} • {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {totalActivityPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0 0', borderTop: '1px solid #e5e7eb', marginTop: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      Showing {(activityPage - 1) * ACTIVITY_PER_PAGE + 1}–{Math.min(activityPage * ACTIVITY_PER_PAGE, filteredActivityLogs.length)} of {filteredActivityLogs.length}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button disabled={activityPage <= 1} onClick={() => setActivityPage(p => p - 1)} style={{ ...actionBtnStyle, opacity: activityPage <= 1 ? 0.4 : 1 }}>Prev</button>
                      <button disabled={activityPage >= totalActivityPages} onClick={() => setActivityPage(p => p + 1)} style={{ ...actionBtnStyle, opacity: activityPage >= totalActivityPages ? 0.4 : 1 }}>Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ====== SETTINGS TAB ====== */}
        {activeTab === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
            {/* Email Broadcast */}
            <div style={{ ...cardStyle }}>
              <h3 style={cardTitleStyle}><FaEnvelope size={14} /> Email Broadcast</h3>
              <p style={{ fontSize: '0.83rem', color: '#6b7280', marginBottom: '16px' }}>Send an email to all users or a specific role group.</p>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Target Audience</label>
                <select value={broadcastTarget} onChange={e => setBroadcastTarget(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}>
                  <option value="all">All Users</option>
                  <option value="sellers">Sellers Only</option>
                  <option value="agents">Agents Only</option>
                  <option value="clients">Clients Only</option>
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Subject</label>
                <input type="text" value={broadcastSubject} onChange={e => setBroadcastSubject(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                  placeholder="Email subject line..."
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={formLabelStyle}>Message Body</label>
                <textarea value={broadcastBody} onChange={e => setBroadcastBody(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', minHeight: '120px', resize: 'vertical' }}
                  placeholder="Write your message here..."
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={handleSendBroadcast} disabled={isSendingBroadcast}
                  style={{ background: '#111827', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: isSendingBroadcast ? 0.7 : 1 }}>
                  {isSendingBroadcast ? <><FaSpinner className="spin" /> Sending...</> : <><FaEnvelope size={14} /> Send Broadcast</>}
                </button>
                <button onClick={() => setShowBroadcastPreview(!showBroadcastPreview)}
                  style={{ ...actionBtnStyle, padding: '12px 20px', fontSize: '0.9rem' }}>
                  <FaEye size={14} /> {showBroadcastPreview ? 'Hide Preview' : 'Preview'}
                </button>
              </div>
              {showBroadcastPreview && (broadcastSubject || broadcastBody) && (
                <div style={{ marginTop: '16px', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', background: '#f9fafb' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Preview</p>
                  <p style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: '700', color: '#111' }}>{broadcastSubject || '(No subject)'}</p>
                  <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{broadcastBody || '(No body)'}</div>
                  <p style={{ margin: '12px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>Target: {broadcastTarget} • Recipients: {
                    broadcastTarget === 'all' ? users.filter(u => u.email && !u.isDeactivated).length :
                    broadcastTarget === 'sellers' ? users.filter(u => u.role === 'Seller' && u.email && !u.isDeactivated).length :
                    broadcastTarget === 'agents' ? users.filter(u => u.role === 'Agent' && u.email && !u.isDeactivated).length :
                    users.filter(u => u.role === 'Client' && u.email && !u.isDeactivated).length
                  }</p>
                </div>
              )}
            </div>

            {/* Platform Info */}
            <div style={{ ...cardStyle }}>
              <h3 style={cardTitleStyle}><FaCog size={14} /> Platform Information</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                {[
                  { label: "Platform Name", value: "Metro Bacolod Connect" },
                  { label: "Admin Email", value: user?.email || "—" },
                  { label: "Total Database Records", value: `${totalUsers + posts.length + reports.length}` },
                  { label: "Frontend URL", value: window.location.origin },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{item.label}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#111', fontFamily: 'monospace' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========== USER DETAIL DRAWER ========== */}
      {drawerUser && (
        <>
          <div onClick={() => setDrawerUser(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 60 }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, width: '420px', maxWidth: '90vw', height: '100vh',
            background: 'white', zIndex: 70, boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
            overflowY: 'auto', padding: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#111' }}>User Details</h2>
              <button onClick={() => setDrawerUser(null)} style={{ background: '#f3f4f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                <FaTimes size={14} />
              </button>
            </div>

            {/* Avatar & Name */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <img
                src={drawerUser.photoURL || `https://ui-avatars.com/api/?name=${drawerUser.firstName || 'U'}+${drawerUser.lastName || ''}&rounded=true&size=80`}
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '12px' }}
                alt=""
              />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#111' }}>{drawerUser.firstName} {drawerUser.lastName}</h3>
              <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#6b7280' }}>{drawerUser.email}</p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
                <span style={{
                  padding: '4px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600',
                  background: drawerUser.role === 'Seller' ? '#ecfdf5' : drawerUser.role === 'Agent' ? '#eff6ff' : '#f3f4f6',
                  color: drawerUser.role === 'Seller' ? '#10b981' : drawerUser.role === 'Agent' ? '#2563eb' : '#6b7280',
                }}>{drawerUser.role || 'Client'}</span>
                <span style={{
                  padding: '4px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600',
                  background: drawerUser.isDeactivated ? '#fef2f2' : '#ecfdf5',
                  color: drawerUser.isDeactivated ? '#ef4444' : '#10b981',
                }}>{drawerUser.isDeactivated ? 'Deactivated' : 'Active'}</span>
                {drawerUser.isVerified !== undefined && (
                  <span style={{
                    padding: '4px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600',
                    background: drawerUser.isVerified ? '#ecfdf5' : '#fef3c7',
                    color: drawerUser.isVerified ? '#10b981' : '#d97706',
                  }}>{drawerUser.isVerified ? 'Verified' : 'Unverified'}</span>
                )}
              </div>
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {[
                { label: "Custom ID", value: drawerUser.customId },
                { label: "Mobile", value: drawerUser.mobile },
                { label: "Date of Birth", value: drawerUser.dob },
                { label: "Gender", value: drawerUser.gender },
                { label: "Marital Status", value: drawerUser.maritalStatus },
                { label: "Address", value: drawerUser.fullAddress ? `${drawerUser.fullAddress.street}, ${drawerUser.fullAddress.city}` : drawerUser.address },
                { label: "PRC License No", value: drawerUser.prcLicenseNo },
                { label: "Verification Status", value: drawerUser.verificationStatus },
                { label: "Total Posts", value: String(getUserPostCount(drawerUser.id)) },
                { label: "Joined", value: drawerUser.createdAt ? new Date(drawerUser.createdAt).toLocaleString() : '—' },
              ].filter(item => item.value).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{item.label}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#111', maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word' }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* ID Photos in drawer */}
            {(drawerUser.governmentIdFrontUrl || drawerUser.governmentIdUrl) && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '0.82rem', fontWeight: '700', color: '#92400e', marginBottom: '8px' }}>Government ID</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(drawerUser.governmentIdFrontUrl || drawerUser.governmentIdUrl) && (
                    <a href={drawerUser.governmentIdFrontUrl || drawerUser.governmentIdUrl} target="_blank" rel="noopener noreferrer">
                      <img src={drawerUser.governmentIdFrontUrl || drawerUser.governmentIdUrl} alt="ID Front" style={{ width: '160px', height: '100px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                    </a>
                  )}
                  {drawerUser.governmentIdBackUrl && (
                    <a href={drawerUser.governmentIdBackUrl} target="_blank" rel="noopener noreferrer">
                      <img src={drawerUser.governmentIdBackUrl} alt="ID Back" style={{ width: '160px', height: '100px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                    </a>
                  )}
                </div>
              </div>
            )}
            {drawerUser.prcIdFrontUrl && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e40af', marginBottom: '8px' }}>PRC ID</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a href={drawerUser.prcIdFrontUrl} target="_blank" rel="noopener noreferrer">
                    <img src={drawerUser.prcIdFrontUrl} alt="PRC Front" style={{ width: '160px', height: '100px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                  </a>
                  {drawerUser.prcIdBackUrl && (
                    <a href={drawerUser.prcIdBackUrl} target="_blank" rel="noopener noreferrer">
                      <img src={drawerUser.prcIdBackUrl} alt="PRC Back" style={{ width: '160px', height: '100px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => { handleChangeRole(drawerUser.id, drawerUser.role); }} style={{ ...actionBtnStyle, width: '100%', justifyContent: 'center', padding: '10px' }}>
                <FaUsers size={12} /> Change Role
              </button>
              <button onClick={() => { handleDeactivateUser(drawerUser.id, !drawerUser.isDeactivated); }} style={{ ...actionBtnStyle, width: '100%', justifyContent: 'center', padding: '10px', color: drawerUser.isDeactivated ? '#10b981' : '#ef4444' }}>
                <FaBan size={12} /> {drawerUser.isDeactivated ? 'Reactivate' : 'Deactivate'}
              </button>
              {drawerUser.role !== 'Admin' && (
                <button onClick={() => handlePromoteToAdmin(drawerUser.id)} style={{ ...actionBtnStyle, width: '100%', justifyContent: 'center', padding: '10px', color: '#d97706' }}>
                  <FaUserShield size={12} /> Promote to Admin
                </button>
              )}
              {drawerUser.role === 'Admin' && drawerUser.id !== user?.uid && (
                <button onClick={() => handleDemoteFromAdmin(drawerUser.id)} style={{ ...actionBtnStyle, width: '100%', justifyContent: 'center', padding: '10px', color: '#ef4444' }}>
                  <FaUserShield size={12} /> Demote from Admin
                </button>
              )}
              <button onClick={() => { navigate(`/profile/${drawerUser.id}`); }} style={{ ...actionBtnStyle, width: '100%', justifyContent: 'center', padding: '10px' }}>
                <FaEye size={12} /> View Public Profile
              </button>
              <div style={{ borderTop: '1px solid #fef2f2', paddingTop: '8px', marginTop: '4px' }}>
                <button onClick={() => handleHardDeleteUser(drawerUser.id)} style={{ ...actionBtnStyle, width: '100%', justifyContent: 'center', padding: '10px', color: '#ef4444', background: '#fef2f2' }}>
                  <FaTimesCircle size={12} /> Permanently Delete User
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Post Detail Drawer */}
      {drawerPost && (
        <>
          <div onClick={() => setDrawerPost(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 60 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px', maxWidth: '90vw', background: 'white', zIndex: 70, boxShadow: '-8px 0 30px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>Post Details</h3>
              <button onClick={() => setDrawerPost(null)} style={{ background: '#f3f4f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                <FaTimes />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              {/* Images */}
              {drawerPost.images && drawerPost.images.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: drawerPost.images.length === 1 ? '1fr' : '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
                  {drawerPost.images.map((img: string, i: number) => (
                    <img key={i} src={img} alt={`Post image ${i + 1}`} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                  ))}
                </div>
              )}

              {/* Title */}
              <h4 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: '700', color: '#111827' }}>{drawerPost.title || 'Untitled Post'}</h4>

              {/* Details */}
              {[
                { label: 'Owner', value: drawerPost.ownerName || drawerPost.ownerId || 'Unknown' },
                { label: 'Price', value: drawerPost.price ? `₱${Number(drawerPost.price).toLocaleString()}` : 'N/A' },
                { label: 'Category', value: drawerPost.category || 'N/A' },
                { label: 'Location', value: drawerPost.location || drawerPost.address || 'N/A' },
                { label: 'Status', value: drawerPost.isArchived ? 'Archived' : 'Active' },
                { label: 'Featured', value: drawerPost.isFeatured ? 'Yes' : 'No' },
                { label: 'Created', value: drawerPost.createdAt?.toDate ? new Date(drawerPost.createdAt.toDate()).toLocaleDateString() : 'N/A' },
              ].map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{d.label}</span>
                  <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#111827', textAlign: 'right', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.value}</span>
                </div>
              ))}

              {/* Description */}
              {drawerPost.description && (
                <div style={{ marginTop: '16px' }}>
                  <span style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: '600' }}>Description</span>
                  <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: '#374151', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{drawerPost.description}</p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
                <button onClick={() => { handleToggleFeatured(drawerPost.id, drawerPost.isFeatured); setDrawerPost({ ...drawerPost, isFeatured: !drawerPost.isFeatured }); }} style={{ ...actionBtnStyle, width: '100%', justifyContent: 'center', padding: '10px', color: drawerPost.isFeatured ? '#ef4444' : '#d97706' }}>
                  <FaStar size={12} /> {drawerPost.isFeatured ? 'Remove from Featured' : 'Add to Featured'}
                </button>
                {!drawerPost.isArchived ? (
                  <button onClick={() => { handleRemovePost(drawerPost.id); setDrawerPost(null); }} style={{ ...actionBtnStyle, width: '100%', justifyContent: 'center', padding: '10px', color: '#ef4444' }}>
                    <FaArchive size={12} /> Archive Post
                  </button>
                ) : (
                  <>
                    <button onClick={() => { handleRestorePost(drawerPost.id); setDrawerPost(null); }} style={{ ...actionBtnStyle, width: '100%', justifyContent: 'center', padding: '10px', color: '#10b981' }}>
                      <FaUndo size={12} /> Restore Post
                    </button>
                    <div style={{ borderTop: '1px solid #fef2f2', paddingTop: '8px', marginTop: '4px' }}>
                      <button onClick={() => { handleHardDeletePost(drawerPost.id); setDrawerPost(null); }} style={{ ...actionBtnStyle, width: '100%', justifyContent: 'center', padding: '10px', color: '#ef4444', background: '#fef2f2' }}>
                        <FaTimesCircle size={12} /> Permanently Delete
                      </button>
                    </div>
                  </>
                )}
                {drawerPost.ownerId && (
                  <button onClick={() => { const owner = users.find((u: any) => u.id === drawerPost.ownerId); if (owner) { setDrawerPost(null); setDrawerUser(owner); } }} style={{ ...actionBtnStyle, width: '100%', justifyContent: 'center', padding: '10px' }}>
                    <FaEye size={12} /> View Post Owner
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Shared styles
const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' };
const tdStyle: React.CSSProperties = { padding: '12px 16px' };
const actionBtnStyle: React.CSSProperties = { background: '#f3f4f6', border: 'none', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '500', transition: '0.2s' };
const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };
const cardTitleStyle: React.CSSProperties = { margin: '0 0 16px', fontSize: '1rem', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' };
const formLabelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: '600', color: '#374151' };
