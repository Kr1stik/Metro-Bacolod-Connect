import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import "../App.css";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', sans-serif", color: '#111' }}>
      {/* Header */}
      <div style={{ width: '100%', padding: '15px 5%', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'white', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={logo} alt="Logo" style={{ width: '40px', cursor: 'pointer' }} onClick={() => navigate('/')} />
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>Terms of Service</h2>
        </div>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: '1px solid #e5e7eb', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: '#111', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FaArrowLeft size={12} /> Back
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>Terms of Service</h1>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '40px' }}>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <section style={sectionStyle}>
          <h2 style={h2Style}>1. Acceptance of Terms</h2>
          <p style={pStyle}>By accessing or using Metro Bacolod Connect ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>2. Description of Service</h2>
          <p style={pStyle}>Metro Bacolod Connect is a real estate listing platform serving Bacolod City and surrounding areas. The Platform connects property sellers, real estate professionals, and buyers by providing listing services, messaging, and professional directories.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>3. User Accounts</h2>
          <p style={pStyle}>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. You must be at least 18 years old to create an account.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>4. User Conduct</h2>
          <p style={pStyle}>You agree not to:</p>
          <ul style={ulStyle}>
            <li>Post false, misleading, or fraudulent property listings</li>
            <li>Impersonate another person or entity</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Use the Platform for any illegal purpose</li>
            <li>Upload malicious content, viruses, or harmful code</li>
            <li>Attempt to gain unauthorized access to the Platform's systems</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>5. Property Listings</h2>
          <p style={pStyle}>Sellers are solely responsible for the accuracy of their listings, including property descriptions, pricing, images, and availability status. Metro Bacolod Connect does not verify listing information and is not liable for any inaccuracies.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>6. Intellectual Property</h2>
          <p style={pStyle}>All content, design elements, and branding on the Platform are the property of Metro Bacolod Connect. Users retain ownership of content they post but grant the Platform a non-exclusive license to display and distribute such content on the Platform.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>7. Privacy</h2>
          <p style={pStyle}>Your use of the Platform is also governed by our Privacy Policy. By using the Platform, you consent to the collection and use of your information as described in the Privacy Policy.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>8. Limitation of Liability</h2>
          <p style={pStyle}>Metro Bacolod Connect is provided "as is" without warranties of any kind. We are not liable for any damages arising from the use of the Platform, including but not limited to property transactions, communications between users, or data loss.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>9. Termination</h2>
          <p style={pStyle}>We reserve the right to suspend or terminate your account at any time for violations of these Terms or for any other reason at our discretion. Upon termination, your right to access the Platform ceases immediately.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>10. Changes to Terms</h2>
          <p style={pStyle}>We may update these Terms from time to time. Continued use of the Platform after changes constitutes your acceptance of the updated Terms.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>11. Contact</h2>
          <p style={pStyle}>If you have questions about these Terms, please contact us at <strong>support@metrobacolodconnect.com</strong>.</p>
        </section>
      </div>
    </div>
  );
}

const sectionStyle: React.CSSProperties = { marginBottom: '32px' };
const h2Style: React.CSSProperties = { fontSize: '1.15rem', fontWeight: '700', color: '#111827', marginBottom: '12px' };
const pStyle: React.CSSProperties = { fontSize: '0.92rem', lineHeight: '1.7', color: '#374151', margin: 0 };
const ulStyle: React.CSSProperties = { paddingLeft: '24px', fontSize: '0.92rem', lineHeight: '1.9', color: '#374151' };
