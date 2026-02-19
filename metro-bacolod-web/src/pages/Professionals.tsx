import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase-config";
import { FcGoogle } from "react-icons/fc";
import { FaTimes } from "react-icons/fa";
import {
  FaHome, FaStar, FaStarHalfAlt, FaRegStar, FaPhoneAlt,
  FaEnvelope, FaCheckCircle, FaMapMarkerAlt,
  FaComments
} from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import "../App.css";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const RatingStars = ({ rating }: { rating: number }) => {
  const stars = [];
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.3;
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push(<FaStar key={i} />);
    else if (i === full && hasHalf) stars.push(<FaStarHalfAlt key={i} />);
    else stars.push(<FaRegStar key={i} />);
  }
  return <span className="rating-stars">{stars}</span>;
};

const AGENTS = [
  {
    name: "Maria Santos",
    agency: "Santos Realty Group",
    specialization: "Residential",
    experience: 8,
    phone: "+63 917 888 1234",
    email: "maria.santos@email.com",
    avatar: "https://ui-avatars.com/api/?name=Maria+Santos&background=10b981&color=fff&rounded=true&size=128",
    rating: 4.5,
    bio: "Specializing in residential properties across Bacolod's top subdivisions. Known for personalized service and deep local market knowledge.",
  },
  {
    name: "Carlos Reyes",
    agency: "Metro Land Advisors",
    specialization: "Land & Investment",
    experience: 12,
    phone: "+63 920 555 7890",
    email: "carlos.reyes@email.com",
    avatar: "https://ui-avatars.com/api/?name=Carlos+Reyes&background=f59e0b&color=fff&rounded=true&size=128",
    rating: 4.2,
    bio: "Expert in agricultural and investment land across Negros Occidental. Trusted by developers and individual investors alike.",
  },
  {
    name: "Patricia Lim",
    agency: "Prime Properties PH",
    specialization: "Condominiums",
    experience: 6,
    phone: "+63 933 222 4567",
    email: "patricia.lim@email.com",
    avatar: "https://ui-avatars.com/api/?name=Patricia+Lim&background=8b5cf6&color=fff&rounded=true&size=128",
    rating: 4.8,
    bio: "Condo and high-rise specialist with a strong network of developers. Helps clients find premium units at competitive prices.",
  },
  {
    name: "Roberto Cruz",
    agency: "Heritage Homes Realty",
    specialization: "Residential",
    experience: 15,
    phone: "+63 945 111 3333",
    email: "roberto.cruz@email.com",
    avatar: "https://ui-avatars.com/api/?name=Roberto+Cruz&background=ef4444&color=fff&rounded=true&size=128",
    rating: 4.1,
    bio: "Veteran real estate professional with 15 years of experience. Specializes in family homes and estate properties.",
  },
  {
    name: "Diana Bermudo",
    agency: "BCD Commercial Realty",
    specialization: "Commercial",
    experience: 10,
    phone: "+63 918 777 9999",
    email: "diana.bermudo@email.com",
    avatar: "https://ui-avatars.com/api/?name=Diana+Bermudo&background=06b6d4&color=fff&rounded=true&size=128",
    rating: 3.9,
    bio: "Commercial property specialist with expertise in retail spaces, offices, and warehouse leasing in Metro Bacolod.",
  },
  {
    name: "Wynands Burger",
    agency: "WB Realty Services",
    specialization: "Residential & Land",
    experience: 5,
    phone: "+63 912 345 6789",
    email: "wynands.burger@email.com",
    avatar: "https://ui-avatars.com/api/?name=Wynands+Burger&background=6366f1&color=fff&rounded=true&size=128",
    rating: 3.9,
    bio: "Focused on affordable housing and residential lots. Committed to helping first-time buyers find their perfect home.",
  },
];

const WHY_WORK = [
  {
    icon: <FaCheckCircle size={22} />,
    title: "Licensed and Verified",
    description: "All professionals on our platform are licensed by the PRC and verified through our internal screening process.",
  },
  {
    icon: <FaMapMarkerAlt size={22} />,
    title: "Local Market Expertise",
    description: "Our agents possess deep knowledge of Metro Bacolod's neighborhoods, pricing trends, and best opportunities.",
  },
  {
    icon: <FaComments size={22} />,
    title: "Transparent Communication",
    description: "Expect clear, honest, and timely communication at every stage of your property journey.",
  },
];

export default function Professionals() {
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
        toast.error("Email not verified. Please check your inbox.");
        return;
      }
      closeLogin();
      navigate("/dashboard", { state: { welcome: true } });
    } catch { toast.error("Login failed. Check your credentials."); }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      closeLogin();
      navigate("/dashboard", { state: { welcome: true } });
    } catch { toast.error("Google sign-in failed."); }
  };

  return (
    <div className="info-page">
      <ToastContainer position="top-left" autoClose={3000} theme="dark" />
      <div className="info-blob info-blob-1" />
      <div className="info-blob info-blob-2" />
      <div className="info-blob info-blob-3" />

      {/* Navbar (Landing Page Style) */}
      <nav className="landing-nav" style={{ position: 'fixed', top: 0, left: 0, width: '100%', padding: '20px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
          <img src={logo} alt="Logo" style={{ width: '50px', height: 'auto', cursor: 'pointer' }} onClick={() => navigate('/')} />
          <div className="nav-links" style={{ display: 'flex', gap: '30px' }}>
            {['Properties', 'Professionals', 'Services', 'Resources'].map((item) => (
              <a key={item} href={`/${item.toLowerCase()}`} className="nav-link-item" style={{ color: '#000', fontWeight: '600', fontSize: '0.9rem', opacity: 0.7, transition: '0.2s', textDecoration: 'none', position: 'relative' }}>{item}</a>
            ))}
          </div>
        </div>
        <div className="nav-buttons" style={{ display: 'flex', gap: '15px' }}>
          <button onClick={() => setShowLogin(true)} className="hero-btn hero-btn-outline" style={{ background: 'transparent', border: '1px solid black', color: 'black', padding: '12px 35px', fontSize: '0.9rem', fontWeight: '700', borderRadius: '50px', cursor: 'pointer', transition: 'all 0.3s ease' }}>LOGIN</button>
          <button onClick={() => navigate('/register')} className="hero-btn hero-btn-filled" style={{ background: 'black', color: 'white', padding: '12px 35px', fontSize: '0.9rem', fontWeight: '700', borderRadius: '50px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(0,0,0,0.39)', transition: 'all 0.3s ease' }}>CREATE ACCOUNT</button>
        </div>
      </nav>

      {/* Content */}
      <div className="info-content">
        {/* Hero */}
        <section className="info-hero">
          <h1 className="info-hero-title">Trusted Real Estate Professionals</h1>
          <p className="info-hero-subtitle">
            Our network of licensed real estate professionals is committed to guiding you through every step of your
            property journey. With local expertise and verified credentials, you can connect with agents you can trust.
          </p>
        </section>

        {/* Agent Cards Grid */}
        <section className="info-section">
          <h2 className="info-section-title">Meet Our Agents</h2>
          <div className="info-agents-grid">
            {AGENTS.map((agent, i) => (
              <div className="info-agent-card" key={i}>
                <img src={agent.avatar} alt={agent.name} className="info-agent-avatar" />
                <h3 className="info-agent-name">{agent.name}</h3>
                <span className="info-agent-agency">{agent.agency}</span>
                <div className="info-agent-rating">
                  <RatingStars rating={agent.rating} />
                  <span>{agent.rating}</span>
                </div>
                <div className="info-agent-details">
                  <span className="info-agent-tag">{agent.specialization}</span>
                  <span className="info-agent-tag">{agent.experience} yrs exp.</span>
                </div>
                <p className="info-agent-bio">{agent.bio}</p>
                <div className="info-agent-contact">
                  <a href={`tel:${agent.phone}`} className="info-agent-contact-btn">
                    <FaPhoneAlt size={12} /> {agent.phone}
                  </a>
                  <a href={`mailto:${agent.email}`} className="info-agent-contact-btn info-agent-email-btn">
                    <FaEnvelope size={12} /> Email
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why Work Section */}
        <section className="info-section">
          <h2 className="info-section-title">Why Work With Our Professionals</h2>
          <div className="info-trust-grid">
            {WHY_WORK.map((item, i) => (
              <div className="info-trust-card" key={i}>
                <div className="info-trust-icon">{item.icon}</div>
                <h4 className="info-trust-heading">{item.title}</h4>
                <p className="info-trust-text">{item.description}</p>
              </div>
            ))}
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
