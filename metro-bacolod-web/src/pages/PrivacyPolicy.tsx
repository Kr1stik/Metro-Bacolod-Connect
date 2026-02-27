import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import "../App.css";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', sans-serif", color: '#111' }}>
      {/* Header */}
      <div style={{ width: '100%', padding: '15px 5%', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'white', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={logo} alt="Logo" style={{ width: '40px', cursor: 'pointer' }} onClick={() => navigate('/')} />
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>Privacy Policy</h2>
        </div>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: '1px solid #e5e7eb', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: '#111', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FaArrowLeft size={12} /> Back
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>Privacy Policy</h1>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '40px' }}>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <section style={sectionStyle}>
          <h2 style={h2Style}>1. Information We Collect</h2>
          <p style={pStyle}>We collect the following types of information:</p>
          <ul style={ulStyle}>
            <li><strong>Account Information:</strong> Name, email address, phone number, date of birth, gender, address, and profile picture</li>
            <li><strong>Listing Data:</strong> Property descriptions, images, pricing, and location coordinates</li>
            <li><strong>Usage Data:</strong> Pages visited, features used, and interactions within the Platform</li>
            <li><strong>Communication Data:</strong> Messages sent through the Platform's messaging system</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>2. How We Use Your Information</h2>
          <p style={pStyle}>We use collected information to:</p>
          <ul style={ulStyle}>
            <li>Provide and maintain the Platform's services</li>
            <li>Display property listings and connect buyers with sellers</li>
            <li>Send notifications about activities relevant to your account</li>
            <li>Improve and optimize the Platform's performance and features</li>
            <li>Ensure platform safety and prevent fraud</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>3. Information Sharing</h2>
          <p style={pStyle}>We do not sell your personal information. We may share your information in the following circumstances:</p>
          <ul style={ulStyle}>
            <li><strong>Public Listings:</strong> Property listings are visible to all platform users</li>
            <li><strong>Profile Information:</strong> Your name, role, and profile details are visible to other users</li>
            <li><strong>Service Providers:</strong> We use Firebase (Google) for authentication and data storage, and Cloudinary for image hosting</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect the rights and safety of users</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>4. Data Storage & Security</h2>
          <p style={pStyle}>Your data is stored using Google Firebase's cloud infrastructure with industry-standard security measures. Images are hosted on Cloudinary. While we implement reasonable security measures, no method of electronic storage is 100% secure.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>5. Your Rights</h2>
          <p style={pStyle}>You have the right to:</p>
          <ul style={ulStyle}>
            <li>Access and review your personal information</li>
            <li>Update or correct your account details through the Settings page</li>
            <li>Delete your account and associated data by contacting support</li>
            <li>Opt out of non-essential notifications through Settings</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>6. Cookies & Local Storage</h2>
          <p style={pStyle}>The Platform uses browser local storage and Firebase authentication tokens to maintain your login session. We use Vercel Analytics for basic usage statistics. No third-party advertising cookies are used.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>7. Children's Privacy</h2>
          <p style={pStyle}>The Platform is not intended for users under 18 years of age. We do not knowingly collect information from children under 18.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>8. Changes to This Policy</h2>
          <p style={pStyle}>We may update this Privacy Policy periodically. We will notify users of significant changes through the Platform. Continued use after changes constitutes acceptance of the updated policy.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>9. Contact Us</h2>
          <p style={pStyle}>For privacy-related inquiries, please contact us at <strong>privacy@metrobacolodconnect.com</strong>.</p>
        </section>
      </div>
    </div>
  );
}

const sectionStyle: React.CSSProperties = { marginBottom: '32px' };
const h2Style: React.CSSProperties = { fontSize: '1.15rem', fontWeight: '700', color: '#111827', marginBottom: '12px' };
const pStyle: React.CSSProperties = { fontSize: '0.92rem', lineHeight: '1.7', color: '#374151', margin: 0 };
const ulStyle: React.CSSProperties = { paddingLeft: '24px', fontSize: '0.92rem', lineHeight: '1.9', color: '#374151' };
