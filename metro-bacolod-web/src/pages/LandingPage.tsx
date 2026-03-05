import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, signOut, sendPasswordResetEmail, getMultiFactorResolver, TotpMultiFactorGenerator } from "firebase/auth";
import { auth, googleProvider, db } from "../firebase-config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { FcGoogle } from "react-icons/fc";
import { FaTimes, FaChevronDown } from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import mbcLogoNoBg from "../assets/MBC Logo No Background (1).png";
import Antigravity from "../components/Antigravity"; 
import TextType from "../components/TextType"; 
import ScrollFloat from "../components/ScrollFloat";
import { glassToast } from '../components/GlassToast';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showTags, setShowTags] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  
  // --- NEW: Forgot Password State ---
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  const navigate = useNavigate();

  const timelineRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const progressLineRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  const handleTypingComplete = () => {
    setShowTags(true);
    if (tagsRef.current) {
      gsap.fromTo(tagsRef.current.children,
        { opacity: 0, y: 20, scale: 0.8 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.7)' }
      );
    }
  };

  useEffect(() => {
    if (!timelineRef.current || !dotRef.current || !progressLineRef.current) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: timelineRef.current,
        start: 'top center',
        end: 'bottom center',
        scrub: 0.3,
      }
    });

    tl.to(dotRef.current, { top: '100%', ease: 'none' }, 0);
    tl.to(progressLineRef.current, { height: '100%', ease: 'none' }, 0);

    // Float-in animations for each card row
    const rightRows = timelineRef.current.querySelectorAll('.timeline-row-right');
    const leftRows = timelineRef.current.querySelectorAll('.timeline-row-left');

    rightRows.forEach((row) => {
      gsap.fromTo(row, 
        { opacity: 0, x: 80 },
        { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: row, start: 'top 85%', end: 'top 55%', scrub: 1.4 }
        }
      );
    });

    leftRows.forEach((row) => {
      gsap.fromTo(row, 
        { opacity: 0, x: -80 },
        { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: row, start: 'top 85%', end: 'top 55%', scrub: 1.4 }
        }
      );
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

  // Navbar morph on scroll past hero
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setNavScrolled(!entry.isIntersecting),
      { threshold: 0.05 }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  const closeLogin = () => {
    setShowLogin(false);
    setEmail("");
    setPassword("");
    setIsForgotPassword(false); // Reset to default view when closed
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); 

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        await signOut(auth); 
        glassToast.error("Login failed: Email not verified. Please check your inbox.");
        return; 
      }

      // 1. Check if user profile exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Check if account is deactivated
        if (userData.isDeactivated) {
          await signOut(auth);
          glassToast.error("This account has been deactivated. Contact support.");
          return;
        }

        // Close modal and route based on role
        setShowLogin(false);
        if (userData.role === "Admin") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
        
      } else {
        // 🚀 Brand new user -> send to profile setup!
        setShowLogin(false);
        glassToast.info("Please complete your profile.");
        navigate("/complete-profile");
      }

    } catch (error: any) {
      if (error.code === 'auth/multi-factor-auth-required') {
        // Handle 2FA challenge
        try {
          const resolver = getMultiFactorResolver(auth, error);
          const totpHint = resolver.hints.find((h: any) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
          if (!totpHint) { glassToast.error("Unsupported 2FA method."); return; }

          const { value: code } = await import('sweetalert2').then(m => m.default.fire({
            title: 'Two-Factor Authentication',
            html: '<p style="color:#6b7280;font-size:0.85rem;">Enter the 6-digit code from your authenticator app.</p>',
            input: 'text',
            inputPlaceholder: '000000',
            inputAttributes: { maxlength: '6', pattern: '[0-9]*', inputmode: 'numeric', autocomplete: 'one-time-code' },
            showCancelButton: true,
            confirmButtonColor: '#111827',
            confirmButtonText: 'Verify',
            inputValidator: (val) => { if (!val || val.length !== 6 || !/^\d{6}$/.test(val)) return 'Enter a valid 6-digit code'; },
          }));
          if (!code) return;

          const assertion = TotpMultiFactorGenerator.assertionForSignIn(totpHint.uid, code);
          await resolver.resolveSignIn(assertion);
          navigate("/dashboard");
        } catch (mfaError: any) {
          glassToast.error(mfaError.code === 'auth/invalid-verification-code' ? 'Invalid verification code.' : 'Verification failed.');
        }
      } else if (error.code === 'auth/invalid-credential') {
        glassToast.error("Incorrect email or password.");
      } else {
        glassToast.error("Login failed. Please try again.");
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const gUser = result.user;

      // Check if user doc exists
      const userDocRef = doc(db, "users", gUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Existing user — check if deactivated
        if (userDoc.data().isDeactivated) {
          await signOut(auth);
          glassToast.error("This account has been deactivated. Contact support.");
          return;
        }

        // Existing user with no role yet → send to complete profile
        if (!userDoc.data().role) {
          navigate("/complete-profile");
          return;
        }

        if (userDoc.data().role === "Admin") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      } else {
        // New Google user — create a minimal user doc so Admin dashboard sees them immediately
        const nameParts = (gUser.displayName || "").split(" ");
        await setDoc(userDocRef, {
          uid: gUser.uid,
          email: gUser.email,
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          photoURL: gUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(gUser.displayName || "U")}&rounded=true`,
          createdAt: new Date().toISOString(),
        });

        // Redirect to complete-profile to finish setup (role selection, etc.)
        navigate("/complete-profile");
      }
    } catch (error: any) {
      glassToast.error("Google login failed");
    }
  };

  // --- NEW: Handle Password Reset ---
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return glassToast.error("Please enter your email address first.");
    
    try {
      await sendPasswordResetEmail(auth, email);
      glassToast.success("Password reset link sent to your email!");
      setIsForgotPassword(false); // Send them back to the login screen
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        glassToast.error("No account found with this email.");
      } else {
        glassToast.error("Failed to send reset email. Check your address.");
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', minHeight: '100vh', overflowX: 'hidden', fontFamily: "'Inter', sans-serif", background: 'linear-gradient(135deg, #e8ecf1 0%, #d6dce5 25%, #e2dfd8 50%, #dde4e0 75%, #e8ecf1 100%)' }}>
      
      {/* Ambient blobs */}
      <div className="info-blob info-blob-1" />
      <div className="info-blob info-blob-2" />
      <div className="info-blob info-blob-3" />

      {/* NAVBAR — Floating Island */}
      <nav className={`floating-nav${navScrolled ? ' floating-nav--scrolled' : ''}`}>
        <div className="floating-nav__inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
              <img src={logo} alt="Logo" style={{ width: '40px', height: 'auto' }} />
              <div className="nav-links" style={{ display: 'flex', gap: '30px' }}>
                  {['Properties', 'Professionals', 'Services', 'Resources'].map((item) => (
                      <a key={item} href={`/${item.toLowerCase()}`} className="nav-link-item floating-nav__link" style={{ textDecoration: 'none', position: 'relative' }}>{item}</a>
                  ))}
              </div>
          </div>
          <div className="nav-buttons" style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowLogin(true)} className="floating-nav__btn floating-nav__btn--outline">LOGIN</button>
              <button onClick={() => navigate('/register')} className="floating-nav__btn floating-nav__btn--filled">CREATE ACCOUNT</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section ref={heroRef} className="landing-hero" style={{ minHeight: '110vh', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '80px 20px 0', position: 'relative' }}>
        <Antigravity count={300} color="#1d1d1f" particleSize={0.6} />
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 6rem)', fontWeight: '700', color: '#1d1d1f', lineHeight: '1.1', marginBottom: '30px', letterSpacing: '-2px', zIndex: 2 }}>
           <TextType 
             text={["Metro Bacolod \n Connect."]} 
             typingSpeed={100} 
             deletingSpeed={50} 
             loop={false} 
             showCursor={true} 
             cursorCharacter="|" 
             onSentenceComplete={handleTypingComplete}
           />
        </h1>
        {showTags && (
          <div ref={tagsRef} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center', zIndex: 2 }}>
            {['Connect', 'Verify', 'Close'].map(tag => (
              <span key={tag} style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)', color: '#374151', padding: '8px 24px', borderRadius: '25px', fontSize: '0.85rem', fontWeight: '600', opacity: 0, border: '1px solid rgba(255,255,255,0.5)' }}>{tag}</span>
            ))}
          </div>
        )}

        {/* CTA Button with rotating border */}
        {showTags && (
          <div className="cta-rotating-border" style={{ marginTop: '210px', zIndex: 2 }}>
            <button
              onClick={() => navigate('/register')}
              className="cta-find-home"
            >
              Find Your Next Home
            </button>
          </div>
        )}

        {/* Scroll down arrow */}
        {showTags && (
          <div
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            style={{
              position: 'absolute',
              bottom: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 2,
              cursor: 'pointer',
              animation: 'bounceArrow 2s infinite',
            }}
          >
            <FaChevronDown style={{ fontSize: '1.4rem', color: '#1d1d1f', opacity: 0.5 }} />
          </div>
        )}
      </section>

      {/* EXPLORE SECTION */}
      <section className="landing-explore" style={{ padding: '100px 8%', textAlign: 'center' }}>
        <ScrollFloat
          animationDuration={1}
          ease='back.inOut(2)'
          scrollStart='center bottom+=50%'
          scrollEnd='bottom bottom-=40%'
          stagger={0.03}
          containerClassName='landing-explore-title'
        >
          EXPLORE
        </ScrollFloat>

        {/* Timeline container */}
        <div ref={timelineRef} className="explore-timeline" style={{ position: 'relative', maxWidth: '1000px', margin: '60px auto 0', paddingBottom: '40px' }}>
          
          {/* Vertical line track */}
          <div className="timeline-track" style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: '#d1d5db', transform: 'translateX(-50%)' }}>
            {/* Progress fill */}
            <div ref={progressLineRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '0%', background: '#6b7280', borderRadius: '1px' }} />
            {/* Scrolling dot */}
            <div ref={dotRef} style={{ position: 'absolute', top: '0%', left: '50%', transform: 'translate(-50%, -50%)', width: '14px', height: '14px', borderRadius: '50%', background: '#9ca3af', boxShadow: '0 0 6px rgba(0,0,0,0.15)', zIndex: 2 }} />
          </div>

          {/* Card 1 – View Lands (RIGHT) */}
          <div className="timeline-row timeline-row-right" style={{ display: 'flex', justifyContent: 'flex-end', paddingLeft: '55%', marginBottom: '80px', position: 'relative' }}>
            <div className="timeline-card" style={{ textAlign: 'center', maxWidth: '380px' }}>
              <img src="/images/view_lands.jpeg" alt="Green grass field landscape" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '20px', marginBottom: '20px', border: '2px solid #3f3f3f', display: 'block' }} />
              <span className="explore-btn" style={{ display: 'inline-block', padding: '6px 24px', border: '2px solid #333', borderRadius: '50px', fontSize: '1rem', fontWeight: '700', color: '#1d1d1f', marginBottom: '12px', cursor: 'pointer', transition: 'all 0.3s ease' }}>View Lands</span>
              <p style={{ fontSize: '0.9rem', color: 'rgba(0,0,0,0.5)', lineHeight: '1.6', marginTop: '8px' }}>
                Discover available lots in prime locations. Browse land options with complete details to help you choose the perfect place to build or invest.
              </p>
            </div>
          </div>

          {/* Card 2 – See Homes (LEFT) */}
          <div className="timeline-row timeline-row-left" style={{ display: 'flex', justifyContent: 'flex-start', paddingRight: '55%', marginBottom: '80px', position: 'relative' }}>
            <div className="timeline-card" style={{ textAlign: 'center', maxWidth: '380px' }}>
              <img src="/images/see_homes.jpeg" alt="Aerial shot of a neighborhood" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '20px', marginBottom: '20px', border: '2px solid #3f3f3f', display: 'block' }} />
              <span className="explore-btn" style={{ display: 'inline-block', padding: '6px 24px', border: '2px solid #333', borderRadius: '50px', fontSize: '1rem', fontWeight: '700', color: '#1d1d1f', marginBottom: '12px', cursor: 'pointer', transition: 'all 0.3s ease' }}>See Homes</span>
              <p style={{ fontSize: '0.9rem', color: 'rgba(0,0,0,0.5)', lineHeight: '1.6', marginTop: '8px' }}>
                Explore ready-to-move and pre-selling homes. View layouts, photos, and features to find a home that fits your lifestyle and budget.
              </p>
            </div>
          </div>

          {/* Card 3 – Contact Agents (RIGHT) */}
          <div className="timeline-row timeline-row-right" style={{ display: 'flex', justifyContent: 'flex-end', paddingLeft: '55%', position: 'relative' }}>
            <div className="timeline-card" style={{ textAlign: 'center', maxWidth: '380px' }}>
              <img src="/images/contact_agent.jpg" alt="Smiling agent holding keys with clients" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '20px', marginBottom: '20px', border: '2px solid #3f3f3f', display: 'block' }} />
              <span className="explore-btn" style={{ display: 'inline-block', padding: '6px 24px', border: '2px solid #333', borderRadius: '50px', fontSize: '1rem', fontWeight: '700', color: '#1d1d1f', marginBottom: '12px', cursor: 'pointer', transition: 'all 0.3s ease' }}>Contact Agents</span>
              <p style={{ fontSize: '0.9rem', color: 'rgba(0,0,0,0.5)', lineHeight: '1.6', marginTop: '8px' }}>
                Connect with trusted property agents for expert guidance. Get answers, schedule visits, and receive help every step of the way.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="landing-about" style={{ padding: '100px 8%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '60px', flexWrap: 'wrap' }}>
          <div className="about-text" style={{ flex: 1, minWidth: '300px' }}>
             <ScrollFloat
               animationDuration={1}
               ease='back.inOut(2)'
               scrollStart='center bottom+=50%'
               scrollEnd='bottom bottom-=40%'
               stagger={0.03}
               containerClassName='landing-about-title'
             >
               Here at MBC we...
             </ScrollFloat>
             <div style={{ fontSize: '1rem', color: 'rgba(0,0,0,0.5)', lineHeight: '1.8', maxWidth: '550px', marginTop: '25px' }}>
               <p style={{ marginBottom: '12px' }}>
                 Connect people to the best land and homes across Metro Bacolod. Our goal is to make property searching simple and accessible for everyone, whether you’re buying your first home, investing in land, or exploring new opportunities in the area.
               </p>

               <p style={{ marginBottom: '12px' }}>
                 We bring together verified listings, clear and reliable information, and trusted real estate agents in one easy-to-use platform. By removing confusion and guesswork, we help you compare options confidently and focus on what truly matters—finding the right property for your needs.
               </p>

               <p style={{ marginBottom: 0 }}>
                 At MetroBacolodConnect, we believe real estate decisions should feel informed, secure, and stress-free. That’s why we’re committed to building a platform that connects communities, supports smart choices, and guides you every step of the way.
               </p>
             </div>
          </div>
          <div className="about-image" style={{ flex: 1, minWidth: '300px', display: 'flex', justifyContent: 'center' }}>
             <img
               src={mbcLogoNoBg}
               alt="Metro Bacolod Connect Logo"
               style={{ width: '100%', maxWidth: '420px', height: '420px', objectFit: 'contain' }}
             />
          </div>
      </section>

      {/* =========================================
          PREMIUM CENTERED LOGIN MODAL (GLASSMORPHISM)
          ========================================= */}
      {showLogin && (
        <div 
          className="modal-overlay" 
          onClick={(e) => {
            if (e.target === e.currentTarget) { setShowLogin(false); setIsForgotPassword(false); }
          }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <style>{`
            @keyframes modalPopIn {
              0% { opacity: 0; transform: scale(0.95) translateY(10px); }
              100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes fadeIn {
              0% { opacity: 0; }
              100% { opacity: 1; }
            }
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
            }
            .premium-btn-primary:hover {
              background: #1f2937; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.2);
            }
            .premium-btn-google {
              width: 100%; padding: 14px; border-radius: 14px; background: white; color: #374151;
              font-size: 0.95rem; font-weight: 600; font-family: 'Google Sans', sans-serif; border: 1.5px solid #e5e7eb;
              cursor: pointer; transition: all 0.2s ease; display: flex; alignItems: center; justifyContent: center; gap: 10px;
            }
            .premium-btn-google:hover {
              background: #f9fafb; border-color: #d1d5db; transform: translateY(-1px);
            }
            .link-text { color: #6b7280; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: color 0.2s; }
            .link-text:hover { color: #111827; }
            .link-text-bold { color: #111827; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
            .link-text-bold:hover { opacity: 0.7; }
          `}</style>

          <div 
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
              padding: '40px 36px', borderRadius: '28px', width: '100%', maxWidth: '420px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.5) inset',
              animation: 'modalPopIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)', position: 'relative', textAlign: 'left'
            }}
          >
            {/* Close Button */}
            <button 
              onClick={() => { setShowLogin(false); setIsForgotPassword(false); }}
              style={{ position: 'absolute', top: '20px', right: '20px', background: '#f3f4f6', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', transition: '0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.color = '#111827'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}
            >
              <FaTimes size={14} />
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <img src={logo} alt="MBC Logo" style={{ width: '56px', height: '56px', objectFit: 'contain', marginBottom: '16px' }} />
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 8px 0', color: '#111827', fontFamily: "'Google Sans', sans-serif", letterSpacing: '-0.5px' }}>
                {isForgotPassword ? "Reset Password" : "Welcome Back"}
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#6b7280', margin: 0, lineHeight: '1.5' }}>
                {isForgotPassword ? "Enter your email to receive a reset link." : "Please enter your details to sign in."}
              </p>
            </div>

            {isForgotPassword ? (
              // --- FORGOT PASSWORD VIEW ---
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Email Address</label>
                  <input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="premium-input" required />
                </div>
                <button type="submit" className="premium-btn-primary" style={{ marginTop: '8px' }}>Send Reset Link</button>
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <span className="link-text" onClick={() => setIsForgotPassword(false)}>← Back to Sign In</span>
                </div>
              </form>
            ) : (
              // --- LOGIN VIEW ---
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Email Address</label>
                  <input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="premium-input" required />
                </div>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Password</label>
                    <span className="link-text" onClick={() => setIsForgotPassword(true)}>Forgot password?</span>
                  </div>
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="premium-input" required />
                </div>

                <button type="submit" className="premium-btn-primary" style={{ marginTop: '8px' }}>Sign In</button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.5px' }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
                </div>

                <button type="button" onClick={handleGoogleLogin} className="premium-btn-google">
                  <FcGoogle size={20} /> Continue with Google
                </button>

                {/* Sign Up Redirect */}
                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                    Don't have an account? <span className="link-text-bold" onClick={() => { setShowLogin(false); navigate('/register'); }}>Sign up</span>
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="landing-footer" style={{ background: '#000', color: '#fff', padding: '60px 8%', borderTop: '1px solid #333' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px', maxWidth: '1200px', margin: '0 auto', marginBottom: '40px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>About</h3>
            <p style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: '1.6' }}>
              Metro Bacolod Connect is a SaaS-enabled Real Estate Marketplace connecting you with PRC-Verified Licensed Professionals.
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>Quick Links</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '10px' }}><a href="/properties" style={{ color: '#ccc', textDecoration: 'none', transition: '0.2s' }}>Properties</a></li>
              <li style={{ marginBottom: '10px' }}><a href="/professionals" style={{ color: '#ccc', textDecoration: 'none', transition: '0.2s' }}>Professionals</a></li>
              <li style={{ marginBottom: '10px' }}><a href="/resources" style={{ color: '#ccc', textDecoration: 'none', transition: '0.2s' }}>Resources</a></li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px' }}>Contact</h3>
            <p style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '10px' }}>Email: cosdevsph@outlook.ph</p>
            <p style={{ fontSize: '0.9rem', color: '#ccc' }}>Phone: (+63) 9085608811</p>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #333', paddingTop: '30px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', color: '#999', margin: 0 }}>
            &copy; 2026 Cosdevs. All rights reserved.
          </p>
        </div>
      </footer>

      {/* --- MOBILE RESPONSIVE CSS INJECTION --- */}
      <style>{`
        /* Hero button animations */
        .hero-btn {
          position: relative;
          overflow: hidden;
        }
        .hero-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }
        .hero-btn:hover::before {
          width: 300px;
          height: 300px;
        }
        .hero-btn-outline:hover {
          background: #1d1d1f !important;
          color: #fff !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }
        .hero-btn-filled:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.5) !important;
        }

        /* Navbar link underline animation */
        .nav-link-item::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 2px;
          background: #1d1d1f;
          transition: width 0.3s ease;
        }
        .nav-link-item:hover::after {
          width: 100%;
        }
        .nav-link-item:hover {
          opacity: 1 !important;
        }

        /* Explore button hover effects */
        .explore-btn:hover {
          background-color: #000 !important;
          color: #fff !important;
          transform: scale(1.05);
          box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        }

        /* Timeline card image hover */
        .timeline-card img {
          transition: transform 0.4s ease, box-shadow 0.4s ease;
        }
        .timeline-card img:hover {
          transform: scale(1.03);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }

        @media (max-width: 768px) {
            /* 1. Navbar Adjustments */
            .landing-nav {
                padding: 20px !important;
            }
            .nav-links {
                display: none !important; /* Hide text links on mobile */
            }
            .nav-buttons button {
                padding: 10px 20px !important;
                font-size: 0.8rem !important;
            }
            
            /* 2. Hero Section Adjustments */
            .landing-hero {
                padding-top: 80px !important; /* Prevent overlap with fixed nav */
            }

            /* 3. About Section Stacking */
            .landing-about {
                flex-direction: column-reverse !important; /* Image top, text bottom */
                padding: 60px 20px !important;
                gap: 40px !important;
            }
            .about-text, .about-image {
                width: 100% !important;
                min-width: 0 !important;
                text-align: center;
                justify-content: center !important;
            }
            .about-text p {
                margin: 0 auto; /* Center paragraph */
            }

            /* 4. Modal Adjustments */
            .modal-card {
                width: 90% !important;
                padding: 25px !important;
            }

            /* 5. Footer Adjustments */
            .landing-footer {
                padding: 40px 20px !important;
            }
            .landing-footer h3 {
                font-size: 1rem !important;
            }

            /* 6. Timeline / Explore Section */
            .timeline-track {
                left: 20px !important;
                transform: none !important;
            }
            .timeline-row-right,
            .timeline-row-left {
                padding-left: 50px !important;
                padding-right: 0 !important;
                justify-content: flex-start !important;
            }
            .timeline-card {
                max-width: 100% !important;
            }
        }
      `}</style>

    </div>
  );
}