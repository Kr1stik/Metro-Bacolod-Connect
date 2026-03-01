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
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '12px' }}>Effective Date: March 1, 2026</p>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '40px' }}>Last Updated: March 1, 2026</p>

        <section style={sectionStyle}>
          <h2 style={h2Style}>1. Acceptance of Terms</h2>
          <p style={pStyle}>By accessing, browsing, or using Metro Bacolod Connect ("the Platform"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service ("Terms"), our Privacy Policy, and all applicable laws and regulations of the Republic of the Philippines. If you do not agree to any of these Terms, you must immediately discontinue use of the Platform.</p>
          <p style={{ ...pStyle, marginTop: '12px' }}>These Terms constitute a legally binding agreement between you ("User," "you," or "your") and Metro Bacolod Connect ("we," "us," or "our").</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>2. Description of Service</h2>
          <p style={pStyle}>Metro Bacolod Connect is a real estate listing platform serving Bacolod City and surrounding areas in Negros Occidental, Philippines. The Platform connects property sellers, licensed real estate professionals, and prospective buyers by providing:</p>
          <ul style={ulStyle}>
            <li>Property listing creation and browsing services</li>
            <li>Professional directory of verified real estate agents and sellers</li>
            <li>In-app messaging between registered users</li>
            <li>Property search and location-based discovery</li>
            <li>Identity verification for real estate professionals</li>
          </ul>
          <p style={{ ...pStyle, marginTop: '12px' }}><strong>Disclaimer:</strong> Metro Bacolod Connect is a listing and connection platform only. We do not participate in, guarantee, or mediate any real estate transactions. All transactions are conducted exclusively between the buyer and seller/agent at their own risk and discretion.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>3. User Eligibility and Account Registration</h2>
          <p style={pStyle}>To register and use the Platform, you must:</p>
          <ul style={ulStyle}>
            <li>Be at least eighteen (18) years of age or the age of majority in your jurisdiction</li>
            <li>Have the legal capacity to enter into contracts under Philippine law (Republic Act No. 386 — Civil Code of the Philippines)</li>
            <li>Provide accurate, current, and complete registration information</li>
            <li>Maintain and promptly update your information to keep it accurate and complete</li>
          </ul>
          <p style={{ ...pStyle, marginTop: '12px' }}>You are solely responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account or any other breach of security.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>4. User Roles and Verification</h2>
          <p style={pStyle}>The Platform supports three user roles:</p>
          <ul style={ulStyle}>
            <li><strong>Client:</strong> Users who browse and inquire about property listings</li>
            <li><strong>Seller:</strong> Users who create and manage property listings. Sellers may be required to submit identity verification documents</li>
            <li><strong>Agent:</strong> Licensed real estate professionals. Agents must submit their PRC (Professional Regulation Commission) license and government-issued ID for verification by our admin team</li>
          </ul>
          <p style={{ ...pStyle, marginTop: '12px' }}>By submitting verification documents, you consent to the processing of your sensitive personal information (government IDs and professional licenses) for the sole purpose of identity verification, in accordance with our Privacy Policy and the Data Privacy Act of 2012.</p>
          <p style={{ ...pStyle, marginTop: '8px' }}>We reserve the right to approve, reject, or revoke verification status at our discretion. Verification does not constitute an endorsement, guarantee, or warranty of the user's professional competence or the validity of any transaction.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>5. User Conduct and Prohibited Activities</h2>
          <p style={pStyle}>You agree to use the Platform in compliance with all applicable Philippine laws and regulations. You shall not:</p>
          <ul style={ulStyle}>
            <li>Post false, misleading, fraudulent, or deceptive property listings or information</li>
            <li>Impersonate any person or entity, or falsely represent your affiliation with any person or entity</li>
            <li>Harass, abuse, threaten, discriminate against, or harm other users</li>
            <li>Use the Platform for any illegal purpose, including but not limited to fraud, money laundering, or activities prohibited under the Revised Penal Code</li>
            <li>Upload, post, or transmit any content that is obscene, defamatory, libelous, or violates the Anti-Cybercrime Act (RA 10175)</li>
            <li>Upload malicious content, viruses, malware, or any code designed to disrupt, damage, or limit the functionality of the Platform</li>
            <li>Attempt to gain unauthorized access to the Platform's systems, servers, databases, or other users' accounts</li>
            <li>Scrape, crawl, or use automated means to collect data from the Platform without our express written consent</li>
            <li>Circumvent, disable, or interfere with any security features of the Platform</li>
            <li>Use the Platform to send spam, unsolicited messages, or bulk communications</li>
            <li>Engage in price manipulation, bid rigging, or other anti-competitive practices</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>6. Property Listings</h2>
          <p style={pStyle}>Sellers and agents who publish listings on the Platform agree to the following:</p>
          <ul style={ulStyle}>
            <li>You are solely responsible for the accuracy, completeness, and legality of all listing content, including property descriptions, pricing, images, and availability status</li>
            <li>All listed properties must be properties that you own, are authorized to sell, or are authorized to represent</li>
            <li>Listings must comply with all applicable Philippine laws, including the Maceda Law (RA 6552), Real Estate Service Act (RA 9646), and local zoning regulations</li>
            <li>You must not post duplicate, misleading, or "bait-and-switch" listings</li>
            <li>We reserve the right to remove, modify, or decline any listing at our sole discretion without prior notice</li>
          </ul>
          <p style={{ ...pStyle, marginTop: '12px' }}>Metro Bacolod Connect does not verify, warrant, or guarantee the accuracy of any listing information. Users are advised to independently verify all property information before entering into any transaction.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>7. Content Ownership and Intellectual Property</h2>
          <p style={pStyle}><strong>Platform Content:</strong> All content, design elements, logos, trademarks, source code, and branding on the Platform are the intellectual property of Metro Bacolod Connect and are protected under the Intellectual Property Code of the Philippines (RA 8293). Unauthorized reproduction, distribution, or modification is prohibited.</p>
          <p style={{ ...pStyle, marginTop: '12px' }}><strong>User Content:</strong> You retain ownership of all content you post on the Platform (including listing descriptions, images, and messages). By posting content, you grant Metro Bacolod Connect a non-exclusive, worldwide, royalty-free license to use, display, reproduce, and distribute such content solely for the purpose of operating and improving the Platform.</p>
          <p style={{ ...pStyle, marginTop: '12px' }}><strong>Content Removal:</strong> You may delete your content at any time through the Platform's interface. We may retain cached or archived copies for a reasonable period in accordance with our data retention policy.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>8. Privacy and Data Protection</h2>
          <p style={pStyle}>Your use of the Platform is governed by our Privacy Policy, which is compliant with the Data Privacy Act of 2012 (RA 10173) and National Privacy Commission regulations. By using the Platform, you consent to the collection, processing, and storage of your personal data as described in our Privacy Policy.</p>
          <p style={{ ...pStyle, marginTop: '12px' }}>You have rights under the Data Privacy Act, including the right to access, correct, erase, and object to the processing of your personal data. For details, please refer to our <a onClick={() => navigate('/privacy')} style={{ color: '#3b82f6', cursor: 'pointer', textDecoration: 'none', fontWeight: '600' }}>Privacy Policy</a>.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>9. Reporting and Content Moderation</h2>
          <p style={pStyle}>We maintain a reporting system to ensure community safety. Users may report:</p>
          <ul style={ulStyle}>
            <li>Listings that violate these Terms or contain false/misleading information</li>
            <li>Users who engage in prohibited activities or harassment</li>
            <li>Content that is offensive, illegal, or in violation of Philippine laws</li>
          </ul>
          <p style={{ ...pStyle, marginTop: '12px' }}>We will review reports promptly and may take actions including but not limited to: content removal, account suspension, account termination, or referral to appropriate authorities. We are not obligated to disclose the specifics of moderation actions.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>10. Limitation of Liability</h2>
          <p style={pStyle}>To the maximum extent permitted by Philippine law:</p>
          <ul style={ulStyle}>
            <li>Metro Bacolod Connect is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied</li>
            <li>We do not warrant that the Platform will be uninterrupted, error-free, secure, or free of viruses or other harmful components</li>
            <li>We shall not be liable for any direct, indirect, incidental, consequential, special, or punitive damages arising from:
              <ul style={{ ...ulStyle, marginTop: '8px' }}>
                <li>Your use of or inability to use the Platform</li>
                <li>Any transactions or negotiations between users</li>
                <li>Content posted by users, including property listing accuracy</li>
                <li>Unauthorized access to or alteration of your data</li>
                <li>Any third-party conduct on the Platform</li>
              </ul>
            </li>
            <li>Our total liability for any claims related to the Platform shall not exceed the amount you have paid to us (if any) in the twelve (12) months preceding the claim</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>11. Indemnification</h2>
          <p style={pStyle}>You agree to indemnify, defend, and hold harmless Metro Bacolod Connect, its officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorney's fees) arising from:</p>
          <ul style={ulStyle}>
            <li>Your use of the Platform or violation of these Terms</li>
            <li>Your content or listings posted on the Platform</li>
            <li>Your violation of any law, regulation, or third-party right</li>
            <li>Any transaction or dispute between you and another user</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>12. Account Suspension and Termination</h2>
          <p style={pStyle}>We reserve the right to suspend, deactivate, or permanently terminate your account at any time, with or without notice, for any of the following reasons:</p>
          <ul style={ulStyle}>
            <li>Violation of these Terms of Service or our Community Guidelines</li>
            <li>Fraudulent, illegal, or harmful activity</li>
            <li>Multiple reports or complaints from other users</li>
            <li>Failure to comply with verification requirements</li>
            <li>Inactivity for an extended period</li>
            <li>Any other reason at our sole discretion</li>
          </ul>
          <p style={{ ...pStyle, marginTop: '12px' }}>Upon termination, your right to access the Platform ceases immediately. Provisions of these Terms that by their nature should survive termination (including limitation of liability, indemnification, and dispute resolution) shall continue to apply.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>13. Third-Party Services</h2>
          <p style={pStyle}>The Platform integrates with third-party services including Google Firebase, Cloudinary, Resend, and Vercel. Your use of these services is subject to their respective terms of service and privacy policies. We are not responsible for the practices, content, or availability of third-party services.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>14. Amendments to Terms</h2>
          <p style={pStyle}>We may revise these Terms at any time by posting the updated version on the Platform. Material changes will be communicated through platform notifications or email. The "Last Updated" date at the top indicates the most recent revision.</p>
          <p style={{ ...pStyle, marginTop: '12px' }}>Your continued use of the Platform after changes have been posted constitutes your binding acceptance of the revised Terms. If you do not agree to the revised Terms, you must discontinue use of the Platform.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>15. Governing Law and Dispute Resolution</h2>
          <p style={pStyle}>These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any dispute, controversy, or claim arising out of or relating to these Terms or the use of the Platform shall be resolved as follows:</p>
          <ul style={ulStyle}>
            <li><strong>Amicable Settlement:</strong> The parties shall first attempt to resolve the dispute through good-faith negotiation within thirty (30) days</li>
            <li><strong>Mediation:</strong> If negotiation fails, the dispute shall be submitted to mediation in accordance with the Alternative Dispute Resolution Act of 2004 (RA 9285)</li>
            <li><strong>Litigation:</strong> If mediation fails, the dispute shall be submitted to the exclusive jurisdiction of the courts of Bacolod City, Negros Occidental, Philippines</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>16. Compliance with Philippine Laws</h2>
          <p style={pStyle}>The Platform operates in compliance with applicable Philippine laws and regulations, including:</p>
          <ul style={ulStyle}>
            <li><strong>RA 10173</strong> — Data Privacy Act of 2012</li>
            <li><strong>RA 10175</strong> — Cybercrime Prevention Act of 2012</li>
            <li><strong>RA 8792</strong> — Electronic Commerce Act of 2000</li>
            <li><strong>RA 9646</strong> — Real Estate Service Act of the Philippines</li>
            <li><strong>RA 8293</strong> — Intellectual Property Code of the Philippines</li>
            <li><strong>RA 7394</strong> — Consumer Act of the Philippines</li>
            <li><strong>RA 9285</strong> — Alternative Dispute Resolution Act of 2004</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>17. Severability</h2>
          <p style={pStyle}>If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such invalidity shall not affect the validity of the remaining provisions, which shall continue in full force and effect.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>18. Entire Agreement</h2>
          <p style={pStyle}>These Terms, together with our Privacy Policy and any additional terms you agree to when using specific features of the Platform, constitute the entire agreement between you and Metro Bacolod Connect regarding the use of the Platform.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>19. Contact Information</h2>
          <p style={pStyle}>If you have questions or concerns about these Terms of Service, please contact us:</p>
          <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '16px', marginTop: '12px', border: '1px solid #e5e7eb' }}>
            <p style={{ ...pStyle, margin: '0 0 4px' }}><strong>Email:</strong> support@metrobacolodconnect.com</p>
            <p style={{ ...pStyle, margin: '0 0 4px' }}><strong>Data Protection Officer:</strong> dpo@metrobacolodconnect.com</p>
            <p style={{ ...pStyle, margin: 0 }}><strong>Address:</strong> Bacolod City, Negros Occidental, Philippines 6100</p>
          </div>
        </section>
      </div>
    </div>
  );
}

const sectionStyle: React.CSSProperties = { marginBottom: '32px' };
const h2Style: React.CSSProperties = { fontSize: '1.15rem', fontWeight: '700', color: '#111827', marginBottom: '12px' };
const pStyle: React.CSSProperties = { fontSize: '0.92rem', lineHeight: '1.7', color: '#374151', margin: 0 };
const ulStyle: React.CSSProperties = { paddingLeft: '24px', fontSize: '0.92rem', lineHeight: '1.9', color: '#374151' };
