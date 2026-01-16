import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase-config";
import { signOut } from "firebase/auth"; // Import signOut in case they want to cancel completely
import api from "../services/api";
import logo from "../assets/MBC Logo.png";
import "../App.css";

export default function CompleteProfile() {
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // Protect the route
  useEffect(() => {
    const checkAuth = setTimeout(() => {
      if (!auth.currentUser) {
        navigate("/");
      }
    }, 1000);
    return () => clearTimeout(checkAuth);
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!address || !phone) {
      setMessage("Please fill in all fields.");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      const googleName = user.displayName ? user.displayName.split(" ") : ["User", ""];
      const firstName = googleName[0];
      const lastName = googleName.slice(1).join(" ") || "";

      await api.post('/users/create', {
        uid: user.uid,
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        address: address,
        phone: phone,
        role: 'user'
      });

      setMessage("Profile saved! Redirecting...");
      
      // DELAY: Wait 1 second so user sees the success message, then go to Dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);

    } catch (error: any) {
      console.error("Save Error:", error);
      setMessage("Failed to save details. " + error.message);
    }
  };

  // NEW: Handle the "Skip" action
  const handleSkip = () => {
    // User wants to fill this later. Just send them to Dashboard.
    console.log("User skipped profile completion.");
    navigate("/dashboard");
  };

  // Optional: Handle "Cancel/Logout" if they didn't mean to sign in
  const handleCancel = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="centered-page">
      <div className="login-box centered-box">
        
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <img src={logo} alt="MBC Logo" style={{ width: "60px", marginBottom: "10px" }} />
          <h2>Complete Your Profile</h2>
          <p className="login-subtext">
            We need a few details to verify your account. You can also do this later.
          </p>
        </div>
        
        <div className="input-group">
          <label style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "5px", display: "block" }}>
            Home Address
          </label>
          <input 
            type="text" 
            placeholder="e.g. Blk 10 Lot 5, Camella Homes" 
            value={address} 
            onChange={e => setAddress(e.target.value)} 
          />
        </div>

        <div className="input-group">
          <label style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "5px", display: "block" }}>
            Phone Number
          </label>
          <input 
            type="tel" 
            placeholder="e.g. 0917 123 4567" 
            value={phone} 
            onChange={e => setPhone(e.target.value)} 
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
          
          {/* Main Save Button */}
          <button className="primary-btn" onClick={handleSaveProfile}>
            Save & Continue
          </button>

          {/* Skip Button (The "Back" option) */}
          <button 
            onClick={handleSkip}
            style={{
              background: "transparent",
              border: "1px solid #ccc",
              padding: "12px",
              borderRadius: "8px",
              cursor: "pointer",
              color: "#666",
              fontWeight: "600"
            }}
          >
            Skip for now
          </button>

        </div>

        {/* Cancel Link */}
        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "0.9rem" }}>
          <span 
            onClick={handleCancel} 
            style={{ color: "#888", cursor: "pointer", textDecoration: "underline" }}
          >
            Cancel and Logout
          </span>
        </p>

        {message && <p className="message-text" style={{ marginTop: "15px" }}>{message}</p>}
      </div>
    </div>
  );
}