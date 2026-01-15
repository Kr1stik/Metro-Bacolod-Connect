import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase-config";
import { FcGoogle } from "react-icons/fc";
import logo from "../assets/MBC Logo.png";
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
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    if (!firstName || !lastName || !address) {
      setMessage("Please fill in all personal details.");
      return;
    }

    try {
      // 1. Create User in Firebase Auth (Handles Email/Pass validation)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log("User Created in Firebase:", user.uid);

      // 2. Prepare Data for your Backend
      // (This is where you will eventually send this data to NestJS to save in the DB)
      const userData = {
        uid: user.uid,
        email: user.email,
        firstName,
        lastName,
        address,
      };
      console.log("Ready to send to Backend:", userData);

      setMessage("Registration successful!");
      // navigate("/dashboard"); 

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setMessage("Email is already registered.");
      } else if (error.code === 'auth/weak-password') {
        setMessage("Password should be at least 6 characters.");
      } else {
        setMessage("Registration failed. " + error.message);
      }
    }
  };

  const handleGoogleRegister = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setMessage("Registered with Google successfully!");
      // navigate("/dashboard");
    } catch (error: any) {
      setMessage("Google registration failed.");
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
        <div className="login-box"> {/* Reusing login-box class for consistent style */}
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

          <div className="divider">
            <span>OR</span>
          </div>

          <button className="google-btn" onClick={handleGoogleRegister}>
            <FcGoogle size={22} />
            <span>Sign up with Google</span>
          </button>

          {message && <p className="message-text">{message}</p>}

          <p className="register-link">
            Already have an account? <Link to="/">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}