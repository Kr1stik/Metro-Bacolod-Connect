import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase-config";
import {
  FaSearchPlus, FaUserTie,
  FaClipboardCheck, FaChartLine, FaHeadset,
  FaArrowRight
} from "react-icons/fa";
import "../App.css";
import PublicNavbar from '../components/PublicNavbar';
import LoginModal from '../components/LoginModal';

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setIsLoggedIn(!!u));
    return () => unsub();
  }, []);

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
              <button className="info-cta-btn info-cta-primary" onClick={() => isLoggedIn ? navigate("/dashboard") : setShowLogin(true)}>
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
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
