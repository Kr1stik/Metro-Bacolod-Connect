import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase-config";
import logo from "../assets/MBC Logo.png";
import api from "../services/api";
import "../App.css";

export default function Register() {
  // Form States
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  
  const navigate = useNavigate();

  const handleRegister = async () => {
    // 1. Validation checks
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    if (!firstName || !lastName || !address) {
      setMessage("Please fill in all details.");
      return;
    }

    try {
      // 2. Create Authentication (Email + Password) in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("Auth Created. UID:", user.uid);

      // 3. SEND DATA TO BACKEND (The missing link!)
      // We send the UID (from step 2) along with the form data
      await api.post('/users/create', {
        uid: user.uid,
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        address: address
      });

      setMessage("Registration successful!");
      navigate("/dashboard"); 

    } catch (error: any) {
      console.error("Error:", error);
      setMessage("Registration failed: " + error.message);
    }
  };

  return (
    <div className="hero-container">
      
      {/* LEFT SIDE (Same as Login) */}
      <div className="hero-left">
        <div className="logo-section">
          <img src={logo} alt="Metro Bacolod Connect" className="hero-logo" />
        </div>
        <div className="text-content">
          <h1 className="hero-title">Join the Network</h1>
          <p className="hero-description">
            Create your account today to access the safest Real Estate Marketplace in Metro Negros. 
            Connect with verified professionals and secure your future investment.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE (Registration Form) */}
      <div className="hero-right">
        <div className="login-box">
          <h2>Create Account</h2>
          <p className="login-subtext">Fill in your details to get started.</p>
          
          <div className="input-group">
            <input type="text" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>

          <div className="input-group">
            <input type="text" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>

          <div className="input-group">
            <input type="text" placeholder="Home Address" value={address} onChange={e => setAddress(e.target.value)} />
          </div>

          <div className="input-group">
            <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          
          <div className="input-group">
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <div className="input-group">
            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>

          <button className="primary-btn" onClick={handleRegister}>
            Register
          </button>

          <p className="register-link">
            Already have an account? <Link to="/">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}