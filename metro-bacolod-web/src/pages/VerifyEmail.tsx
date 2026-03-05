import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase-config";
import { sendEmailVerification, signOut, onAuthStateChanged } from "firebase/auth";
import { glassToast } from '../components/GlassToast';
import { FaEnvelopeOpenText, FaExclamationTriangle, FaSearch } from "react-icons/fa";
import logo from "../assets/MBC Logo.png"; 

export default function VerifyEmail() {
  const [isSending, setIsSending] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const navigate = useNavigate();

  // Wait for Firebase auth to initialize before polling
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      if (!user) navigate("/");
    });
    return () => unsub();
  }, [navigate]);

  // Auto-polling: Check every 3 seconds if the user clicked the link
  useEffect(() => {
    if (!authReady) return;
    const interval = setInterval(async () => {
      const user = auth.currentUser;
      if (user) {
        await user.reload(); 
        if (user.emailVerified) {
          clearInterval(interval);
          glassToast.success("Email Verified! Redirecting...");
          setTimeout(() => navigate("/dashboard"), 2000);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [authReady, navigate]);

  const handleResend = async () => {
    setIsSending(true);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        glassToast.success("New verification link sent! Check your inbox.");
      }
    } catch (error: any) {
      glassToast.error("Too many requests. Please wait a moment.");
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="dashboard-revamp" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', overflow: 'hidden' }}>
      
      {/* Ambient Background Blobs */}
      <div className="profile-blob profile-blob-1" />
      <div className="profile-blob profile-blob-2" />

      {/* Glassmorphism Card */}
      <div style={{ 
        background: 'rgba(255,255,255,0.7)', 
        backdropFilter: 'blur(20px)', 
        WebkitBackdropFilter: 'blur(20px)', 
        padding: '50px 40px', 
        borderRadius: '24px', 
        width: '100%', 
        maxWidth: '500px', 
        border: '1px solid rgba(255,255,255,0.5)', 
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)', 
        zIndex: 10, 
        textAlign: 'center' 
      }}>
        
        <img src={logo} alt="Logo" style={{ width: '70px', marginBottom: '15px' }} />
        <br/>
        <FaEnvelopeOpenText size={48} color="#111827" style={{ marginBottom: '20px' }} />
        
        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#111827', margin: '0 0 10px 0' }}>Check Your Email</h2>
        
        <p style={{ color: '#374151', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '20px' }}>
          We sent a verification link to:<br/>
          <strong style={{ color: '#111827', fontSize: '1.05rem' }}>{auth.currentUser?.email}</strong>
        </p>

        {/* Clear Instructions Box */}
        <div style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid #d1d5db', padding: '16px', borderRadius: '12px', textAlign: 'left', marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaSearch color="#6b7280" /> What to look for:
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#374151', lineHeight: '1.6' }}>
            <li>Open your email app.</li>
            <li>Look for an email from <strong>noreply@metro-bacolod-connect</strong>.</li>
            <li>The subject will say: <strong>"Verify your email for Metro Bacolod Connect"</strong>.</li>
            <li>Click the long link inside the email to finish setting up your account!</li>
          </ul>
        </div>

        {/* SPAM Warning Box */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px', textAlign: 'left', marginBottom: '30px' }}>
          <FaExclamationTriangle color="#d97706" size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400e', lineHeight: '1.5' }}>
            <strong>Can't find the email?</strong><br/> 
            It might have been accidentally filtered. Please check your <strong>SPAM</strong> or <strong>JUNK</strong> folder. If you find it there, mark it as "Not Spam" to ensure you get our future updates!
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Primary Action */}
          <button 
            onClick={handleResend}
            disabled={isSending}
            style={{ 
              width: '100%', 
              padding: '16px', 
              borderRadius: '14px', 
              border: 'none', 
              background: '#111827', 
              color: '#fff', 
              fontWeight: '700', 
              fontSize: '1rem', 
              cursor: isSending ? 'wait' : 'pointer', 
              transition: '0.2s', 
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)', 
              opacity: isSending ? 0.7 : 1 
            }}
          >
            {isSending ? "Sending..." : "Resend Verification Email"}
          </button>

          {/* Secondary Action */}
          <button 
            onClick={handleLogout}
            style={{ 
              width: '100%', 
              padding: '12px', 
              borderRadius: '14px', 
              border: 'none', 
              background: 'transparent', 
              color: '#6b7280', 
              fontWeight: '600', 
              fontSize: '0.9rem', 
              cursor: 'pointer', 
              transition: '0.2s' 
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#111827'}
            onMouseOut={(e) => e.currentTarget.style.color = '#6b7280'}
          >
            ← Cancel & Return to Login
          </button>
        </div>

      </div>
    </div>
  );
}