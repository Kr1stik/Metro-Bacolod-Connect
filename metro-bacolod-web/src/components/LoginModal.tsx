import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import { FcGoogle } from 'react-icons/fc';
import { FaTimes } from 'react-icons/fa';
import { glassToast } from './GlassToast';

interface LoginModalProps {
  onClose: () => void;
}

/**
 * Shared Login Modal
 * Used across LandingPage, Properties, Professionals, Services, Resources
 */
export default function LoginModal({ onClose }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        await signOut(auth);
        glassToast.error('Email not verified. Please check your inbox.');
        return;
      }
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists() && userDoc.data()?.isDeactivated) {
        await signOut(auth);
        glassToast.error('Your account has been deactivated. Contact support.');
        return;
      }
      onClose();
      navigate('/dashboard');
    } catch {
      glassToast.error('Login failed. Check your credentials.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (userDoc.exists() && userDoc.data()?.isDeactivated) {
        await signOut(auth);
        glassToast.error('Your account has been deactivated. Contact support.');
        return;
      }
      onClose();
      navigate('/dashboard');
    } catch {
      glassToast.error('Google sign-in failed.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Welcome Back</h2>
          <FaTimes style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>
        <form onSubmit={handleLogin}>
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
          />
          <input
            required
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '8px', borderRadius: '8px', border: '1px solid #ddd' }}
          />
          <div style={{ textAlign: 'right', marginBottom: '15px' }}>
            <span
              style={{ color: '#2563eb', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}
              onClick={async () => {
                if (!email) {
                  glassToast.error('Enter your email first.');
                  return;
                }
                try {
                  await sendPasswordResetEmail(auth, email);
                  glassToast.success('Password reset email sent! Check your inbox.');
                } catch {
                  glassToast.error('Failed to send reset email. Check the email address.');
                }
              }}
            >
              Forgot Password?
            </span>
          </div>
          <button
            type="submit"
            className="primary-btn"
            style={{ width: '100%', marginBottom: '15px', background: 'black', color: 'white' }}
          >
            Sign In
          </button>
        </form>
        <button
          type="button"
          className="primary-btn"
          style={{
            width: '100%',
            background: 'white',
            color: 'black',
            border: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
          }}
          onClick={handleGoogleLogin}
        >
          <FcGoogle size={20} /> Sign in with Google
        </button>
        <p style={{ marginTop: '20px', fontSize: '0.9rem' }}>
          No account?{' '}
          <span
            style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '600' }}
            onClick={() => {
              onClose();
              navigate('/register');
            }}
          >
            Create Account
          </span>
        </p>
      </div>
    </div>
  );
}
