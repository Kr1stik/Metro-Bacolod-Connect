import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase-config";
import { signOut } from "firebase/auth";
import logo from "../assets/MBC Logo.png"; // Optional: Add logo for branding
import "../App.css"; 

export default function Dashboard() {
  const [userName, setUserName] = useState("User");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/"); 
      } else {
        setUserName(user.displayName || user.email?.split('@')[0] || "User");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    // Reuse 'centered-page' to vertically & horizontally center everything
    <div className="centered-page">
      
      {/* Reuse 'centered-box' to get the white card look */}
      <div className="centered-box" style={{ textAlign: "center" }}>
        
        <img 
          src={logo} 
          alt="MBC Logo" 
          style={{ width: "80px", marginBottom: "20px" }} 
        />
        
        <h1 style={{ fontSize: "2rem", color: "#333" }}>Welcome to MBC</h1>
        <h2 style={{ fontSize: "1.2rem", fontWeight: "400", color: "#555", marginBottom: "30px" }}>
          Hello, <strong>{userName}</strong>!
        </h2>
        
        <p style={{ color: "#777", marginBottom: "40px", lineHeight: "1.6" }}>
          You have successfully logged in.<br/>
          This is your main dashboard.
        </p>

        <button 
          className="primary-btn" 
          onClick={handleLogout}
          style={{ maxWidth: "200px", margin: "0 auto" }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}