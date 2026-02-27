import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase-config";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  FaHome, FaPhoneAlt,
  FaEnvelope, FaCheckCircle, FaMapMarkerAlt,
  FaComments, FaChevronLeft, FaChevronRight, FaSpinner
} from "react-icons/fa";
import "../App.css";
import PublicNavbar from '../components/PublicNavbar';
import LoginModal from '../components/LoginModal';
import RatingStars from '../components/RatingStars';

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
          const createdAt = data.createdAt?.toDate?.() || data.createdAt ? new Date(data.createdAt) : new Date();
          const yearsOnPlatform = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
          return {
            id: doc.id,
            name: data.firstName ? `${data.firstName} ${data.lastName}` : (data.displayName || "Verified Agent"),
            agency: data.address || "Independent Agent",
            specialization: "Real Estate",
            experience: yearsOnPlatform,
            phone: data.mobile || data.phone || "N/A",
            email: data.email || "",
            avatar: data.photoURL || `https://ui-avatars.com/api/?name=${data.firstName}+${data.lastName}&background=10b981&color=fff`,
            rating: data.averageRating || 0,
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
  }, [agents]);

  const scrollCarousel = (direction: 'left' | 'right') => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('.info-agent-card')?.clientWidth || 340;
    const scrollAmount = cardWidth + 24; // card width + gap
    el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className="info-page">
      <div className="info-blob info-blob-1" />
      <div className="info-blob info-blob-2" />
      <div className="info-blob info-blob-3" />

      {/* Navbar */}
      <PublicNavbar onLoginClick={() => setShowLogin(true)} />

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
                      {agent.rating > 0 ? (
                        <>
                          <RatingStars rating={agent.rating} />
                          <span>{agent.rating.toFixed(1)}</span>
                        </>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No reviews yet</span>
                      )}
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
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}