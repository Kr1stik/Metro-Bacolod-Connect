import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, db } from "../firebase-config";
import { doc, getDoc } from "firebase/firestore";
import { FcGoogle } from "react-icons/fc";
import { FaTimes } from "react-icons/fa";
import logo from "../assets/MBC Logo.png";
import mbcVid from "../assets/MBC_Vid_Logo3d.mp4";
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
  const navigate = useNavigate();

  const timelineRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const progressLineRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);

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

  const closeLogin = () => {
    setShowLogin(false);
    setEmail("");
    setPassword("");
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

      // Check if account is deactivated
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().isDeactivated) {
        await signOut(auth);
        glassToast.error("This account has been deactivated. Contact support.");
        return;
      }

      navigate("/dashboard");
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
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

      // Check if this user exists in our Firestore database
      const userDocRef = doc(db, "users", gUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.isDeactivated) {
          await signOut(auth);
          glassToast.error("This account has been deactivated. Contact support.");
          return;
        }
        
        // If they exist but don't have a role assigned, they didn't finish setup!
        if (!data.role) {
          closeLogin();
          navigate("/complete-profile");
          return;
        }

        // They exist and have a role, send them to dashboard normally
        closeLogin();
        navigate("/dashboard");
      } else {
        // Brand new Google user! They need to complete the form.
        closeLogin();
        navigate("/complete-profile");
      }

    } catch (error: any) {
      glassToast.error("Google sign-in failed.");
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', minHeight: '100vh', overflowX: 'hidden', fontFamily: "'Inter', sans-serif", background: 'linear-gradient(135deg, #e8ecf1 0%, #d6dce5 25%, #e2dfd8 50%, #dde4e0 75%, #e8ecf1 100%)' }}>
      
      {/* Ambient blobs */}
      <div className="info-blob info-blob-1" />
      <div className="info-blob info-blob-2" />
      <div className="info-blob info-blob-3" />

      {/* NAVBAR */}
      <nav className="landing-nav" style={{ position: 'fixed', top: 0, left: 0, width: '100%', padding: '20px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50, background: 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
            <img src={logo} alt="Logo" style={{ width: '50px', height: 'auto' }} />
            <div className="nav-links" style={{ display: 'flex', gap: '30px' }}>
                {['Properties', 'Professionals', 'Services', 'Resources'].map((item) => (
                    <a key={item} href={`/${item.toLowerCase()}`} className="nav-link-item" style={{ color: '#1d1d1f', fontWeight: '600', fontSize: '0.9rem', opacity: 0.7, transition: '0.2s', textDecoration: 'none', position: 'relative' }}>{item}</a>
                ))}
            </div>
        </div>
        <div className="nav-buttons" style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => setShowLogin(true)} className="hero-btn hero-btn-outline" style={{ background: 'transparent', border: '1px solid #1d1d1f', color: '#1d1d1f', padding: '12px 35px', fontSize: '0.9rem', fontWeight: '700', borderRadius: '50px', cursor: 'pointer', transition: 'all 0.3s ease' }}>LOGIN</button>
            <button onClick={() => navigate('/register')} className="hero-btn hero-btn-filled" style={{ background: '#1d1d1f', color: 'white', padding: '12px 35px', fontSize: '0.9rem', fontWeight: '700', borderRadius: '50px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(0,0,0,0.25)', transition: 'all 0.3s ease' }}>CREATE ACCOUNT</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero" style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '80px 20px 0', position: 'relative' }}>
        <Antigravity count={300} color="#1d1d1f" particleSize={0.6} />
        {/* Adjusted clamp() lower bound to 2.5rem for mobile safety */}
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
              <img src="https://images.pexels.com/photos/3013440/pexels-photo-3013440.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Green grass field landscape" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '20px', marginBottom: '20px', border: '2px solid #3f3f3f', display: 'block' }} />
              <span className="explore-btn" style={{ display: 'inline-block', padding: '6px 24px', border: '2px solid #333', borderRadius: '50px', fontSize: '1rem', fontWeight: '700', color: '#1d1d1f', marginBottom: '12px', cursor: 'pointer', transition: 'all 0.3s ease' }}>View Lands</span>
              <p style={{ fontSize: '0.9rem', color: 'rgba(0,0,0,0.5)', lineHeight: '1.6', marginTop: '8px' }}>
                Discover available lots in prime locations. Browse land options with complete details to help you choose the perfect place to build or invest.
              </p>
            </div>
          </div>

          {/* Card 2 – See Homes (LEFT) */}
          <div className="timeline-row timeline-row-left" style={{ display: 'flex', justifyContent: 'flex-start', paddingRight: '55%', marginBottom: '80px', position: 'relative' }}>
            <div className="timeline-card" style={{ textAlign: 'center', maxWidth: '380px' }}>
              <img src="https://images.pexels.com/photos/9203777/pexels-photo-9203777.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Aerial shot of a neighborhood" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '20px', marginBottom: '20px', border: '2px solid #3f3f3f', display: 'block' }} />
              <span className="explore-btn" style={{ display: 'inline-block', padding: '6px 24px', border: '2px solid #333', borderRadius: '50px', fontSize: '1rem', fontWeight: '700', color: '#1d1d1f', marginBottom: '12px', cursor: 'pointer', transition: 'all 0.3s ease' }}>See Homes</span>
              <p style={{ fontSize: '0.9rem', color: 'rgba(0,0,0,0.5)', lineHeight: '1.6', marginTop: '8px' }}>
                Explore ready-to-move and pre-selling homes. View layouts, photos, and features to find a home that fits your lifestyle and budget.
              </p>
            </div>
          </div>

          {/* Card 3 – Contact Agents (RIGHT) */}
          <div className="timeline-row timeline-row-right" style={{ display: 'flex', justifyContent: 'flex-end', paddingLeft: '55%', position: 'relative' }}>
            <div className="timeline-card" style={{ textAlign: 'center', maxWidth: '380px' }}>
              <img src="https://images.pexels.com/photos/8112163/pexels-photo-8112163.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Smiling agent holding keys with clients" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '20px', marginBottom: '20px', border: '2px solid #3f3f3f', display: 'block' }} />
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
             <video
               src={mbcVid}
               autoPlay
               loop
               muted
               playsInline
               style={{ width: '100%', maxWidth: '500px', height: '400px', objectFit: 'cover', borderRadius: '20px' }}
             />
          </div>
      </section>

      {/* LOGIN MODAL */}
      {showLogin && (
        <div className="modal-overlay">
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Welcome Back</h2>
              <FaTimes style={{ cursor: 'pointer' }} onClick={closeLogin} />
            </div>
            
            <form onSubmit={handleLogin}>
                <input required type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                <input required type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ddd' }} />
                
                <button type="submit" className="primary-btn" style={{ width: '100%', marginBottom: '15px', background: 'black', color: 'white' }}>
                    Sign In
                </button>
            </form>

            <button type="button" className="primary-btn" style={{ width: '100%', background: 'white', color: 'black', border: '1px solid #ddd', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }} onClick={handleGoogleLogin}>
                <FcGoogle size={20} /> Sign in with Google
            </button>
            
            <p style={{ marginTop: '20px', fontSize: '0.9rem' }}>
                No account? 
                <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '600' }} onClick={() => { setShowLogin(false); navigate('/register'); }}>
                  Create Account
                </span>
            </p>
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
            <p style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '10px' }}>Email: info@metrobacolodconnect.com</p>
            <p style={{ fontSize: '0.9rem', color: '#ccc' }}>Phone: +63 (0)XX-XXX-XXXX</p>
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