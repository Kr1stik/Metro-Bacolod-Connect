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
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '12px' }}>Effective Date: March 1, 2026</p>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '40px' }}>Last Updated: March 1, 2026</p>

        {/* NPC Compliance Notice */}
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
          <p style={{ ...pStyle, fontSize: '0.88rem', color: '#0369a1', margin: 0 }}>
            <strong>Data Privacy Commitment:</strong> Metro Bacolod Connect is committed to protecting your personal data in compliance with Republic Act No. 10173 (Data Privacy Act of 2012), its Implementing Rules and Regulations (IRR), National Privacy Commission (NPC) advisories, and other applicable Philippine laws.
          </p>
        </div>

        <section style={sectionStyle}>
          <h2 style={h2Style}>1. Data Controller Information</h2>
          <p style={pStyle}>
            Metro Bacolod Connect ("we," "us," "our," or the "Platform") acts as the Personal Information Controller (PIC) as defined under the Data Privacy Act of 2012.
          </p>
          <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '16px', marginTop: '12px', border: '1px solid #e5e7eb' }}>
            <p style={{ ...pStyle, margin: '0 0 4px' }}><strong>Entity:</strong> Metro Bacolod Connect</p>
            <p style={{ ...pStyle, margin: '0 0 4px' }}><strong>Address:</strong> Bacolod City, Negros Occidental, Philippines 6100</p>
            <p style={{ ...pStyle, margin: '0 0 4px' }}><strong>Data Protection Officer Email:</strong> dpo@metrobacolodconnect.com</p>
            <p style={{ ...pStyle, margin: 0 }}><strong>General Inquiries:</strong> privacy@metrobacolodconnect.com</p>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>2. Legal Basis for Processing</h2>
          <p style={pStyle}>We process your personal data under the following legal bases as provided by the Data Privacy Act of 2012 (Sections 12 and 13):</p>
          <ul style={ulStyle}>
            <li><strong>Consent:</strong> When you register, you give explicit consent to process your data by accepting this Privacy Policy and our Terms of Service.</li>
            <li><strong>Contractual Necessity:</strong> Processing necessary to fulfill the services you request, including listing properties, connecting with professionals, and using the messaging system.</li>
            <li><strong>Legitimate Interest:</strong> Processing necessary for platform security, fraud prevention, and service improvement, provided this does not override your fundamental rights.</li>
            <li><strong>Legal Obligation:</strong> Processing required to comply with applicable Philippine laws and regulations.</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>3. Personal Data We Collect</h2>
          <p style={pStyle}>In accordance with the principle of proportionality, we collect only data that is necessary, relevant, and not excessive for the stated purposes:</p>

          <h3 style={h3Style}>3.1 Information You Provide Directly</h3>
          <ul style={ulStyle}>
            <li><strong>Account Registration Data:</strong> Full name, email address, mobile/phone number, date of birth, gender, marital status, and address (street, city, province)</li>
            <li><strong>Profile Information:</strong> Profile photo, display name, and professional description</li>
            <li><strong>Listing Data:</strong> Property descriptions, images, pricing, location coordinates, and property details</li>
            <li><strong>Identity Verification Data (Agents/Sellers):</strong> PRC license number, PRC ID images (front and back), government-issued ID images (front and back)</li>
            <li><strong>Communication Data:</strong> Messages sent through the Platform's in-app messaging system</li>
          </ul>

          <h3 style={h3Style}>3.2 Information Collected Automatically</h3>
          <ul style={ulStyle}>
            <li><strong>Authentication Data:</strong> Firebase authentication tokens, login timestamps, and session data</li>
            <li><strong>Usage Data:</strong> Pages visited, features used, and interaction patterns for service improvement</li>
            <li><strong>Device Information:</strong> Browser type, operating system, and general device category</li>
          </ul>

          <h3 style={h3Style}>3.3 Sensitive Personal Information</h3>
          <p style={pStyle}>
            We collect government-issued identification documents and PRC licenses solely for the purpose of identity verification of real estate professionals. This sensitive information is processed with your explicit consent and handled with heightened security measures as required under Sections 3(l) and 13 of the Data Privacy Act.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>4. Purpose of Processing</h2>
          <p style={pStyle}>Your personal data is processed for the following specific, declared, and legitimate purposes:</p>
          <ul style={ulStyle}>
            <li><strong>Service Delivery:</strong> Creating and managing your account, displaying listings, and facilitating connections between buyers, sellers, and agents</li>
            <li><strong>Identity Verification:</strong> Verifying the credentials of real estate professionals (agents and sellers) to ensure platform trustworthiness</li>
            <li><strong>Communication:</strong> Sending transactional emails (e.g., verification status notifications), service updates, and responding to inquiries</li>
            <li><strong>Platform Safety:</strong> Detecting, preventing, and addressing fraud, abuse, security threats, and violations of our Terms of Service</li>
            <li><strong>Service Improvement:</strong> Analyzing usage patterns to improve features, performance, and user experience</li>
            <li><strong>Legal Compliance:</strong> Fulfilling obligations under applicable laws and regulations, including responding to lawful requests from authorities</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>5. Data Sharing and Disclosure</h2>
          <p style={pStyle}><strong>We do not sell, rent, or trade your personal data.</strong> We may share your information only in the following circumstances:</p>
          <ul style={ulStyle}>
            <li><strong>Public Listings:</strong> Property listings you publish are visible to all platform users. You control what information appears in your listings.</li>
            <li><strong>Profile Visibility:</strong> Your name, role, profile photo, and professional details are visible to other registered users of the platform.</li>
            <li><strong>Third-Party Service Providers (Personal Information Processors):</strong>
              <ul style={{ ...ulStyle, marginTop: '8px' }}>
                <li><strong>Google Firebase</strong> — Authentication, database storage, and hosting (Google LLC, data processed in accordance with Google's data processing terms)</li>
                <li><strong>Cloudinary</strong> — Image storage and delivery for property listing images and profile photos</li>
                <li><strong>Resend</strong> — Transactional email delivery for verification notifications</li>
                <li><strong>Vercel</strong> — Web application hosting and analytics</li>
              </ul>
            </li>
            <li><strong>Legal Requirements:</strong> When required by law, court order, or governmental regulation, or when necessary to protect the rights, safety, or property of our users or the public</li>
            <li><strong>With Your Consent:</strong> In any other case, we will obtain your express consent before sharing your data</li>
          </ul>
          <p style={{ ...pStyle, marginTop: '12px' }}>
            All third-party processors are bound by data processing agreements and are required to implement appropriate security measures in accordance with the Data Privacy Act.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>6. Data Retention</h2>
          <p style={pStyle}>We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected, as required under Section 11(e) of the Data Privacy Act:</p>
          <ul style={ulStyle}>
            <li><strong>Active Accounts:</strong> Data is retained for the duration of your active account</li>
            <li><strong>Deactivated/Deleted Accounts:</strong> Account data is soft-deleted and retained for up to 30 days to allow recovery, after which it is permanently deleted</li>
            <li><strong>Verification Documents:</strong> ID and PRC images are retained only for the duration of the verified account status. Upon account deletion, these documents are permanently removed</li>
            <li><strong>Messages:</strong> Chat messages are retained for the duration of both participants' active accounts</li>
            <li><strong>Activity Logs:</strong> Administrative logs are retained for up to one (1) year for security and audit purposes</li>
            <li><strong>Legal Holds:</strong> Data may be retained beyond these periods if required by legal proceedings or regulatory obligations</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>7. Your Rights as a Data Subject</h2>
          <p style={pStyle}>Under the Data Privacy Act of 2012 (Sections 16-18) and NPC regulations, you have the following rights:</p>
          <ul style={ulStyle}>
            <li><strong>Right to Be Informed:</strong> You have the right to be informed of the collection and processing of your personal data, including the purposes, scope, and method of processing</li>
            <li><strong>Right to Access:</strong> You may request access to your personal data held by us, including information about how it has been processed</li>
            <li><strong>Right to Object:</strong> You may object to the processing of your personal data, including processing for direct marketing or automated decision-making</li>
            <li><strong>Right to Erasure or Blocking:</strong> You may request the deletion or blocking of your personal data when it is incomplete, outdated, unlawfully obtained, or no longer necessary for the purposes for which it was collected</li>
            <li><strong>Right to Rectification:</strong> You may correct any inaccurate personal data through your account Settings page, or by contacting our Data Protection Officer</li>
            <li><strong>Right to Data Portability:</strong> You may request a copy of your personal data in a structured, commonly used, and machine-readable format</li>
            <li><strong>Right to File a Complaint:</strong> You have the right to file a complaint with the National Privacy Commission if you believe your data privacy rights have been violated</li>
          </ul>
          <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '16px', marginTop: '12px', border: '1px solid #e5e7eb' }}>
            <p style={{ ...pStyle, margin: 0, fontSize: '0.88rem' }}>
              To exercise any of these rights, please contact our Data Protection Officer at <strong>dpo@metrobacolodconnect.com</strong>. We will respond to your request within fifteen (15) days, as required by the NPC.
            </p>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>8. Data Security Measures</h2>
          <p style={pStyle}>We implement reasonable and appropriate organizational, physical, and technical security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction, in accordance with Sections 20-22 of the Data Privacy Act:</p>
          <ul style={ulStyle}>
            <li><strong>Encryption in Transit:</strong> All data transmitted between your browser and our servers is encrypted using TLS/HTTPS</li>
            <li><strong>Authentication Security:</strong> Firebase Authentication with secure token-based sessions; no passwords are stored on our servers</li>
            <li><strong>Access Controls:</strong> Role-based access controls with admin authentication for sensitive operations</li>
            <li><strong>Input Validation:</strong> Server-side validation and sanitization of all user inputs using DTO whitelisting</li>
            <li><strong>Rate Limiting:</strong> API rate limiting to prevent abuse and brute-force attacks</li>
            <li><strong>Security Headers:</strong> HTTP security headers (Helmet.js) to protect against common web vulnerabilities</li>
            <li><strong>Infrastructure Security:</strong> Cloud infrastructure provided by Google (Firebase), Cloudinary, and Vercel with enterprise-grade security certifications</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>9. Data Breach Notification</h2>
          <p style={pStyle}>
            In the event of a personal data breach that is likely to cause serious harm to affected data subjects, we will:
          </p>
          <ul style={ulStyle}>
            <li>Notify the National Privacy Commission (NPC) within seventy-two (72) hours of becoming aware of the breach, as required by NPC Circular 16-03</li>
            <li>Notify affected data subjects within seventy-two (72) hours if the breach involves sensitive personal information or is likely to cause serious harm</li>
            <li>Document the breach, its effects, and the remedial actions taken</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>10. Cross-Border Data Transfers</h2>
          <p style={pStyle}>
            Some of our third-party service providers (Firebase/Google, Cloudinary, Resend, Vercel) may process your data outside the Philippines. In such cases, we ensure that:
          </p>
          <ul style={ulStyle}>
            <li>The recipient country provides an adequate level of data protection, or</li>
            <li>Appropriate safeguards are in place (such as standard contractual clauses), and</li>
            <li>Your consent has been obtained for such transfers as part of your agreement to this Privacy Policy</li>
          </ul>
          <p style={pStyle}>
            These transfers comply with Section 21 of the Data Privacy Act and NPC Circular 2022-01.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>11. Cookies and Local Storage</h2>
          <p style={pStyle}>
            The Platform uses browser local storage and Firebase authentication tokens to maintain your login session. We use Vercel Analytics for aggregated, non-personally-identifiable usage statistics. <strong>We do not use third-party advertising cookies or trackers.</strong>
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>12. Children's Privacy</h2>
          <p style={pStyle}>
            The Platform is not intended for individuals under eighteen (18) years of age. We do not knowingly collect personal data from children. If we discover that a child under 18 has provided personal data, we will promptly delete it. If you are a parent or guardian and believe your child has provided personal data to us, please contact our Data Protection Officer.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>13. Changes to This Privacy Policy</h2>
          <p style={pStyle}>
            We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify registered users of material changes through the Platform or via email. The "Last Updated" date at the top of this Policy indicates the most recent revision. Continued use of the Platform after such changes constitutes your acknowledgment and acceptance of the updated Privacy Policy.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>14. Governing Law and Dispute Resolution</h2>
          <p style={pStyle}>
            This Privacy Policy is governed by and construed in accordance with the laws of the Republic of the Philippines, including but not limited to:
          </p>
          <ul style={ulStyle}>
            <li>Republic Act No. 10173 — Data Privacy Act of 2012</li>
            <li>Its Implementing Rules and Regulations (IRR)</li>
            <li>National Privacy Commission Circulars and Advisories</li>
            <li>Republic Act No. 10175 — Cybercrime Prevention Act of 2012</li>
            <li>Republic Act No. 8792 — Electronic Commerce Act of 2000</li>
          </ul>
          <p style={pStyle}>
            Any disputes arising from this Privacy Policy shall be resolved through the appropriate government bodies, including the National Privacy Commission.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>15. Contact Us</h2>
          <p style={pStyle}>For privacy-related inquiries, requests to exercise your data subject rights, or to report a data privacy concern:</p>
          <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '16px', marginTop: '12px', border: '1px solid #e5e7eb' }}>
            <p style={{ ...pStyle, margin: '0 0 4px' }}><strong>Data Protection Officer:</strong> dpo@metrobacolodconnect.com</p>
            <p style={{ ...pStyle, margin: '0 0 4px' }}><strong>General Privacy Inquiries:</strong> privacy@metrobacolodconnect.com</p>
            <p style={{ ...pStyle, margin: '0 0 8px' }}><strong>Address:</strong> Bacolod City, Negros Occidental, Philippines 6100</p>
            <p style={{ ...pStyle, margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
              You may also file a complaint with the <strong>National Privacy Commission</strong> at <a href="https://www.privacy.gov.ph" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>www.privacy.gov.ph</a> or email <a href="mailto:complaints@privacy.gov.ph" style={{ color: '#3b82f6', textDecoration: 'none' }}>complaints@privacy.gov.ph</a>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

const sectionStyle: React.CSSProperties = { marginBottom: '32px' };
const h2Style: React.CSSProperties = { fontSize: '1.15rem', fontWeight: '700', color: '#111827', marginBottom: '12px' };
const h3Style: React.CSSProperties = { fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '8px', marginTop: '16px' };
const pStyle: React.CSSProperties = { fontSize: '0.92rem', lineHeight: '1.7', color: '#374151', margin: 0 };
const ulStyle: React.CSSProperties = { paddingLeft: '24px', fontSize: '0.92rem', lineHeight: '1.9', color: '#374151' };
