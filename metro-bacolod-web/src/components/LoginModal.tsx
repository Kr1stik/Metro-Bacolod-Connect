import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, signOut, sendPasswordResetEmail, getMultiFactorResolver, TotpMultiFactorGenerator } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase-config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
    } catch (error: any) {
      if (error.code === 'auth/multi-factor-auth-required') {
        try {
          const resolver = getMultiFactorResolver(auth, error);
          const totpHint = resolver.hints.find((h: any) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
          if (!totpHint) { glassToast.error('Unsupported 2FA method.'); return; }
          const Swal = (await import('sweetalert2')).default;
          const { value: code } = await Swal.fire({
            title: 'Two-Factor Authentication',
            html: '<p style="color:#6b7280;font-size:0.85rem;">Enter the 6-digit code from your authenticator app.</p>',
            input: 'text', inputPlaceholder: '000000',
            inputAttributes: { maxlength: '6', pattern: '[0-9]*', inputmode: 'numeric', autocomplete: 'one-time-code' },
            showCancelButton: true, confirmButtonColor: '#111827', confirmButtonText: 'Verify',
            inputValidator: (val) => { if (!val || val.length !== 6 || !/^\d{6}$/.test(val)) return 'Enter a valid 6-digit code'; },
          });
          if (!code) return;
          const assertion = TotpMultiFactorGenerator.assertionForSignIn(totpHint.uid, code);
          await resolver.resolveSignIn(assertion);
          onClose();
          navigate('/dashboard');
        } catch (mfaError: any) {
          glassToast.error(mfaError.code === 'auth/invalid-verification-code' ? 'Invalid code.' : 'Verification failed.');
        }
      } else {
        glassToast.error('Login failed. Check your credentials.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const gUser = result.user;
      const userDocRef = doc(db, 'users', gUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        if (userDocSnap.data()?.isDeactivated) {
          await signOut(auth);
          glassToast.error('Your account has been deactivated. Contact support.');
          return;
        }
        if (!userDocSnap.data()?.role) {
          onClose();
          navigate('/complete-profile');
          return;
        }
        onClose();
        navigate('/dashboard');
      } else {
        // New Google user — create a minimal doc so Admin dashboard auto-updates
        const nameParts = (gUser.displayName || '').split(' ');
        await setDoc(userDocRef, {
          uid: gUser.uid,
          email: gUser.email,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          photoURL: gUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(gUser.displayName || 'U')}&rounded=true`,
          createdAt: new Date().toISOString(),
        });
        onClose();
        navigate('/complete-profile');
      }
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
