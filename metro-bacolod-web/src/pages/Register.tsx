import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase-config";
import api from "../services/api";
import { FcGoogle } from "react-icons/fc";
import logo from "../assets/MBC Logo.png";
import "../App.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    if (!firstName || !lastName || !address) {
      setMessage("Please fill in all details.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await api.post('/users/create', {
        uid: user.uid,
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        address: address,
        role: 'user'
      });

      setMessage("Registration successful!");
      navigate("/dashboard");

    } catch (error: any) {
      console.error("Error:", error);
      setMessage("Registration failed: " + error.message);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/complete-profile");
    } catch (error: any) {
      setMessage("Google Registration failed.");
    }
  };

  return (
    <div className="landing-container">
      
      {/* 1. HEADER (Matches Login Page) */}
      <header className="landing-header">
        <div className="brand">
          <img src={logo} alt="MBC Logo" className="brand-logo" />
          <span className="brand-name">Metro Bacolod Connect</span>
        </div>
      </header>

      {/* 2. MAIN CONTENT */}
      <div className="landing-content">
        
        {/* LEFT SIDE: Text */}
        <div className="description-section">
          <h1 className="main-heading">Join the Network</h1>
          <p className="sub-heading">
            Create your account today to access the safest Real Estate Marketplace in Metro Negros. 
            Connect with verified professionals and secure your future investment.
          </p>
        </div>

        {/* RIGHT SIDE: Register Form */}
        <div className="form-section">
          <div className="glass-login-card">
            <h2>Create Account</h2>
            <p className="form-subtitle">Fill in your details to get started.</p>
            
            <div style={{ display: "flex", gap: "10px" }}>
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="First Name" 
                  value={firstName} 
                  onChange={e => setFirstName(e.target.value)} 
                />
              </div>
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="Last Name" 
                  value={lastName} 
                  onChange={e => setLastName(e.target.value)} 
                />
              </div>
            </div>

            <div className="input-group" style={{ marginTop: "10px" }}>
              <input 
                type="text" 
                placeholder="Home Address" 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
              />
            </div>

            <div className="input-group" style={{ marginTop: "10px" }}>
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

            <div className="input-group" style={{ marginTop: "10px" }}>
              <input 
                type="password" 
                placeholder="Confirm Password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
              />
            </div>

            <button className="primary-btn" onClick={handleRegister}>
              Sign Up
            </button>

            <div className="divider">
              <span>OR</span>
            </div>

            <button className="google-btn" onClick={handleGoogleRegister}>
              <FcGoogle size={22} />
              <span>Sign up with Google</span>
            </button>

            {message && <p className="message-text" style={{ marginTop: "10px", color: "#ef4444" }}>{message}</p>}

            <p className="register-link">
              Already have an account? <Link to="/">Sign in</Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}