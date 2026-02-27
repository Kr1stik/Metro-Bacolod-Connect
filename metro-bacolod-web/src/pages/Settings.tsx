import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import {
  FaSearch, FaUser, FaCog, FaSignOutAlt,
  FaTrash, FaHome, FaPalette, FaKey,
  FaDesktop, FaCamera, FaChevronRight, FaCheck, FaExclamationTriangle,
  FaLock, FaUserSlash, FaTrashAlt, FaSun, FaMoon
} from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import "../App.css";
import Swal from "sweetalert2";
import { glassToast } from "../components/GlassToast";
import { BACOLOD_LOCATIONS } from "../constants/locations";
import { canAccessTrash } from "../constants/roles";
import { useTheme } from "../context/ThemeContext";

// Removed "general" tab since those were all mocked features
type SettingsTab = "account" | "appearance";

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const navigate = useNavigate();

  // Appearance settings state
  const { theme, setTheme } = useTheme();

  // Account settings state
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // --- AUTH CHECK ---
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
            
            // Pre-fill account fields
            setEditName(data.firstName ? `${data.firstName} ${data.lastName}` : currentUser.displayName || "");
            setEditUsername(data.username || "");
            setEditEmail(currentUser.email || "");
            setEditPhone(data.mobile || ""); 
            setEditRegion(data.address || "");
            setEditDescription(data.description || "");
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Logout?",
      text: "Are you sure you want to sign out?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#111827",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, logout",
    });
    if (result.isConfirmed) {
      await signOut(auth);
      navigate("/");
    }
  };

  const savePreferences = async () => {
    if (!user) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        preferences: {
          theme,
        },
      });
      glassToast.success("Appearance saved!");
    } catch (err) {
      console.error(err);
      glassToast.error("Failed to save preferences.");
    }
  };

  const handleChangePassword = async () => {
    const { value: formValues } = await Swal.fire({
      title: '<span style="font-weight:800; font-size:1.5rem; color:#111;">Change Password</span>',
      html: `
        <div style="margin-top: 15px; text-align: left;">
          <label style="display:block; font-size:0.8rem; font-weight:700; color:#6b7280; margin-bottom:5px; margin-left:5px;">CURRENT PASSWORD</label>
          <input id="swal-current" type="password" class="swal2-input custom-glass-input" placeholder="••••••••" style="margin:0; width:100%; border-radius:12px; border:1px solid #d1d5db; padding:12px 15px; box-sizing:border-box;">
          
          <div style="height: 20px;"></div>
          
          <label style="display:block; font-size:0.8rem; font-weight:700; color:#6b7280; margin-bottom:5px; margin-left:5px;">NEW PASSWORD</label>
          <input id="swal-new" type="password" class="swal2-input custom-glass-input" placeholder="••••••••" style="margin:0; width:100%; border-radius:12px; border:1px solid #d1d5db; padding:12px 15px; box-sizing:border-box;">
          
          <div style="height: 20px;"></div>

          <label style="display:block; font-size:0.8rem; font-weight:700; color:#6b7280; margin-bottom:5px; margin-left:5px;">CONFIRM NEW PASSWORD</label>
          <input id="swal-confirm" type="password" class="swal2-input custom-glass-input" placeholder="••••••••" style="margin:0; width:100%; border-radius:12px; border:1px solid #d1d5db; padding:12px 15px; box-sizing:border-box;">
        </div>
      `,
      customClass: {
        popup: 'glass-modal-popup',
        confirmButton: 'glass-modal-confirm',
        cancelButton: 'glass-modal-cancel'
      },
      background: 'rgba(255, 255, 255, 0.8)',
      backdrop: `rgba(0,0,0,0.4) blur(10px)`,
      showCancelButton: true,
      confirmButtonText: 'Update Password',
      cancelButtonText: 'Cancel',
      focusConfirm: false,
      preConfirm: () => {
        const current = (document.getElementById("swal-current") as HTMLInputElement)?.value;
        const newPw = (document.getElementById("swal-new") as HTMLInputElement)?.value;
        const confirm = (document.getElementById("swal-confirm") as HTMLInputElement)?.value;
        if (!current || !newPw || !confirm) {
          Swal.showValidationMessage("Please fill in all fields.");
          return false;
        }
        if (newPw.length < 6) {
          Swal.showValidationMessage("Password must be at least 6 characters.");
          return false;
        }
        if (newPw !== confirm) {
          Swal.showValidationMessage("New passwords do not match.");
          return false;
        }
        return { current, newPw };
      },
    });

    if (formValues && user?.email) {
      try {
        const credential = EmailAuthProvider.credential(user.email, formValues.current);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, formValues.newPw);
        glassToast.success("Password updated successfully!");
      } catch (err: any) {
        if (err.code === 'auth/wrong-password') {
          glassToast.error("Current password is incorrect.");
        } else {
          glassToast.error(err.message || "Failed to update password.");
        }
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const nameParts = editName.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const userDocRef = doc(db, "users", user.uid);
      
      await updateDoc(userDocRef, {
        firstName,
        lastName,
        username: editUsername,
        mobile: editPhone,
        address: editRegion,
        description: editDescription,
      });
      
      setUserData((prev: any) => ({ 
        ...prev, 
        firstName, 
        lastName, 
        username: editUsername, 
        mobile: editPhone,
        address: editRegion,
        description: editDescription, 
      }));
      
      glassToast.success("Profile updated!");
    } catch (err) {
      console.error(err);
      glassToast.error("Failed to update profile.");
    }
  };

  const handleDeleteAccount = async () => {
    const result = await Swal.fire({
      title: "Delete Account?",
      html: '<p style="color:#6b7280;font-size:0.9rem;">This action is <strong>permanent</strong> and cannot be undone. All your data will be removed.</p>',
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Delete My Account",
      input: "text",
      inputPlaceholder: 'Type "DELETE" to confirm',
      inputValidator: (value) => {
        if (value !== "DELETE") return 'Please type "DELETE" to confirm.';
      },
    });
    if (result.isConfirmed) {
      try {
        await user.delete();
        glassToast.success("Account deleted.");
        navigate("/");
      } catch (err: any) {
        glassToast.error(err.message || "Failed to delete account. Please re-login and try again.");
      }
    }
  };

  const handleDeactivateAccount = async () => {
    const result = await Swal.fire({
      title: "Deactivate Account?",
      text: "Your account will be hidden from others. You can reactivate by logging in again.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#111827",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Deactivate",
    });
    if (result.isConfirmed) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { isDeactivated: true });
        await signOut(auth);
        glassToast.success("Account deactivated.");
        navigate("/");
      } catch (err) {
        glassToast.error("Failed to deactivate account.");
      }
    }
  };

  const displayName = userData?.firstName
    ? `${userData.firstName} ${userData.lastName}`
    : user?.displayName || "User";
  const userRole = userData?.role || "Client";

  const renderAppearanceSettings = () => (
    <div className="settings-section-group">
      {/* Theme */}
      <div className="settings-card">
        <div className="settings-card-header">
          <FaPalette className="settings-card-icon" />
          <h3>Theme</h3>
        </div>
        <div className="settings-card-body">
          <div className="settings-theme-options">
            <button
              className={`settings-theme-btn ${theme === "light" ? "settings-theme-active" : ""}`}
              onClick={() => setTheme("light")}
            >
              <FaSun size={20} />
              <span>Light</span>
              {theme === "light" && <FaCheck className="settings-theme-check" />}
            </button>
            <button
              className={`settings-theme-btn settings-theme-dark-btn ${theme === "dark" ? "settings-theme-active" : ""}`}
              onClick={() => setTheme("dark")}
            >
              <FaMoon size={20} />
              <span>Dark</span>
              {theme === "dark" && <FaCheck className="settings-theme-check" />}
            </button>
            <button
              className={`settings-theme-btn settings-theme-system-btn ${theme === "system" ? "settings-theme-active" : ""}`}
              onClick={() => setTheme("system")}
            >
              <FaDesktop size={20} />
              <span>System</span>
              {theme === "system" && <FaCheck className="settings-theme-check" />}
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="settings-action-row">
        <button className="settings-btn-primary" onClick={savePreferences}>Save Appearance</button>
      </div>
    </div>
  );

  const renderAccountSettings = () => (
    <div className="settings-section-group">
      {/* Profile Information */}
      <div className="settings-card">
        <div className="settings-card-header">
          <FaUser className="settings-card-icon" />
          <h3>Profile Information</h3>
        </div>
        <div className="settings-card-body">
          <div className="settings-profile-pic-row">
            <div className="settings-profile-pic">
              <img
                src={user?.photoURL || "https://ui-avatars.com/api/?name=User&background=d1d5db&color=6b7280&rounded=true&size=128"}
                alt="Profile"
              />
              <div className="settings-profile-pic-overlay">
                <FaCamera size={16} />
              </div>
            </div>
            <div className="settings-profile-pic-text">
              <span className="settings-profile-pic-label">Profile picture</span>
              <span className="settings-profile-pic-hint">JPG, PNG. Max 5MB.</span>
            </div>
          </div>
          <div className="settings-field">
            <label>Full Name</label>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="settings-input" placeholder="Your full name" />
          </div>
          <div className="settings-field">
            <label>Username</label>
            <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="settings-input" placeholder="@username" />
          </div>
          <div className="settings-field">
            <label>Email</label>
            <input type="email" value={editEmail} disabled className="settings-input settings-input-disabled" />
            <span className="settings-field-hint">Email cannot be changed here.</span>
          </div>
          <div className="settings-field">
            <label>Phone Number</label>
            <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="settings-input" placeholder="+63 900 000 0000" />
          </div>
          
          <div className="settings-field">
            <label>Location / Branch</label>
            <select value={editRegion} onChange={(e) => setEditRegion(e.target.value)} className="settings-select">
              <option value="">Select location</option>
              {BACOLOD_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div className="settings-field">
            <label>Profile Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="settings-input settings-textarea"
              placeholder="Tell others about yourself, your expertise, and what you do..."
              rows={4}
              maxLength={500}
            />
            <span className="settings-field-hint">{editDescription.length}/500 characters</span>
          </div>
          <button className="settings-btn-primary" onClick={handleSaveProfile} style={{ marginTop: 8 }}>
            Save Profile
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="settings-card">
        <div className="settings-card-header">
          <FaKey className="settings-card-icon" />
          <h3>Security</h3>
        </div>
        <div className="settings-card-body">
          <div className="settings-action-item" onClick={handleChangePassword}>
            <div className="settings-action-item-left">
              <FaLock className="settings-action-icon" />
              <div>
                <span className="settings-action-title">Change Password</span>
                <span className="settings-action-desc">Update your account password</span>
              </div>
            </div>
            <FaChevronRight className="settings-chevron" />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="settings-card settings-card-danger">
        <div className="settings-card-header">
          <FaExclamationTriangle className="settings-card-icon" style={{ color: "#ef4444" }} />
          <h3 style={{ color: "#ef4444" }}>Danger Zone</h3>
        </div>
        <div className="settings-card-body">
          <div className="settings-action-item" onClick={handleDeactivateAccount}>
            <div className="settings-action-item-left">
              <FaUserSlash className="settings-action-icon" style={{ color: "#f59e0b" }} />
              <div>
                <span className="settings-action-title">Deactivate Account</span>
                <span className="settings-action-desc">Temporarily hide your account</span>
              </div>
            </div>
            <FaChevronRight className="settings-chevron" />
          </div>
          <div className="settings-divider" />
          <div className="settings-action-item" onClick={handleDeleteAccount}>
            <div className="settings-action-item-left">
              <FaTrashAlt className="settings-action-icon" style={{ color: "#ef4444" }} />
              <div>
                <span className="settings-action-title" style={{ color: "#ef4444" }}>Delete Account</span>
                <span className="settings-action-desc">Permanently remove your account and data</span>
              </div>
            </div>
            <FaChevronRight className="settings-chevron" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="settings-page">

      {/* ========== NAVBAR (same as Dashboard/Profile) ========== */}
      <nav className="dash-nav">
        <div className="dash-nav-left">
          <img src={logo} alt="MBC Logo" className="dash-logo" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }} />
        </div>
        <div className="dash-nav-right">
          <div className="dash-user-trigger" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <div className="dash-user-text">
              <span className="dash-user-name">{displayName}</span>
              <span className="dash-user-role">{userRole}</span>
            </div>
            <img
              src={user?.photoURL || "https://ui-avatars.com/api/?name=User&background=e5e7eb&color=9ca3af&rounded=true"}
              alt="avatar"
              className="dash-avatar"
            />
          </div>
          {isDropdownOpen && (
            <div className="dash-dropdown">
              <div className="dash-dropdown-item" onClick={() => { navigate("/profile"); setIsDropdownOpen(false); }}><FaUser /> Profile</div>
              <div className="dash-dropdown-item" onClick={() => { navigate("/settings"); setIsDropdownOpen(false); }}><FaCog /> Settings</div>
              {canAccessTrash(userData?.role, user?.email) && (
                <div className="dash-dropdown-item" onClick={() => { navigate("/archive"); setIsDropdownOpen(false); }}><FaTrash /> Trash</div>
              )}
              <div className="dash-dropdown-divider" />
              <div className="dash-dropdown-item dash-dropdown-logout" onClick={handleLogout}><FaSignOutAlt /> Logout</div>
            </div>
          )}
        </div>
      </nav>

      {/* ========== MAIN CONTENT ========== */}
      <div className="settings-content">
        {/* --- Sidebar Tabs --- */}
        <aside className="settings-sidebar">
          <h2 className="settings-sidebar-title">Settings</h2>
          <nav className="settings-sidebar-nav">
            <button
              className={`settings-sidebar-item ${activeTab === "account" ? "settings-sidebar-active" : ""}`}
              onClick={() => setActiveTab("account")}
            >
              <FaUser size={15} />
              <span>Account</span>
            </button>
            <button
              className={`settings-sidebar-item ${activeTab === "appearance" ? "settings-sidebar-active" : ""}`}
              onClick={() => setActiveTab("appearance")}
            >
              <FaPalette size={15} />
              <span>Appearance</span>
            </button>
          </nav>
        </aside>

        {/* --- Main Panel --- */}
        <main className="settings-main">
          {/* Mobile Tab Bar */}
          <div className="settings-mobile-tabs">
            <button className={`settings-mobile-tab ${activeTab === "account" ? "settings-mobile-tab-active" : ""}`} onClick={() => setActiveTab("account")}>Account</button>
            <button className={`settings-mobile-tab ${activeTab === "appearance" ? "settings-mobile-tab-active" : ""}`} onClick={() => setActiveTab("appearance")}>Appearance</button>
          </div>

          <div className="settings-panel">
            {activeTab === "account" && renderAccountSettings()}
            {activeTab === "appearance" && renderAppearanceSettings()}
          </div>
        </main>
      </div>

      {/* ========== MOBILE BOTTOM NAV ========== */}
      <div className="dash-mobile-nav">
        <div className="dash-mobile-nav-item" onClick={() => navigate("/dashboard")}>
          <FaHome size={22} /><span>Home</span>
        </div>
        <div className="dash-mobile-nav-item" onClick={() => navigate("/profile")}>
          <FaUser size={22} /><span>Profile</span>
        </div>
        {canAccessTrash(userData?.role, user?.email) && (
          <div className="dash-mobile-nav-item" onClick={() => navigate("/archive")}>
            <FaTrash size={22} /><span>Trash</span>
          </div>
        )}
        <div className="dash-mobile-nav-item active">
          <FaCog size={22} /><span>Settings</span>
        </div>
      </div>
    </div>
  );
}