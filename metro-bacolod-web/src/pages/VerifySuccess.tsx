import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { applyActionCode } from "firebase/auth";
import { auth } from "../firebase-config";
import { FaCheckCircle, FaTimesCircle, FaSpinner } from "react-icons/fa";
import logo from "../assets/MBC Logo.png"; // Adjust path if needed

export default function VerifySuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  
  // 🔥 THE FIX: This ref prevents React Strict Mode from verifying twice!
  const hasAttempted = useRef(false);

  useEffect(() => {
    // If we already tried verifying, stop immediately.
    if (hasAttempted.current) return;
    
    const oobCode = searchParams.get('oobCode');

    if (!oobCode) {
      setStatus('error');
      return;
    }

    // Lock it so it can't run again
    hasAttempted.current = true;

    // Tell Firebase to verify the code
    applyActionCode(auth, oobCode)
      .then(() => {
        setStatus('success');
      })
      .catch((error) => {
        console.error("Verification failed:", error);
        setStatus('error');
      });
  }, [searchParams]);

  return (
    <div className="dashboard-revamp" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="profile-blob profile-blob-1" />
      <div className="profile-blob profile-blob-2" />

      <div style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', padding: '50px 40px', borderRadius: '24px', width: '100%', maxWidth: '450px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', zIndex: 10, textAlign: 'center' }}>
        <img src={logo} alt="Logo" style={{ width: '60px', marginBottom: '20px' }} />

        {status === 'loading' && (
          <div>
            <FaSpinner className="spin" size={40} color="#111827" style={{ margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>Verifying...</h2>
            <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>Please wait while we verify your email address.</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <FaCheckCircle size={56} color="#10b981" style={{ margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#111827', margin: '0 0 10px 0' }}>Email Verified!</h2>
            <p style={{ color: '#374151', fontSize: '0.95rem', marginBottom: '30px' }}>
              Your email address has been successfully verified. You can now sign in to your account.
            </p>
            <button 
              onClick={() => navigate('/')}
              style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: '#111827', color: '#fff', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}
            >
              Go to Login Page
            </button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <FaTimesCircle size={56} color="#ef4444" style={{ margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#111827', margin: '0 0 10px 0' }}>Verification Failed</h2>
            <p style={{ color: '#374151', fontSize: '0.95rem', marginBottom: '30px' }}>
              The verification link is invalid or has expired. Please try registering or logging in again to request a new link.
            </p>
            <button 
              onClick={() => navigate('/')}
              style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1.5px solid #d1d5db', background: 'transparent', color: '#374151', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.3s ease' }}
            >
              Return to Homepage
            </button>
          </div>
        )}

      </div>
    </div>
  );
}