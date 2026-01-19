import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase-config";
import { signOut } from "firebase/auth"; 
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
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);

    } catch (error: any) {
      console.error("Save Error:", error);
      setMessage("Failed to save details. " + error.message);
    }
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  const handleCancel = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="centered-page">
      <div className="centered-box">
        
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          {/* Using brand-logo class keeps it small */}
          <img src={logo} alt="MBC Logo" className="brand-logo" style={{ margin: "0 auto 15px auto" }} />
          <h2>Complete Profile</h2>
          <p style={{ color: "#94A3B8", marginTop: "10px" }}>
            We need a few details to verify your account.
          </p>
        </div>
        
        <div className="input-group">
          <label style={{ fontSize: "0.9rem", color: "#fff", marginBottom: "8px", display: "block" }}>
            Home Address
          </label>
          <input 
            type="text" 
            placeholder="e.g. Blk 10 Lot 5, Camella Homes" 
            value={address} 
            onChange={e => setAddress(e.target.value)} 
          />
        </div>

        <div className="input-group" style={{ marginTop: "20px" }}>
          <label style={{ fontSize: "0.9rem", color: "#fff", marginBottom: "8px", display: "block" }}>
            Phone Number
          </label>
          <input 
            type="tel" 
            placeholder="e.g. 0917 123 4567" 
            value={phone} 
            onChange={e => setPhone(e.target.value)} 
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "30px" }}>
          <button className="primary-btn" onClick={handleSaveProfile}>
            Save & Continue
          </button>

          <button 
            onClick={handleSkip}
            className="action-btn"
            style={{ border: "1px solid #334155", color: "#94A3B8" }} 
          >
            Skip for now
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: "25px", fontSize: "0.9rem" }}>
          <span 
            onClick={handleCancel} 
            style={{ color: "#ef4444", cursor: "pointer", fontWeight: "600" }}
          >
            Cancel and Logout
          </span>
        </p>

        {message && <p className="message-text" style={{ marginTop: "15px", textAlign: "center", color: "#38BDF8" }}>{message}</p>}
      </div>
    </div>
  );
}