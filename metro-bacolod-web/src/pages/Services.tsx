import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase-config";
import { FcGoogle } from "react-icons/fc";
import { FaTimes } from "react-icons/fa";
import {
  FaSearchPlus, FaUserTie,
  FaClipboardCheck, FaChartLine, FaHeadset,
  FaArrowRight
} from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import "../App.css";
import { glassToast } from '../components/GlassToast';

const SERVICES = [
  {
    icon: <FaSearchPlus size={28} />,
    title: "Property Search Assistance",
    description: "Let us help you find the right property. Filter by location, budget, type, and features to narrow down listings that match your needs.",
  },
  {
    icon: <FaUserTie size={28} />,
    title: "Agent Matching",
    description: "We connect you with the most suitable licensed agent based on your property preferences, budget, and location requirements.",
  },
  {
    icon: <FaClipboardCheck size={28} />,
    title: "Property Verification",
    description: "Our team verifies listing details including ownership, pricing accuracy, and property condition to protect your interests.",
  },
  {
    icon: <FaChartLine size={28} />,
    title: "Investment Guidance",
    description: "Get basic insights and information about property investment opportunities in Metro Bacolod to make smarter financial decisions.",
  },
  {
    icon: <FaHeadset size={28} />,
    title: "Buyer and Seller Support",
    description: "Whether you're buying or selling, our platform provides tools and support to streamline the entire transaction process.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Search Properties",
    description: "Browse our verified listings using filters for location, price range, property type, and status. Find options that perfectly match your criteria.",
  },
  {
    number: "02",
    title: "Compare Options",
    description: "Review detailed property information, photos, amenities, and pricing. Save your favorites and compare side by side to find the best fit.",
  },
  {
    number: "03",
    title: "Connect with Professionals",
    description: "Reach out directly to licensed agents through our platform. Schedule viewings, ask questions, and start your property journey with confidence.",
  },
];

export default function Services() {
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
      navigate("/dashboard");
    } catch { glassToast.error("Login failed. Check your credentials."); }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      closeLogin();
      navigate("/dashboard");
    } catch { glassToast.error("Google sign-in failed."); }
  };

  return (
    <div className="info-page">
      <div className="info-blob info-blob-1" />
      <div className="info-blob info-blob-2" />
      <div className="info-blob info-blob-3" />

      {/* Navbar (Landing Page Style) */}
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

      {/* Content */}
      <div className="info-content">
        {/* Hero */}
        <section className="info-hero">
          <h1 className="info-hero-title">Our Services</h1>
          <p className="info-hero-subtitle">
            MetroBacolodConnect provides tools and support to make property searching easier. From verified listings to
            direct connections with trusted agents, our services are designed to simplify your real estate experience.
          </p>
        </section>

        {/* Services Grid */}
        <section className="info-section">
          <h2 className="info-section-title" style={{ textAlign: 'center' }}>What We Offer</h2>
          <div className="info-services-grid">
            {SERVICES.map((service, i) => (
              <div className="info-service-card" key={i}>
                <div className="info-service-icon">{service.icon}</div>
                <h3 className="info-service-heading">{service.title}</h3>
                <p className="info-service-text">{service.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="info-section">
          <h2 className="info-section-title">How It Works</h2>
          <div className="info-steps-grid">
            {STEPS.map((step, i) => (
              <div className="info-step-card" key={i}>
                <span className="info-step-number">{step.number}</span>
                <h3 className="info-step-heading">{step.title}</h3>
                <p className="info-step-text">{step.description}</p>
                {i < STEPS.length - 1 && <FaArrowRight className="info-step-arrow" />}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="info-cta-section">
          <div className="info-cta-card">
            <h2 className="info-cta-title">Get Started Today</h2>
            <p className="info-cta-text">
              Experience a smarter way to find your next property. Browse listings, connect with agents, and make
              confident real estate decisions — all in one place.
            </p>
            <div className="info-cta-buttons">
              <button className="info-cta-btn info-cta-primary" onClick={() => navigate("/dashboard")}>
                Explore Listings
              </button>
              <button className="info-cta-btn info-cta-outline" onClick={() => navigate("/professionals")}>
                Find an Agent
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
