import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "../firebase-config";
import { FaEye, FaEyeSlash, FaCheckCircle, FaSpinner } from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import { glassToast } from "../components/GlassToast";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const code = searchParams.get("oobCode");
    if (!code) {
      glassToast.error("Invalid or expired reset link.");
      navigate("/");
      return;
    }

    // Verify the code is valid with Firebase before showing the form
    verifyPasswordResetCode(auth, code)
      .then(() => {
        setOobCode(code);
        setIsValidating(false);
      })
      .catch(() => {
        glassToast.error("This link has expired. Please request a new one.");
        navigate("/");
      });
  }, [searchParams, navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return glassToast.error("Passwords do not match!");
    if (newPassword.length < 6) return glassToast.error("Password must be at least 6 characters.");
    if (!oobCode) return;

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      glassToast.success("Password updated! You can now log in.");
      navigate("/");
    } catch (error: any) {
      glassToast.error("Failed to reset password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading Screen while verifying the code
  if (isValidating) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e8ecf1 0%, #d6dce5 25%, #e2dfd8 50%, #dde4e0 75%, #e8ecf1 100%)' }}>
        <FaSpinner className="spin" size={40} color="#111827" />
      </div>
    );
  }

  const isMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  return (
    <div style={{ 
      position: 'relative', 
      width: '100vw', 
      minHeight: '100vh', 
      overflowX: 'hidden', 
      fontFamily: "'Inter', sans-serif", 
      background: 'linear-gradient(135deg, #e8ecf1 0%, #d6dce5 25%, #e2dfd8 50%, #dde4e0 75%, #e8ecf1 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* Ambient background blobs matching Landing Page */}
      <div className="info-blob info-blob-1" />
      <div className="info-blob info-blob-2" />
      <div className="info-blob info-blob-3" />

      {/* Glassmorphism Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)', 
        backdropFilter: 'blur(30px)', 
        WebkitBackdropFilter: 'blur(30px)',
        padding: '40px 36px', 
        borderRadius: '28px', 
        width: '100%', 
        maxWidth: '420px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.5) inset',
        position: 'relative', 
        textAlign: 'left',
        zIndex: 10
      }}>
        
        {/* CSS inside component for smooth inputs */}
        <style>{`
          .premium-input {
            width: 100%; padding: 14px 16px; border-radius: 14px; border: 1.5px solid #e5e7eb;
            background: #f9fafb; font-size: 0.95rem; color: #111827; outline: none; transition: all 0.2s ease;
            font-family: 'Google Sans', sans-serif;
          }
          .premium-input:focus {
            border-color: #111827; background: #ffffff; box-shadow: 0 0 0 4px rgba(17, 24, 39, 0.08);
          }
          .premium-btn-primary {
            width: 100%; padding: 15px; border-radius: 14px; background: #111827; color: white;
            font-size: 0.95rem; font-weight: 700; font-family: 'Google Sans', sans-serif; border: none;
            cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 14px rgba(0,0,0,0.15);
            display: flex; align-items: center; justify-content: center; gap: 8px;
          }
          .premium-btn-primary:hover {
            background: #1f2937; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.2);
          }
          .premium-btn-primary:disabled {
            opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none;
          }
        `}</style>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src={logo} alt="MBC Logo" style={{ width: '56px', height: '56px', objectFit: 'contain', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 8px 0', color: '#111827', fontFamily: "'Google Sans', sans-serif", letterSpacing: '-0.5px' }}>
            Set New Password
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#6b7280', margin: 0, lineHeight: '1.5' }}>
            Your new password must be different from your previously used passwords.
          </p>
        </div>

        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>New Password</label>
            <input 
              required 
              type={showPassword ? "text" : "password"} 
              className="premium-input"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
            <div 
              onClick={() => setShowPassword(!showPassword)} 
              style={{ position: 'absolute', right: '16px', top: '40px', cursor: 'pointer', color: '#9ca3af' }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Confirm Password</label>
            <input 
              required 
              type={showPassword ? "text" : "password"} 
              className="premium-input"
              style={{ borderColor: isMatch ? '#10b981' : '' }}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
            {isMatch && (
              <FaCheckCircle style={{ position: 'absolute', right: '16px', top: '42px', color: '#10b981' }} />
            )}
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || !newPassword || !confirmPassword} 
            className="premium-btn-primary"
            style={{ marginTop: '8px' }}
          >
            {isSubmitting ? <><FaSpinner className="spin" /> Updating...</> : "Reset Password"}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '4px' }}>
             <span 
                style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s' }} 
                onClick={() => navigate('/')}
                onMouseOver={(e) => e.currentTarget.style.color = '#111827'}
                onMouseOut={(e) => e.currentTarget.style.color = '#6b7280'}
              >
               ← Back to Sign In
             </span>
          </div>
        </form>
      </div>
    </div>
  );
}