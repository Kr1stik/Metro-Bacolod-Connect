import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import {
  FaSearch, FaUser, FaCog, FaSignOutAlt, FaCaretDown,
  FaTrash, FaHome, FaEnvelope, FaGlobe, FaBell,
  FaShieldAlt, FaUndo, FaPalette, FaEye, FaKey,
  FaGoogle, FaFacebook, FaApple, FaDesktop, FaMobile,
  FaCamera, FaChevronRight, FaCheck, FaExclamationTriangle,
  FaLock, FaUserSlash, FaTrashAlt, FaLink, FaSun
} from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import "../App.css";
import Swal from "sweetalert2";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BACOLOD_LOCATIONS } from "../constants/locations";

type SettingsTab = "general" | "appearance" | "account";

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const navigate = useNavigate();

  // General settings state
  const [language, setLanguage] = useState("en");
  const [region, setRegion] = useState("");
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [dataSharing, setDataSharing] = useState(true);

  // Appearance settings state
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [reducedMotion, setReducedMotion] = useState(false);

  // Account settings state
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

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
            setEditPhone(data.phone || "");
            setRegion(data.address || "");
            // Load saved preferences
            if (data.preferences) {
              setLanguage(data.preferences.language || "en");
              setEmailNotifs(data.preferences.emailNotifs ?? true);
              setPushNotifs(data.preferences.pushNotifs ?? true);
              setSmsAlerts(data.preferences.smsAlerts ?? false);
              setDataSharing(data.preferences.dataSharing ?? true);
              setReducedMotion(data.preferences.reducedMotion ?? false);
            }
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
          language,
          emailNotifs,
          pushNotifs,
          smsAlerts,
          dataSharing,
          reducedMotion,
          theme,
        },
      });
      toast.success("Preferences saved!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save preferences.");
    }
  };

  const handleResetSettings = async () => {
    const result = await Swal.fire({
      title: "Reset Settings?",
      text: "This will restore all settings to their defaults.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#111827",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, reset",
    });
    if (result.isConfirmed) {
      setLanguage("en");
      setRegion("");
      setEmailNotifs(true);
      setPushNotifs(true);
      setSmsAlerts(false);
      setDataSharing(true);
      setTheme("light");
      setReducedMotion(false);
      toast.success("Settings reset to defaults.");
    }
  };

  const handleChangePassword = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Change Password",
      html:
        '<input id="swal-current" type="password" class="swal2-input" placeholder="Current password">' +
        '<input id="swal-new" type="password" class="swal2-input" placeholder="New password">' +
        '<input id="swal-confirm" type="password" class="swal2-input" placeholder="Confirm new password">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: "#111827",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Update Password",
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
          Swal.showValidationMessage("Passwords do not match.");
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
        toast.success("Password updated successfully!");
      } catch (err: any) {
        toast.error(err.message || "Failed to update password.");
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
        phone: editPhone,
        address: region,
      });
      setUserData((prev: any) => ({ ...prev, firstName, lastName, username: editUsername, phone: editPhone, address: region }));
      toast.success("Profile updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile.");
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
        toast.success("Account deleted.");
        navigate("/");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete account. Please re-login and try again.");
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
        toast.success("Account deactivated.");
        navigate("/");
      } catch (err) {
        toast.error("Failed to deactivate account.");
      }
    }
  };

  const handleLogoutAllDevices = async () => {
    const result = await Swal.fire({
      title: "Log Out Everywhere?",
      text: "You will be signed out from all devices, including this one.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#111827",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Log Out All",
    });
    if (result.isConfirmed) {
      try {
        await signOut(auth);
        toast.success("Logged out from all devices.");
        navigate("/");
      } catch (err) {
        toast.error("Failed to log out.");
      }
    }
  };

  const displayName = userData?.firstName
    ? `${userData.firstName} ${userData.lastName}`
    : user?.displayName || "User";
  const userRole = userData?.role || "Client";

  // --- Toggle Component ---
  const Toggle = ({ enabled, onToggle, label }: { enabled: boolean; onToggle: () => void; label: string }) => (
    <div className="settings-toggle-row">
      <span className="settings-toggle-label">{label}</span>
      <button
        className={`settings-toggle ${enabled ? "settings-toggle-on" : ""}`}
        onClick={onToggle}
        type="button"
        aria-label={label}
      >
        <span className="settings-toggle-knob" />
      </button>
    </div>
  );

  // --- Tab Content ---
  const renderGeneralSettings = () => (
    <div className="settings-section-group">
      {/* Language */}
      <div className="settings-card">
        <div className="settings-card-header">
          <FaGlobe className="settings-card-icon" />
          <h3>Language & Region</h3>
        </div>
        <div className="settings-card-body">
          <div className="settings-field">
            <label>Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="settings-select">
              <option value="en">English</option>
              <option value="fil">Filipino</option>
              <option value="ceb">Cebuano</option>
              <option value="hil">Hiligaynon</option>
            </select>
          </div>
          <div className="settings-field">
            <label>Region / Location</label>
            <select value={region} onChange={(e) => setRegion(e.target.value)} className="settings-select">
              <option value="">Select location</option>
              {BACOLOD_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="settings-card">
        <div className="settings-card-header">
          <FaBell className="settings-card-icon" />
          <h3>Notifications</h3>
        </div>
        <div className="settings-card-body">
          <Toggle enabled={emailNotifs} onToggle={() => setEmailNotifs(!emailNotifs)} label="Email notifications" />
          <Toggle enabled={pushNotifs} onToggle={() => setPushNotifs(!pushNotifs)} label="Push notifications" />
          <Toggle enabled={smsAlerts} onToggle={() => setSmsAlerts(!smsAlerts)} label="SMS alerts" />
        </div>
      </div>

      {/* Privacy */}
      <div className="settings-card">
        <div className="settings-card-header">
          <FaShieldAlt className="settings-card-icon" />
          <h3>Privacy Controls</h3>
        </div>
        <div className="settings-card-body">
          <Toggle enabled={dataSharing} onToggle={() => setDataSharing(!dataSharing)} label="Data sharing preferences" />
          <p className="settings-field-hint">Allow Metro Bacolod Connect to share usage data to improve the platform.</p>
        </div>
      </div>

      {/* Actions */}
      <div className="settings-action-row">
        <button className="settings-btn-primary" onClick={savePreferences}>Save Preferences</button>
        <button className="settings-btn-outline" onClick={handleResetSettings}>
          <FaUndo size={12} /> Reset to Defaults
        </button>
      </div>
    </div>
  );

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
              className={`settings-theme-btn settings-theme-dark-btn`}
              disabled
              title="Coming soon"
            >
              <FaEye size={20} />
              <span>Dark</span>
              <span className="settings-badge-soon">Soon</span>
            </button>
            <button
              className={`settings-theme-btn settings-theme-system-btn`}
              disabled
              title="Coming soon"
            >
              <FaDesktop size={20} />
              <span>System</span>
              <span className="settings-badge-soon">Soon</span>
            </button>
          </div>
        </div>
      </div>

      {/* Accessibility */}
      <div className="settings-card">
        <div className="settings-card-header">
          <FaEye className="settings-card-icon" />
          <h3>Accessibility</h3>
        </div>
        <div className="settings-card-body">
          <Toggle enabled={reducedMotion} onToggle={() => setReducedMotion(!reducedMotion)} label="Reduced motion / animations" />
          <p className="settings-field-hint">Minimize animations and transitions throughout the app.</p>
        </div>
      </div>

      {/* Actions */}
      <div className="settings-action-row">
        <button className="settings-btn-primary" onClick={savePreferences}>Save Preferences</button>
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
          <div className="settings-divider" />
          <Toggle enabled={twoFAEnabled} onToggle={() => {
            setTwoFAEnabled(!twoFAEnabled);
            toast.info(twoFAEnabled ? "2FA disabled (mock)" : "2FA enabled (mock)");
          }} label="Two-Factor Authentication (2FA)" />
          <p className="settings-field-hint">Add an extra layer of security with 2FA.</p>
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="settings-card">
        <div className="settings-card-header">
          <FaLink className="settings-card-icon" />
          <h3>Connected Accounts</h3>
        </div>
        <div className="settings-card-body">
          <div className="settings-connected-row">
            <div className="settings-connected-info">
              <FaGoogle className="settings-connected-icon settings-icon-google" />
              <div>
                <span className="settings-connected-name">Google</span>
                <span className="settings-connected-status">
                  {user?.providerData?.some((p: any) => p.providerId === "google.com") ? "Connected" : "Not connected"}
                </span>
              </div>
            </div>
            <button className="settings-btn-small">
              {user?.providerData?.some((p: any) => p.providerId === "google.com") ? "Disconnect" : "Connect"}
            </button>
          </div>
          <div className="settings-divider" />
          <div className="settings-connected-row">
            <div className="settings-connected-info">
              <FaFacebook className="settings-connected-icon settings-icon-facebook" />
              <div>
                <span className="settings-connected-name">Facebook</span>
                <span className="settings-connected-status">Not connected</span>
              </div>
            </div>
            <button className="settings-btn-small">Connect</button>
          </div>
          <div className="settings-divider" />
          <div className="settings-connected-row">
            <div className="settings-connected-info">
              <FaApple className="settings-connected-icon settings-icon-apple" />
              <div>
                <span className="settings-connected-name">Apple</span>
                <span className="settings-connected-status">Not connected</span>
              </div>
            </div>
            <button className="settings-btn-small">Connect</button>
          </div>
        </div>
      </div>

      {/* Session Management */}
      <div className="settings-card">
        <div className="settings-card-header">
          <FaDesktop className="settings-card-icon" />
          <h3>Session Management</h3>
        </div>
        <div className="settings-card-body">
          <div className="settings-session-item">
            <div className="settings-session-info">
              <FaDesktop className="settings-session-icon" />
              <div>
                <span className="settings-session-name">This device</span>
                <span className="settings-session-detail">Active now</span>
              </div>
            </div>
            <span className="settings-badge-active">Active</span>
          </div>
          <div className="settings-divider" />
          <div className="settings-action-item" onClick={handleLogoutAllDevices}>
            <div className="settings-action-item-left">
              <FaSignOutAlt className="settings-action-icon" style={{ color: "#ef4444" }} />
              <div>
                <span className="settings-action-title" style={{ color: "#ef4444" }}>Log out from all devices</span>
                <span className="settings-action-desc">End all active sessions</span>
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
      <ToastContainer position="top-right" theme="light" />

      {/* ========== NAVBAR (same as Dashboard/Profile) ========== */}
      <nav className="dash-nav">
        <div className="dash-nav-left">
          <img src={logo} alt="MBC Logo" className="dash-logo" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }} />
          <div className="dash-search-wrapper">
            <FaSearch className="dash-search-icon" />
            <input type="text" className="dash-search-input" placeholder="Look for agents..." />
          </div>
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
              {userData?.role === "Agent" && (
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
              className={`settings-sidebar-item ${activeTab === "general" ? "settings-sidebar-active" : ""}`}
              onClick={() => setActiveTab("general")}
            >
              <FaCog size={15} />
              <span>General</span>
            </button>
            <button
              className={`settings-sidebar-item ${activeTab === "appearance" ? "settings-sidebar-active" : ""}`}
              onClick={() => setActiveTab("appearance")}
            >
              <FaPalette size={15} />
              <span>Appearance</span>
            </button>
            <button
              className={`settings-sidebar-item ${activeTab === "account" ? "settings-sidebar-active" : ""}`}
              onClick={() => setActiveTab("account")}
            >
              <FaUser size={15} />
              <span>Account</span>
            </button>
          </nav>
        </aside>

        {/* --- Main Panel --- */}
        <main className="settings-main">
          {/* Mobile Tab Bar */}
          <div className="settings-mobile-tabs">
            <button className={`settings-mobile-tab ${activeTab === "general" ? "settings-mobile-tab-active" : ""}`} onClick={() => setActiveTab("general")}>General</button>
            <button className={`settings-mobile-tab ${activeTab === "appearance" ? "settings-mobile-tab-active" : ""}`} onClick={() => setActiveTab("appearance")}>Appearance</button>
            <button className={`settings-mobile-tab ${activeTab === "account" ? "settings-mobile-tab-active" : ""}`} onClick={() => setActiveTab("account")}>Account</button>
          </div>

          <div className="settings-panel">
            {activeTab === "general" && renderGeneralSettings()}
            {activeTab === "appearance" && renderAppearanceSettings()}
            {activeTab === "account" && renderAccountSettings()}
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
        <div className="dash-mobile-nav-item active">
          <FaCog size={22} /><span>Settings</span>
        </div>
        <div className="dash-mobile-nav-item" onClick={handleLogout}>
          <FaSignOutAlt size={22} /><span>Logout</span>
        </div>
      </div>
    </div>
  );
}
