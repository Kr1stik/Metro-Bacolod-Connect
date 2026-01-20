import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"; // 1. Import updateProfile
import { auth } from "../firebase-config";
import api from "../services/api";
import logo from "../assets/MBC Logo.png";
import "../App.css";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      toast.error("⚠️ Passwords do not match.", { position: "top-left" });
      return;
    }
    if (!firstName || !lastName || !address) {
      toast.error("⚠️ Please fill in all details.", { position: "top-left" });
      return;
    }

    try {
      // 1. Create the Account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. FORCE UPDATE FIREBASE PROFILE (The Fix)
      // This ensures 'auth.currentUser.displayName' is not null in the Dashboard
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`,
        // Generate a random background color avatar with their initials
        photoURL: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random&color=fff`
      });

      // 3. Save to Backend
      await api.post('/users/create', {
        uid: user.uid,
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        address: address,
        role: 'user'
      });

      toast.success("🎉 Registration Successful! Redirecting...", {
        position: "top-left",
        autoClose: 2000,
        theme: "dark",
      });

      setTimeout(() => {
        navigate("/"); 
      }, 2000);

    } catch (error: any) {
      console.error("Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error("❌ Email is already registered. Please log in.", { position: "top-left" });
      } else {
        toast.error("❌ Registration failed: " + error.message, { position: "top-left" });
      }
    }
  };

  return (
    <div className="landing-container">
      <header className="landing-header">
        <div className="brand">
          <img src={logo} alt="MBC Logo" className="brand-logo" />
          <span className="brand-name">Metro Bacolod Connect</span>
        </div>
      </header>

      <div className="landing-content">
        <div className="description-section">
          <h1 className="main-heading">Join the Network</h1>
          <p className="sub-heading">
            Create your account today to access the safest Real Estate Marketplace in Metro Negros. 
            Connect with verified professionals and secure your future investment.
          </p>
        </div>

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

            <p className="register-link">
              Already have an account? <Link to="/">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
      <ToastContainer position="top-left" theme="dark" />
    </div>
  );
}