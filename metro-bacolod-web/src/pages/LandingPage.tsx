import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase-config";
import { FcGoogle } from "react-icons/fc";
import { FaTimes } from "react-icons/fa";
import logo from "../assets/MBC Logo.png"; 
import Antigravity from "../components/Antigravity"; 
import TextType from "../components/TextType"; 
import ScrollFloat from "../components/ScrollFloat";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const closeLogin = () => {
    setShowLogin(false);
    setEmail("");
    setPassword("");
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); 

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        await signOut(auth); 
        toast.error("Login failed: Email not verified. Please check your inbox.");
        return; 
      }

      navigate("/dashboard", { state: { welcome: true } });
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        toast.error("Incorrect email or password.");
      } else {
        toast.error("Login failed. Please try again.");
      }
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

  return (
    <div style={{ position: 'relative', width: '100vw', minHeight: '100vh', overflowX: 'hidden', fontFamily: "'Inter', sans-serif", background: '#ffffff' }}>
      
      {/* NAVBAR */}
      <nav className="landing-nav" style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '35px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
            <img src={logo} alt="Logo" style={{ width: '60px', height: 'auto' }} />
            <div className="nav-links" style={{ display: 'flex', gap: '30px' }}>
                {['Properties', 'Professionals', 'Services', 'Resources'].map((item) => (
                    <a key={item} href="#" style={{ color: '#000', fontWeight: '600', fontSize: '0.9rem', opacity: 0.7, transition: '0.2s', textDecoration: 'none' }}>{item}</a>
                ))}
            </div>
        </div>
        <div className="nav-buttons" style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => setShowLogin(true)} style={{ background: 'transparent', border: '1px solid black', color: 'black', padding: '12px 35px', fontSize: '0.9rem', fontWeight: '700', borderRadius: '50px', cursor: 'pointer' }}>LOGIN</button>
            <button onClick={() => navigate('/register')} style={{ background: 'black', color: 'white', padding: '12px 35px', fontSize: '0.9rem', fontWeight: '700', borderRadius: '50px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(0,0,0,0.39)' }}>CREATE ACCOUNT</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero" style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 20px', position: 'relative' }}>
        <Antigravity count={300} color="#000000" particleSize={0.6} />
        {/* Adjusted clamp() lower bound to 2.5rem for mobile safety */}
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 6rem)', fontWeight: '700', color: '#000', lineHeight: '1.1', marginBottom: '30px', letterSpacing: '-2px', zIndex: 2 }}>
           <TextType text={["Metro Bacolod \n Connect."]} typingSpeed={100} deletingSpeed={50} loop={false} showCursor={true} cursorCharacter="|" />
        </h1>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center', zIndex: 2 }}>
          {['Connect', 'Verify', 'Close'].map(tag => (
            <span key={tag} style={{ background: '#e5e7eb', color: '#374151', padding: '8px 24px', borderRadius: '25px', fontSize: '0.85rem', fontWeight: '600' }}>{tag}</span>
          ))}
        </div>
      </section>

      {/* EXPLORE SECTION */}
      <section className="landing-explore" style={{ padding: '100px 8%', background: 'white', textAlign: 'center' }}>
        <ScrollFloat
          animationDuration={1}
          ease='back.inOut(2)'
          scrollStart='center bottom+=50%'
          scrollEnd='bottom bottom-=40%'
          stagger={0.03}
          containerClassName='landing-explore-title'
        >
          EXPLORE
        </ScrollFloat>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', maxWidth: '1200px', margin: '0 auto', marginTop: '60px' }}>
          {[
            { title: 'View Lands', description: 'Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer t' },
            { title: 'See Homes', description: 'Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer t' },
            { title: 'Contact Agents', description: 'Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer t' }
          ].map((item, index) => (
            <div key={index} style={{ textAlign: 'center' }}>
              <div style={{ width: '100%', height: '200px', background: '#8B7B78', borderRadius: '20px', marginBottom: '20px' }}></div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#000', marginBottom: '10px' }}>{item.title}</h3>
              <p style={{ fontSize: '0.95rem', color: '#666', lineHeight: '1.6' }}>{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="landing-about" style={{ padding: '100px 8%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '60px', flexWrap: 'wrap', background: 'white' }}>
          <div className="about-text" style={{ flex: 1, minWidth: '300px' }}>
             <ScrollFloat
               animationDuration={1}
               ease='back.inOut(2)'
               scrollStart='center bottom+=50%'
               scrollEnd='bottom bottom-=40%'
               stagger={0.03}
               containerClassName='landing-about-title'
             >
               Here at MBC we...
             </ScrollFloat>
             <p style={{ fontSize: '1rem', color: '#4b5563', lineHeight: '1.8', maxWidth: '550px', marginTop: '25px' }}>
               Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem ipsum.
             </p>
          </div>
          <div className="about-image" style={{ flex: 1, minWidth: '300px', display: 'flex', justifyContent: 'center' }}>
             <div style={{ width: '100%', maxWidth: '500px', height: '400px', background: '#D3D3D3', borderRadius: '20px' }}></div>
          </div>
      </section>

      {/* LOGIN MODAL */}
      {showLogin && (
        <div className="modal-overlay">
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Welcome Back</h2>
              <FaTimes style={{ cursor: 'pointer' }} onClick={closeLogin} />
            </div>
            
            <form onSubmit={handleLogin}>
                <input required type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                <input required type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ddd' }} />
                
                <button type="submit" className="primary-btn" style={{ width: '100%', marginBottom: '15px', background: 'black', color: 'white' }}>
                    Sign In
                </button>
            </form>

            <button type="button" className="primary-btn" style={{ width: '100%', background: 'white', color: 'black', border: '1px solid #ddd', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }} onClick={handleGoogleLogin}>
                <FcGoogle size={20} /> Sign in with Google
            </button>
            
            <p style={{ marginTop: '20px', fontSize: '0.9rem' }}>
                No account? 
                <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '600' }} onClick={() => { setShowLogin(false); navigate('/register'); }}>
                  Create Account
                </span>
            </p>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="landing-footer" style={{ background: '#000', color: '#fff', padding: '60px 8%', borderTop: '1px solid #333' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px', maxWidth: '1200px', margin: '0 auto', marginBottom: '40px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>About</h3>
            <p style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: '1.6' }}>
              Metro Bacolod Connect is a SaaS-enabled Real Estate Marketplace connecting you with PRC-Verified Licensed Professionals.
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>Quick Links</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '10px' }}><a href="#" style={{ color: '#ccc', textDecoration: 'none', transition: '0.2s' }}>Properties</a></li>
              <li style={{ marginBottom: '10px' }}><a href="#" style={{ color: '#ccc', textDecoration: 'none', transition: '0.2s' }}>Professionals</a></li>
              <li style={{ marginBottom: '10px' }}><a href="#" style={{ color: '#ccc', textDecoration: 'none', transition: '0.2s' }}>Resources</a></li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>Contact</h3>
            <p style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '10px' }}>Email: info@metrobacolodconnect.com</p>
            <p style={{ fontSize: '0.9rem', color: '#ccc' }}>Phone: +63 (0)XX-XXX-XXXX</p>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #333', paddingTop: '30px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', color: '#999', margin: 0 }}>
            &copy; 2026 Cosdevs. All rights reserved.
          </p>
        </div>
      </footer>

      {/* --- MOBILE RESPONSIVE CSS INJECTION --- */}
      <style>{`
        @media (max-width: 768px) {
            /* 1. Navbar Adjustments */
            .landing-nav {
                padding: 20px !important;
            }
            .nav-links {
                display: none !important; /* Hide text links on mobile */
            }
            .nav-buttons button {
                padding: 10px 20px !important;
                font-size: 0.8rem !important;
            }
            
            /* 2. Hero Section Adjustments */
            .landing-hero {
                padding-top: 80px !important; /* Prevent overlap with fixed nav */
            }

            /* 3. About Section Stacking */
            .landing-about {
                flex-direction: column-reverse !important; /* Image top, text bottom */
                padding: 60px 20px !important;
                gap: 40px !important;
            }
            .about-text, .about-image {
                width: 100% !important;
                min-width: 0 !important;
                text-align: center;
                justify-content: center !important;
            }
            .about-text p {
                margin: 0 auto; /* Center paragraph */
            }

            /* 4. Modal Adjustments */
            .modal-card {
                width: 90% !important;
                padding: 25px !important;
            }

            /* 5. Footer Adjustments */
            .landing-footer {
                padding: 40px 20px !important;
            }
            .landing-footer h3 {
                font-size: 1rem !important;
            }
        }
      `}</style>

      <ToastContainer position="top-center" theme="light" />
    </div>
  );
}