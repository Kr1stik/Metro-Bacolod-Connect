import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, db } from "../firebase-config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { FcGoogle } from "react-icons/fc";
import { FaTimes } from "react-icons/fa";
import {
  FaHome, FaStar, FaStarHalfAlt, FaRegStar, FaPhoneAlt,
  FaEnvelope, FaCheckCircle, FaMapMarkerAlt,
  FaComments, FaChevronLeft, FaChevronRight, FaSpinner
} from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import "../App.css";
import { glassToast } from '../components/GlassToast';

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

const WHY_WORK = [
  {
    icon: <FaCheckCircle size={22} />,
    title: "Licensed and Verified",
    description: "All professionals on our platform are vetted through our internal screening process.",
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
  
  // --- NEW: Dynamic Agents State ---
  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  const navigate = useNavigate();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // --- NEW: Fetch Real Sellers from Firestore ---
  useEffect(() => {
    const fetchRealAgents = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "Seller"));
        const snap = await getDocs(q);
        
        const fetchedAgents = snap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.firstName ? `${data.firstName} ${data.lastName}` : (data.displayName || "Verified Agent"),
            agency: data.address || "Independent Agent",
            specialization: "Real Estate",
            experience: Math.floor(Math.random() * 5) + 2, // Mocking years of experience for UI
            phone: data.mobile || data.phone || "N/A",
            email: data.email || "",
            avatar: data.photoURL || `https://ui-avatars.com/api/?name=${data.firstName}+${data.lastName}&background=10b981&color=fff`,
            rating: 5.0, // Future: fetch from reviews subcollection
            bio: data.description || "A verified real estate professional on Metro Bacolod Connect.",
          };
        });
        
        setAgents(fetchedAgents);
      } catch (error) {
        console.error("Failed to fetch agents", error);
      } finally {
        setLoadingAgents(false);
      }
    };
    
    fetchRealAgents();
  }, []);

  const checkScrollButtons = () => {
    const el = carouselRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    checkScrollButtons();
    el.addEventListener('scroll', checkScrollButtons);
    window.addEventListener('resize', checkScrollButtons);
    return () => {
      el.removeEventListener('scroll', checkScrollButtons);
      window.removeEventListener('resize', checkScrollButtons);
    };
  }, [agents]); // Re-run when agents array changes

  const scrollCarousel = (direction: 'left' | 'right') => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('.info-agent-card')?.clientWidth || 340;
    const scrollAmount = cardWidth + 24; // card width + gap
    el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

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
          <h1 className="info-hero-title">Trusted Real Estate Professionals</h1>
          <p className="info-hero-subtitle">
            Our network of licensed real estate professionals is committed to guiding you through every step of your
            property journey. With local expertise and verified credentials, you can connect with agents you can trust.
          </p>
        </section>

        {/* Agent Cards Carousel */}
        <section className="info-section">
          <h2 className="info-section-title" style={{ textAlign: 'center' }}>Meet Our Agents</h2>
          
          {loadingAgents ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '50px' }}>
              <FaSpinner className="spin" size={30} color="#6b7280" />
            </div>
          ) : agents.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>No verified agents found in your area yet.</p>
          ) : (
            <div className="info-agents-carousel-wrapper">
              {canScrollLeft && (
                <button className="info-carousel-arrow info-carousel-arrow-left" onClick={() => scrollCarousel('left')} aria-label="Scroll left">
                  <FaChevronLeft size={18} />
                </button>
              )}
              <div className="info-agents-carousel" ref={carouselRef}>
                {agents.map((agent) => (
                  <div 
                    className="info-agent-card" 
                    key={agent.id}
                    onClick={() => navigate(`/profile/${agent.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
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
                      <a href={`tel:${agent.phone}`} className="info-agent-contact-btn" onClick={(e) => e.stopPropagation()}>
                        <FaPhoneAlt size={12} /> {agent.phone}
                      </a>
                      <a href={`mailto:${agent.email}`} className="info-agent-contact-btn info-agent-email-btn" onClick={(e) => e.stopPropagation()}>
                        <FaEnvelope size={12} /> Email
                      </a>
                    </div>
                  </div>
                ))}
              </div>
              {canScrollRight && (
                <button className="info-carousel-arrow info-carousel-arrow-right" onClick={() => scrollCarousel('right')} aria-label="Scroll right">
                  <FaChevronRight size={18} />
                </button>
              )}
            </div>
          )}
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