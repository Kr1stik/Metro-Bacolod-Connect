import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase-config";
import { FcGoogle } from "react-icons/fc";
import { FaTimes } from "react-icons/fa";
import {
  FaHome, FaMapMarkedAlt,
  FaChevronDown, FaChevronUp, FaLightbulb,
  FaFileAlt, FaQuestionCircle
} from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import "../App.css";
import { glassToast } from '../components/GlassToast';

const GUIDES = [
  {
    icon: <FaHome size={22} />,
    title: "First-Time Homebuyer Guide",
    description: "Everything you need to know about buying your first property in Metro Bacolod — from budgeting and loan options to choosing the right location and closing the deal.",
  },
  {
    icon: <FaMapMarkedAlt size={22} />,
    title: "How to Choose the Right Location",
    description: "Location is everything in real estate. Learn what factors to consider — proximity to schools, flood risk, accessibility, future development plans, and community vibe.",
  },
  {
    icon: <FaLightbulb size={22} />,
    title: "Property Investment Tips",
    description: "Smart strategies for real estate investment in Metro Bacolod. Understand ROI, rental yields, market timing, and the differences between residential and commercial investments.",
  },
  {
    icon: <FaFileAlt size={22} />,
    title: "Documents Needed for Buying Property",
    description: "A complete checklist of required documents — valid IDs, TIN, proof of income, tax declarations, title verification, and more. Be prepared before your first viewing.",
  },
];

const LOCAL_INSIGHTS = [
  {
    title: "Best Areas in Metro Bacolod",
    content: "Discover the most sought-after neighborhoods: Villamonte for urban convenience, Taculing for growing families, Mandalagan for upscale living, Bata for spacious lots, and Estefania for condo living near the city center.",
  },
  {
    title: "Market Trends",
    content: "Metro Bacolod's real estate market continues to show steady growth. Residential lot prices have appreciated 8-12% annually in key areas. Pre-selling projects offer the best entry prices, while the commercial sector is expanding along major corridors.",
  },
];

const FAQS = [
  {
    question: "How do I contact an agent?",
    answer: "You can contact any agent directly through their profile on the Professionals page. Each agent profile includes phone and email information. You can also use the 'Inquire Now' button on any listing to reach the listing agent directly.",
  },
  {
    question: "Are listings verified?",
    answer: "Yes. Our team reviews listing information for accuracy, including property details, pricing, photos, and ownership documentation. We work with licensed agents who are accountable for the accuracy of their listings.",
  },
  {
    question: "Is there a service fee?",
    answer: "Browsing listings and contacting agents through MetroBacolodConnect is free for buyers. Standard real estate commissions apply and are typically handled between the agent and the seller as per industry standards.",
  },
  {
    question: "Can I list my own property?",
    answer: "Yes! If you're a registered agent on our platform, you can create listings directly from your profile or dashboard. Property owners can also contact us to connect with a verified agent who can list their property.",
  },
  {
    question: "How often are listings updated?",
    answer: "Our agents update their listings regularly. Sold or unavailable properties are removed promptly. We encourage users to verify availability directly with the listing agent for the most current information.",
  },
];

export default function Resources() {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
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
          <h1 className="info-hero-title">Real Estate Resources</h1>
          <p className="info-hero-subtitle">
            Access helpful guides and information to make smarter real estate decisions. Whether you're buying your
            first home or investing in land, our resources will help you understand the process and avoid common mistakes.
          </p>
        </section>

        {/* Guides */}
        <section className="info-section">
          <h2 className="info-section-title">Guides</h2>
          <div className="info-guides-grid">
            {GUIDES.map((guide, i) => (
              <div className="info-guide-card" key={i}>
                <div className="info-guide-icon">{guide.icon}</div>
                <h3 className="info-guide-heading">{guide.title}</h3>
                <p className="info-guide-text">{guide.description}</p>
                <button className="info-guide-btn">Read More →</button>
              </div>
            ))}
          </div>
        </section>

        {/* Local Insights */}
        <section className="info-section">
          <h2 className="info-section-title">Local Insights</h2>
          <div className="info-insights-grid">
            {LOCAL_INSIGHTS.map((insight, i) => (
              <div className="info-insight-card" key={i}>
                <h3 className="info-insight-heading">{insight.title}</h3>
                <p className="info-insight-text">{insight.content}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="info-section">
          <h2 className="info-section-title">Frequently Asked Questions</h2>
          <div className="info-faq-list">
            {FAQS.map((faq, i) => (
              <div
                className={`info-faq-item ${openFaq === i ? "info-faq-open" : ""}`}
                key={i}
              >
                <button
                  className="info-faq-question"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <div className="info-faq-q-left">
                    <FaQuestionCircle className="info-faq-q-icon" />
                    <span>{faq.question}</span>
                  </div>
                  {openFaq === i ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                </button>
                {openFaq === i && (
                  <div className="info-faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
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
