import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase-config";
import { sendEmailVerification, signOut } from "firebase/auth";
import { glassToast } from '../components/GlassToast';
import logo from "../assets/MBC Logo.png"; 
// Removed FaEnvelopeOpenText import as it's no longer needed

export default function VerifyEmail() {
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(async () => {
      const user = auth.currentUser;
      if (user) {
        await user.reload(); 
        if (user.emailVerified) {
          clearInterval(interval);
          glassToast.success("Email Verified! Redirecting...");
          setTimeout(() => navigate("/dashboard", { state: { welcome: true } }), 2000);
        }
      } else {
        navigate("/");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleResend = async () => {
    setIsSending(true);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        glassToast.success("New verification link sent!");
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
    <div style={{ 
      position: 'fixed',
      inset: 0, 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#f3f4f6', 
      fontFamily: "'Inter', sans-serif",
      zIndex: 9999 
    }}>
      <div style={{ 
        background: 'white', 
        padding: '50px 40px', 
        borderRadius: '16px', 
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)', 
        maxWidth: '500px', 
        width: '90%', 
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        
        {/* UPDATED MAIN VISUAL: Your Logo inside the circle */}
        <div style={{ 
            background: '#eff6ff', // Keep light blue background for contrast
            padding: '30px', 
            borderRadius: '50%', 
            marginBottom: '25px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <img src={logo} alt="MBC Logo" style={{ width: '80px', height: 'auto' }} />
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '10px', color: '#111' }}>Check Your Email</h2>
        
        <p style={{ color: '#4b5563', lineHeight: '1.6', marginBottom: '30px', fontSize: '1rem' }}>
          We sent a verification link to:<br/>
          <strong style={{ color: '#111' }}>{auth.currentUser?.email}</strong>
        </p>

        <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '30px', background: '#f9fafb', padding: '10px', borderRadius: '8px', width: '100%' }}>
          Click the link in that email to activate your account.<br/>
          <span style={{ fontSize: '0.8rem' }}>(Don't see it? Check your Spam folder)</span>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
          <button 
            onClick={handleResend} 
            disabled={isSending}
            style={{ 
              background: 'black', 
              color: 'white', 
              border: 'none', 
              padding: '14px', 
              borderRadius: '8px', 
              cursor: isSending ? 'wait' : 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              width: '100%'
            }}
          >
            {isSending ? "Sending..." : "Resend Verification Email"}
          </button>

          <button 
            onClick={handleLogout} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#6b7280',
              padding: '10px', 
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.9rem'
            }}
          >
            ← Cancel & Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}