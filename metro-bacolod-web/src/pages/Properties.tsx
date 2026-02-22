import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase-config";
import { FcGoogle } from "react-icons/fc";
import { FaTimes } from "react-icons/fa";
import {
  FaHome, FaBuilding, FaTree, FaCity, FaWarehouse,
  FaCheckCircle, FaSyncAlt, FaMapMarkerAlt, FaPhoneAlt,
  FaShieldAlt
} from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import "../App.css";
import { glassToast } from '../components/GlassToast';

const PROPERTY_CATEGORIES = [
  {
    icon: <FaHome size={28} />,
    title: "Residential Lots",
    description: "Prime residential lots in well-planned subdivisions across Metro Bacolod. Ideal for building your dream home with secure land titles and complete development permits.",
    image: "https://images.pexels.com/photos/440731/pexels-photo-440731.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    icon: <FaBuilding size={28} />,
    title: "House and Lot",
    description: "Move-in ready homes and pre-selling house and lot packages. Choose from modern single-detached, duplex, and townhouse designs in top communities.",
    image: "https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    icon: <FaCity size={28} />,
    title: "Condominiums",
    description: "Premium condo units in the heart of Bacolod City. Enjoy resort-style amenities, security, and a convenient urban lifestyle close to everything you need.",
    image: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    icon: <FaWarehouse size={28} />,
    title: "Commercial Properties",
    description: "Strategically located commercial spaces for retail, office, and food establishments. High-traffic areas with excellent visibility and foot traffic.",
    image: "https://images.pexels.com/photos/443383/pexels-photo-443383.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    icon: <FaTree size={28} />,
    title: "Agricultural Land",
    description: "Fertile agricultural land suitable for farming, agri-business, or long-term investment. Available in various sizes across Negros Occidental.",
    image: "https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
];

const TRUST_POINTS = [
  {
    icon: <FaCheckCircle size={22} />,
    title: "Verified Information",
    description: "Every listing goes through a verification process to ensure accurate details and legitimate ownership.",
  },
  {
    icon: <FaSyncAlt size={22} />,
    title: "Updated Prices",
    description: "Our listings reflect current market prices so you can make informed decisions without guesswork.",
  },
  {
    icon: <FaMapMarkerAlt size={22} />,
    title: "Clear Location Details",
    description: "Precise location information with barangay-level accuracy helps you find properties in your preferred area.",
  },
  {
    icon: <FaPhoneAlt size={22} />,
    title: "Direct Contact with Agents",
    description: "Connect directly with licensed real estate agents — no middlemen, no unnecessary delays.",
  },
];

export default function Properties() {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const closeLogin = () => { setShowLogin(false); setEmail(""); setPassword(""); };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        await signOut(auth);
        glassToast.error("Email not verified. Please check your inbox.");
        return;
      }
      closeLogin();
      navigate("/dashboard", { state: { welcome: true } });
    } catch { glassToast.error("Login failed. Check your credentials."); }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      closeLogin();
      navigate("/dashboard", { state: { welcome: true } });
    } catch { glassToast.error("Google sign-in failed."); }
  };

  return (
    <div className="info-page">
      {/* Ambient blobs */}
      <div className="info-blob info-blob-1" />
      <div className="info-blob info-blob-2" />
      <div className="info-blob info-blob-3" />

      {/* ========== NAVBAR (Landing Page Style) ========== */}
      <nav className="landing-nav" style={{ position: 'fixed', top: 0, left: 0, width: '100%', padding: '20px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50, background: 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
          <img src={logo} alt="Logo" style={{ width: '50px', height: 'auto', cursor: 'pointer' }} onClick={() => navigate('/')} />
          <div className="nav-links" style={{ display: 'flex', gap: '30px' }}>
            {['Properties', 'Professionals', 'Services', 'Resources'].map((item) => (
              <a key={item} href={`/${item.toLowerCase()}`} className="nav-link-item" style={{ color: '#1d1d1f', fontWeight: '600', fontSize: '0.9rem', opacity: 0.7, transition: '0.2s', textDecoration: 'none', position: 'relative' }}>{item}</a>
            ))}
          </div>
        </div>
        <div className="nav-buttons" style={{ display: 'flex', gap: '15px' }}>
          <button onClick={() => setShowLogin(true)} className="hero-btn hero-btn-outline" style={{ background: 'transparent', border: '1px solid #1d1d1f', color: '#1d1d1f', padding: '12px 35px', fontSize: '0.9rem', fontWeight: '700', borderRadius: '50px', cursor: 'pointer', transition: 'all 0.3s ease' }}>LOGIN</button>
          <button onClick={() => navigate('/register')} className="hero-btn hero-btn-filled" style={{ background: '#1d1d1f', color: 'white', padding: '12px 35px', fontSize: '0.9rem', fontWeight: '700', borderRadius: '50px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(0,0,0,0.25)', transition: 'all 0.3s ease' }}>CREATE ACCOUNT</button>
        </div>
      </nav>

      {/* ========== CONTENT ========== */}
      <div className="info-content">
        {/* Hero */}
        <section className="info-hero">
          <h1 className="info-hero-title">Find Your Ideal Property in Metro Bacolod</h1>
          <p className="info-hero-subtitle">
            Explore a wide selection of verified properties across Metro Bacolod. Whether you're looking for a family home,
            investment land, or commercial space, our listings provide clear details to help you decide with confidence.
          </p>
        </section>

        {/* Property Categories */}
        <section className="info-section">
          <h2 className="info-section-title" style={{ textAlign: 'center' }}>Property Categories</h2>
          <div className="info-cards-grid">
            {PROPERTY_CATEGORIES.map((cat, i) => (
              <div className="info-card info-card-with-image" key={i}>
                <div className="info-card-image">
                  <img src={cat.image} alt={cat.title} />
                </div>
                <div className="info-card-body">
                  <div className="info-card-icon">{cat.icon}</div>
                  <h3 className="info-card-heading">{cat.title}</h3>
                  <p className="info-card-text">{cat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trust Points */}
        <section className="info-section">
          <h2 className="info-section-title" style={{ textAlign: 'center' }}>What Makes Our Listings Trusted</h2>
          <div className="info-trust-grid">
            {TRUST_POINTS.map((point, i) => (
              <div className="info-trust-card" key={i}>
                <div className="info-trust-icon">{point.icon}</div>
                <h4 className="info-trust-heading">{point.title}</h4>
                <p className="info-trust-text">{point.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="info-cta-section">
          <div className="info-cta-card">
            <h2 className="info-cta-title">Ready to Find Your Next Property?</h2>
            <p className="info-cta-text">
              Browse our verified listings or connect directly with a licensed real estate agent today.
            </p>
            <div className="info-cta-buttons">
              <button className="info-cta-btn info-cta-primary" onClick={() => navigate("/dashboard")}>
                Browse Available Listings
              </button>
              <button className="info-cta-btn info-cta-outline" onClick={() => navigate("/professionals")}>
                <FaPhoneAlt size={12} /> Contact an Agent
              </button>
            </div>
          </div>
        </section>
      </div>

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
              <button type="submit" className="primary-btn" style={{ width: '100%', marginBottom: '15px', background: 'black', color: 'white' }}>Sign In</button>
            </form>
            <button type="button" className="primary-btn" style={{ width: '100%', background: 'white', color: 'black', border: '1px solid #ddd', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }} onClick={handleGoogleLogin}>
              <FcGoogle size={20} /> Sign in with Google
            </button>
            <p style={{ marginTop: '20px', fontSize: '0.9rem' }}>
              No account?{' '}
              <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '600' }} onClick={() => { setShowLogin(false); navigate('/register'); }}>Create Account</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
