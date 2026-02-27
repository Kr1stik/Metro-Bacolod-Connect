import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHome, FaMapMarkedAlt,
  FaChevronDown, FaChevronUp, FaLightbulb,
  FaFileAlt, FaQuestionCircle
} from "react-icons/fa";
import "../App.css";
import PublicNavbar from '../components/PublicNavbar';
import LoginModal from '../components/LoginModal';

const GUIDES = [
  {
    icon: <FaHome size={22} />,
    title: "First-Time Homebuyer Guide",
    description: "Everything you need to know about buying your first property in Metro Bacolod — from budgeting and loan options to choosing the right location and closing the deal.",
    extended: "Start by determining your budget and getting pre-approved for a home loan from banks like BDO, BPI, or Pag-IBIG Fund. Research neighborhoods in Bacolod that fit your lifestyle. Visit multiple properties before deciding. Hire a licensed real estate agent who knows the local market. Ensure all documents — including the title, tax declaration, and deed of sale — are in order before closing. Don't forget to budget for transfer taxes, notarial fees, and registration costs.",
  },
  {
    icon: <FaMapMarkedAlt size={22} />,
    title: "How to Choose the Right Location",
    description: "Location is everything in real estate. Learn what factors to consider — proximity to schools, flood risk, accessibility, future development plans, and community vibe.",
    extended: "Check flood maps from your local DRRM office. Drive through the area at different times of day to assess traffic. Look for nearby schools, hospitals, and commercial centers. Research upcoming infrastructure projects — new roads or malls can dramatically increase property values. Talk to current residents to get an authentic feel for the neighborhood.",
  },
  {
    icon: <FaLightbulb size={22} />,
    title: "Property Investment Tips",
    description: "Smart strategies for real estate investment in Metro Bacolod. Understand ROI, rental yields, market timing, and the differences between residential and commercial investments.",
    extended: "Focus on areas with strong rental demand — near universities or business districts. Compute potential rental yield (monthly rent × 12 / property price × 100). Commercial properties typically yield higher returns but require more capital. Consider pre-selling properties for lower entry prices. Always diversify — don't put all your investment in one property type.",
  },
  {
    icon: <FaFileAlt size={22} />,
    title: "Documents Needed for Buying Property",
    description: "A complete checklist of required documents — valid IDs, TIN, proof of income, tax declarations, title verification, and more. Be prepared before your first viewing.",
    extended: "Buyer checklist: 2 valid government IDs, TIN, latest ITR or Certificate of Employment, bank statements (last 3 months), and marriage certificate (if applicable). For the property: Transfer Certificate of Title (TCT), Tax Declaration, Real Property Tax receipts, Lot/Floor plan, and Certificate of No Improvements (for vacant lots). Have a lawyer review the Deed of Absolute Sale before signing.",
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<number | null>(null);
  const navigate = useNavigate();

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
                {expandedGuide === i && (
                  <p className="info-guide-text" style={{ marginTop: '8px', opacity: 0.85 }}>{guide.extended}</p>
                )}
                <button className="info-guide-btn" onClick={() => setExpandedGuide(expandedGuide === i ? null : i)}>
                  {expandedGuide === i ? "Show Less ←" : "Read More →"}
                </button>
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
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
