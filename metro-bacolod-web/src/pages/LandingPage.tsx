import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, googleProvider } from "../firebase-config";
import api from "../services/api";
import { FcGoogle } from "react-icons/fc";
import { FaTimes } from "react-icons/fa";
import logo from "../assets/MBC Logo.png"; 
import Antigravity from "../components/Antigravity"; 
import TextType from "../components/TextType"; 
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  
  // Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Register State
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const navigate = useNavigate();

  // --- NEW: CLOSE & RESET FUNCTIONS ---
  const closeLogin = () => {
    setShowLogin(false);
    setEmail("");
    setPassword("");
  };

  const closeRegister = () => {
    setShowRegister(false);
    setRegFirstName("");
    setRegLastName("");
    setRegAddress("");
    setRegEmail("");
    setRegPassword("");
  };

  const switchToRegister = () => {
    closeLogin(); // Clear login data
    setShowRegister(true);
  };

  const switchToLogin = () => {
    closeRegister(); // Clear register data
    setShowLogin(true);
  };

  // --- HANDLERS ---
  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard", { state: { welcome: true } });
    } catch (error: any) {
      toast.error("Invalid credentials");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/dashboard", { state: { welcome: true } });
    } catch (error: any) {
      toast.error("Google login failed");
    }
  };

  const handleRegister = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      const user = userCredential.user;
      await updateProfile(user, {
        displayName: `${regFirstName} ${regLastName}`,
        photoURL: `https://ui-avatars.com/api/?name=${regFirstName}+${regLastName}&background=random`
      });
      // Save to backend
       await api.post('/users/create', { uid: user.uid, email: user.email, firstName: regFirstName, lastName: regLastName, address: regAddress });
      
      toast.success("Account created!");
      closeRegister();
      setShowLogin(true);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div style={{ 
      position: 'relative', 
      width: '100vw', 
      minHeight: '100vh', 
      overflowX: 'hidden', 
      fontFamily: "'Inter', sans-serif", 
      background: '#ffffff',
      margin: 0,
      padding: 0
    }}>
      
      {/* NAVBAR */}
      <nav style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        padding: '35px 5%', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        zIndex: 50,
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
            <img src={logo} alt="Logo" style={{ width: '60px', height: 'auto' }} />
            
            <div style={{ display: 'flex', gap: '30px' }}>
                {['Properties', 'Professionals', 'Services', 'Resources'].map((item) => (
                    <a key={item} href="#" style={{ color: '#000', fontWeight: '600', fontSize: '0.9rem', opacity: 0.7, transition: '0.2s' }}>
                        {item}
                    </a>
                ))}
            </div>
        </div>
        
        <button 
          onClick={() => setShowLogin(true)}
          style={{ 
            background: 'black', 
            color: 'white', 
            padding: '12px 35px', 
            fontSize: '0.9rem', 
            fontWeight: '700', 
            borderRadius: '50px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px 0 rgba(0,0,0,0.39)' 
          }}
        >
          LOGIN
        </button>
      </nav>

      {/* 3. HERO SECTION */}
      <section style={{ 
        minHeight: '100vh', 
        width: '100%',
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center',
        textAlign: 'center',
        padding: '0 20px',
        boxSizing: 'border-box',
        position: 'relative' 
      }}>
        
        <Antigravity 
          count={300}          
          color="#000000"      
          particleSize={0.6}   
        />

        <h1 style={{ 
          fontSize: 'clamp(3.5rem, 6vw, 6rem)', 
          fontWeight: '700', 
          color: '#000',
          lineHeight: '1.1', 
          marginBottom: '30px',
          letterSpacing: '-2px',
          zIndex: 2
        }}>
           <TextType
             text={["Metro Bacolod \n Connect."]}
             typingSpeed={100}
             deletingSpeed={50}
             loop={false} 
             showCursor={true}
             cursorCharacter="|"
           />
        </h1>
        
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center', zIndex: 2 }}>
          {['Connect', 'Verify', 'Close'].map(tag => (
            <span key={tag} style={{ 
              background: '#e5e7eb', 
              color: '#374151', 
              padding: '8px 24px', 
              borderRadius: '25px', 
              fontSize: '0.85rem', 
              fontWeight: '600' 
            }}>
              {tag}
            </span>
          ))}
        </div>
      </section>

      {/* 4. CONTENT SECTION */}
      <section style={{ 
        background: '#f9fafb', 
        padding: '100px 5%', 
        display: 'flex',
        justifyContent: 'center',
        position: 'relative', 
        zIndex: 5
      }}>
        <div style={{ 
          maxWidth: '1400px', 
          width: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: '80px',
          flexWrap: 'wrap' 
        }}>
          
          <div style={{ flex: '1 1 500px' }}> 
            <h2 style={{ 
              fontSize: '3rem', 
              fontWeight: '800', 
              marginBottom: '25px', 
              lineHeight: '1.2',
              color: '#111',
              letterSpacing: '-1px'
            }}>
              Secure Real Estate <br /> in Metro Bacolod
            </h2>
            <p style={{ 
              fontSize: '1.15rem', 
              color: '#4b5563', 
              lineHeight: '1.6', 
              maxWidth: '500px',
              fontWeight: '500'
            }}>
              Metro Bacolod Connect is a SaaS-enabled Real Estate Marketplace designed specifically for the Metro Negros region. 
              A centralized "safe zone" connecting you exclusively with PRC-Verified Licensed Professionals.
            </p>
          </div>

          <div style={{ flex: '1 1 500px', display: 'flex', justifyContent: 'flex-end' }}>
            <img 
              src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1000" 
              alt="Metro Bacolod" 
              style={{ 
                width: '100%', 
                height: 'auto', 
                maxHeight: '500px',
                objectFit: 'cover', 
                borderRadius: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }} 
            />
          </div>

        </div>
      </section>

      {/* --- MODAL: LOGIN (Fixed: No Click Outside Close) --- */}
      {showLogin && (
        // REMOVED onClick from overlay so it ignores background clicks
        <div className="modal-overlay">
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Welcome Back</h2>
              {/* Uses new closeLogin function to clear data */}
              <FaTimes style={{ cursor: 'pointer' }} onClick={closeLogin} />
            </div>
            
            <input 
              type="email" placeholder="Email" 
              value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
            <input 
              type="password" placeholder="Password" 
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
            
            <button className="primary-btn" style={{ width: '100%', marginBottom: '15px', background: 'black', color: 'white' }} onClick={handleLogin}>Sign In</button>
            <button className="primary-btn" style={{ width: '100%', background: 'white', color: 'black', border: '1px solid #ddd', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }} onClick={handleGoogleLogin}>
              <FcGoogle size={20} /> Sign in with Google
            </button>

            <p style={{ marginTop: '20px', fontSize: '0.9rem' }}>
              No account? <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '600' }} onClick={switchToRegister}>Register</span>
            </p>
          </div>
        </div>
      )}

      {/* --- MODAL: REGISTER (Fixed: No Click Outside Close) --- */}
      {showRegister && (
        <div className="modal-overlay">
          <div className="modal-card" onClick={e => e.stopPropagation()}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Create Account</h2>
              {/* Uses new closeRegister function to clear data */}
              <FaTimes style={{ cursor: 'pointer' }} onClick={closeRegister} />
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="First Name" value={regFirstName} onChange={e => setRegFirstName(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
              <input type="text" placeholder="Last Name" value={regLastName} onChange={e => setRegLastName(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            </div>
            <input type="text" placeholder="Address" value={regAddress} onChange={e => setRegAddress(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <input type="email" placeholder="Email" value={regEmail} onChange={e => setRegEmail(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <input type="password" placeholder="Password" value={regPassword} onChange={e => setRegPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ddd' }} />

            <button className="primary-btn" style={{ width: '100%', background: 'black', color: 'white' }} onClick={handleRegister}>Sign Up</button>
            
            <p style={{ marginTop: '20px', fontSize: '0.9rem' }}>
              Have an account? <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '600' }} onClick={switchToLogin}>Login</span>
            </p>
          </div>
        </div>
      )}

      <ToastContainer position="top-center" theme="light" />
    </div>
  );
}