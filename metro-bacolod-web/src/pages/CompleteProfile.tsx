import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase-config";
import { signOut } from "firebase/auth"; 
import api from "../services/api";
import logo from "../assets/MBC Logo.png";
import "../App.css";
import { BACOLOD_LOCATIONS } from "../constants/locations"; 

export default function CompleteProfile() {
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

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

  const handleSkip = () => navigate("/dashboard");
  const handleCancel = async () => { await signOut(auth); navigate("/"); };

  return (
    // FORCE CENTER PARENT
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#0f172a' // Dark Background
    }}>
      
      {/* CENTERED BOX */}
      <div style={{
        width: '100%',
        maxWidth: '500px',
        background: '#1e293b', // Card Color
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #334155'
      }}>
        
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <img src={logo} alt="MBC Logo" style={{ width: '60px', margin: "0 auto 15px auto", display: 'block' }} />
          <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>Complete Profile</h2>
          <p style={{ color: "#94A3B8", marginTop: "10px" }}>
            We need a few details to verify your account.
          </p>
        </div>
        
        <div className="input-group">
          <label style={{ fontSize: "0.9rem", color: "#fff", marginBottom: "8px", display: "block" }}>
            Home Address / Location
          </label>
          <select 
            value={address} 
            onChange={e => setAddress(e.target.value)}
            className="create-input" 
            style={{ width: '100%', padding: '12px', background: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '8px' }}
          >
            <option value="" disabled style={{ color: 'gray' }}>Select your location</option>
            {BACOLOD_LOCATIONS.map((loc) => (
              <option key={loc} value={loc} style={{ color: 'black' }}>
                {loc}
              </option>
            ))}
          </select>
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
            style={{ width: '100%', padding: '12px', background: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '8px', outline: 'none' }} 
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "30px" }}>
          <button 
            onClick={handleSaveProfile}
            style={{ width: '100%', padding: '12px', background: '#38BDF8', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Save & Continue
          </button>

          <button 
            onClick={handleSkip}
            style={{ width: '100%', padding: '12px', background: 'transparent', color: '#94A3B8', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer' }} 
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

        {message && <p style={{ marginTop: "15px", textAlign: "center", color: "#38BDF8" }}>{message}</p>}
      </div>
    </div>
  );
}