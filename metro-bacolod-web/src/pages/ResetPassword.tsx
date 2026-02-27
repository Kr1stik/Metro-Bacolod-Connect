import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "../firebase-config";
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle } from "react-icons/fa";
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

  if (isValidating) {
    return (
      <div className="dashboard-revamp" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: '#000', borderRadius: '50%' }}></div>
      </div>
    );
  }

  return (
    <div className="dashboard-revamp" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="profile-blob profile-blob-1" />
      <div className="profile-blob profile-blob-2" />

      <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '450px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src={logo} alt="Logo" style={{ width: '60px', marginBottom: '15px' }} />
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#111', margin: 0 }}>New Password</h2>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '10px' }}>Create a secure password for your account.</p>
        </div>

        <form onSubmit={handleReset}>
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px', color: '#374151' }}>New Password</label>
            <input 
              required 
              type={showPassword ? "text" : "password"} 
              style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #d1d5db', outline: 'none', fontSize: '1rem' }} 
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
            <div 
              onClick={() => setShowPassword(!showPassword)} 
              style={{ position: 'absolute', right: '15px', top: '38px', cursor: 'pointer', color: '#9ca3af' }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </div>
          </div>

          <div style={{ marginBottom: '30px', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px', color: '#374151' }}>Confirm Password</label>
            <input 
              required 
              type={showPassword ? "text" : "password"} 
              style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #d1d5db', outline: 'none', fontSize: '1rem' }} 
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
            {newPassword && confirmPassword && newPassword === confirmPassword && (
              <FaCheckCircle style={{ position: 'absolute', right: '15px', top: '40px', color: '#10b981' }} />
            )}
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting} 
            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: '#000', color: '#fff', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.2)', transition: '0.2s' }}
          >
            {isSubmitting ? "Updating..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}