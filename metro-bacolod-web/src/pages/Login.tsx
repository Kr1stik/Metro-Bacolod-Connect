import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase-config";
import { FcGoogle } from "react-icons/fc"; 
import logo from "../assets/MBC Logo.png"; // Ensure this path matches your file structure
import "../App.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setMessage("Login successful!");
      // navigate("/dashboard"); 
    } catch (error: any) {
      setMessage("Google Login failed. " + error.message);
    }
  };

  const handleEmailLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMessage("Login successful!");
      // navigate("/dashboard");
    } catch (error: any) {
      setMessage("Invalid email or password.");
    }
  };

  return (
    <div className="hero-container">
      
      {/* LEFT SIDE: Logo, Title, Description */}
      <div className="hero-left">
        <div className="logo-section">
          <img src={logo} alt="Metro Bacolod Connect" className="hero-logo" />
        </div>
        
        <div className="text-content">
          <h1 className="hero-title">Metro Bacolod Connect</h1>
          <p className="hero-description">
            Metro Bacolod Connect is a SaaS-enabled Real Estate Marketplace designed specifically 
            for the Metro Negros region. It serves as a centralized, digital "safe zone" that 
            connects property seekers exclusively with PRC-Verified Licensed Professionals.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="hero-right">
        <div className="login-box">
          <h2>Welcome Back</h2>
          <p className="login-subtext">Please enter your details to sign in.</p>
          
          <div className="input-group">
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
          </div>
          
          <div className="input-group">
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

          {message && <p className="message-text">{message}</p>}

          <p className="register-link">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}