import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase-config";
import {
  FaHome, FaBuilding, FaTree, FaCity, FaWarehouse,
  FaCheckCircle, FaSyncAlt, FaMapMarkerAlt, FaPhoneAlt,
} from "react-icons/fa";
import "../App.css";
import PublicNavbar from '../components/PublicNavbar';
import LoginModal from '../components/LoginModal';

const PROPERTY_CATEGORIES = [
  {
    icon: <FaHome size={28} />,
    title: "Residential Lots",
    description: "Prime residential lots in well-planned subdivisions across Metro Bacolod. Ideal for building your dream home with secure land titles and complete development permits.",
    image: "/images/residential_lots.jpeg",
  },
  {
    icon: <FaBuilding size={28} />,
    title: "House and Lot",
    description: "Move-in ready homes and pre-selling house and lot packages. Choose from modern single-detached, duplex, and townhouse designs in top communities.",
    image: "/images/House_and_Lot.jpeg",
  },
  {
    icon: <FaCity size={28} />,
    title: "Condominiums",
    description: "Premium condo units in the heart of Bacolod City. Enjoy resort-style amenities, security, and a convenient urban lifestyle close to everything you need.",
    image: "/images/condominiums.jpeg",
  },
  {
    icon: <FaWarehouse size={28} />,
    title: "Commercial Properties",
    description: "Strategically located commercial spaces for retail, office, and food establishments. High-traffic areas with excellent visibility and foot traffic.",
    image: "/images/commercial_properties.jpeg",
  },
  {
    icon: <FaTree size={28} />,
    title: "Agricultural Land",
    description: "Fertile agricultural land suitable for farming, agri-business, or long-term investment. Available in various sizes across Negros Occidental.",
    image: "/images/agricultural_land.jpeg",
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setIsLoggedIn(!!u));
    return () => unsub();
  }, []);

  return (
    <div className="info-page">
      {/* Ambient blobs */}
      <div className="info-blob info-blob-1" />
      <div className="info-blob info-blob-2" />
      <div className="info-blob info-blob-3" />

      {/* ========== NAVBAR (Landing Page Style) ========== */}
      <PublicNavbar onLoginClick={() => setShowLogin(true)} />

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
              <button className="info-cta-btn info-cta-primary" onClick={() => isLoggedIn ? navigate("/dashboard") : setShowLogin(true)}>
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
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
