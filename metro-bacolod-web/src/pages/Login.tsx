import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase-config";
import { FcGoogle } from "react-icons/fc"; 
import logo from "../assets/MBC Logo.png"; 
import "../App.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // UPDATED: Send to Complete Profile first to ensure we get their details
      navigate("/complete-profile"); 
    } catch (error: any) {
      setMessage("Google Login failed. " + error.message);
    }
  };

  const handleEmailLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (error: any) {
      setMessage("Invalid email or password.");
    }
  };

  return (
    <div className="landing-container">
      {/* HEADER */}
      <header className="landing-header">
        <div className="brand">
          <img src={logo} alt="MBC Logo" className="brand-logo" />
          <span className="brand-name">Metro Bacolod Connect</span>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="landing-content">
        
        {/* LEFT SIDE */}
        <div className="description-section">
          <h1 className="main-heading">Secure Real Estate <br/> in Metro Bacolod</h1>
          <p className="sub-heading">
            Metro Bacolod Connect is a SaaS-enabled Real Estate Marketplace designed specifically 
            for the Metro Negros region. A centralized "safe zone" connecting you exclusively 
            with PRC-Verified Licensed Professionals.
          </p>
        </div>

        {/* RIGHT SIDE (Form) */}
        <div className="form-section">
          <div className="glass-login-card">
            <h2>Welcome Back</h2>
            <p className="form-subtitle">Please enter your details to sign in.</p>
            
            <div className="input-group">
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>
            
            <div className="input-group" style={{ marginTop: "10px" }}>
              <input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
            </div>

            <button className="primary-btn" onClick={handleEmailLogin}>
              Sign In
            </button>

            <div className="divider">
              <span>OR</span>
            </div>

            <button className="google-btn" onClick={handleGoogleLogin}>
              <FcGoogle size={22} />
              <span>Sign in with Google</span>
            </button>

            {message && <p className="message-text" style={{ marginTop: "10px", color: "#ef4444" }}>{message}</p>}

            <p className="register-link">
              Don't have an account? <Link to="/register">Create one</Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}