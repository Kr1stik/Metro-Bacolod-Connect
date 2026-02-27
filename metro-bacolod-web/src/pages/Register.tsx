import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } from "firebase/auth";
import { auth, db } from "../firebase-config";
import { doc, setDoc } from "firebase/firestore";
import { glassToast } from '../components/GlassToast';
import logo from "../assets/MBC Logo.png"; 
import { BACOLOD_LOCATIONS } from "../constants/locations";
import { FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle } from "react-icons/fa"; 

export default function Register() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FORM STATE ---
  const [isSeller, setIsSeller] = useState(false); // Replaces the PRC Checkbox
  
  // Personal
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState(""); 
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  
  // Contact
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  
  // Address
  const [street, setStreet] = useState("");
  const [city, setCity] = useState(""); 
  const [province, setProvince] = useState("Negros Occidental");
  const zipCode = "6100";

  // Security
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); 
  const [prcLicenseNo, setPrcLicenseNo] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // --- RANDOM ID GENERATOR ---
  // Generates IDs like "SELR-X4F9A2" or "CLNT-M7V1Q8"
  const generateRandomId = (role: string) => {
    const prefix = role === "Seller" ? "SELR" : "CLNT";
    const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase(); 
    return `${prefix}-${randomChars}`;
  };

  const handleMiddleInitial = (e: any) => {
    let val = e.target.value.toUpperCase();
    if (val.length === 1 && /^[A-Z]$/.test(val)) {
        val = val + "."; 
    }
    if (val.length <= 2) {
        setMiddleInitial(val);
    }
  };

  const handleMobile = (e: any) => {
    const val = e.target.value.replace(/\D/g, ''); 
    if (val.length <= 10) {
        setMobile(val);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return glassToast.error("Passwords do not match!");
    if (!city) return glassToast.error("Please select a City/Barangay.");
    if (mobile.length !== 10) return glassToast.error("Mobile number must be 10 digits (excluding +63).");
    if (!acceptedTerms) return glassToast.error("You must accept the Terms of Service and Privacy Policy.");

    setIsSubmitting(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Determine role based on the checkbox!
      const accountRole = isSeller ? "Seller" : "Client";
      const customId = generateRandomId(accountRole);
      const fullMobile = `+63${mobile}`; 

      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`,
        photoURL: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`
      });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: accountRole, // "Seller" or "Client"
        customId: customId, // "SELR-123456" or "CLNT-123456"
        firstName, 
        middleName: middleInitial, 
        lastName,
        dob, gender, maritalStatus, 
        mobile: fullMobile,
        address: city, 
        fullAddress: { street, city, province, zipCode },
        ...(isSeller && prcLicenseNo.trim() ? { prcLicenseNo: prcLicenseNo.trim() } : {}),
        termsAcceptedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      await sendEmailVerification(user);
      
      await signOut(auth);
      glassToast.success(`Account created! Please verify your email.`);
      setTimeout(() => navigate("/verify-email"), 1500);

    } catch (error: any) {
        console.error(error);
        glassToast.error(error.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- PASSWORD STRENGTH (M12) ---
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };
  const pwdStrength = getPasswordStrength(password);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

  const isMatch = password && confirmPassword && password === confirmPassword;
  const isMismatch = password && confirmPassword && password !== confirmPassword;

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', overflowY: 'auto', backgroundColor: '#ffffff', fontFamily: "'Inter', sans-serif", zIndex: 9999, color: '#111' }}>
      
      {/* HEADER */}
      <div style={{ width: '100%', padding: '15px 5%', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'white', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={logo} alt="Logo" style={{ width: '40px' }} />
          <div><h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#111' }}>Create Account</h2></div>
        </div>
        <button onClick={() => navigate('/')} style={{ background: 'transparent', border: '1px solid #e5e7eb', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: '#111' }}>
            Cancel
        </button>
      </div>

      {/* BODY */}
      <div className="register-card" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '40px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '10px', color: '#111' }}>Join Metro Bacolod Connect</h1>
            <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>Create your account to start browsing or listing properties.</p>
          </div>

          <section style={{ marginBottom: '40px' }}>
            <h4 style={sectionHeaderStyle}>Personal Details</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group" style={{ flex: '2 1 200px' }}><label style={labelStyle}>First Name *</label><input required type="text" style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. Juan" /></div>
                <div className="form-group" style={{ flex: '1 1 80px' }}><label style={labelStyle}>M.I.</label><input type="text" style={{...inputStyle, textAlign: 'center'}} value={middleInitial} onChange={handleMiddleInitial} placeholder="M." maxLength={2} /></div>
                <div className="form-group" style={{ flex: '2 1 200px' }}><label style={labelStyle}>Last Name *</label><input required type="text" style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Dela Cruz" /></div>
            </div>
            <div style={grid3Style}>
                <div className="form-group" style={{ position: 'relative' }}><label style={labelStyle}>Date of Birth *</label><input required type="date" style={inputStyle} value={dob} onChange={e => setDob(e.target.value)} className="custom-date-input" /></div>
                <div className="form-group"><label style={labelStyle}>Gender *</label><select required style={inputStyle} value={gender} onChange={e => setGender(e.target.value)}><option value="" disabled>Select Gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Prefer not to say">Prefer not to say</option></select></div>
                <div className="form-group"><label style={labelStyle}>Marital Status *</label><select required style={inputStyle} value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)}><option value="" disabled>Select Status</option><option value="Single">Single</option><option value="Married">Married</option><option value="Widowed">Widowed</option><option value="Separated">Separated</option></select></div>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '30px 0' }} />

          <section style={{ marginBottom: '40px' }}>
            <h4 style={sectionHeaderStyle}>Address & Contact</h4>
            <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Mobile Number *</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
                    <span style={{ background: '#f3f4f6', padding: '12px 15px', color: '#374151', fontWeight: '600', borderRight: '1px solid #d1d5db' }}>+63</span>
                    <input required type="tel" value={mobile} onChange={handleMobile} placeholder="917 123 4567" style={{ border: 'none', outline: 'none', padding: '12px', width: '100%', fontSize: '1rem', color: '#000000', background: 'transparent' }} />
                </div>
            </div>
            <div style={{ marginBottom: '20px' }}><label style={labelStyle}>Street / Block / Lot *</label><input required type="text" style={inputStyle} value={street} onChange={e => setStreet(e.target.value)} placeholder="e.g. Lacson Street" /></div>
            <div style={grid3Style}>
                <div className="form-group"><label style={labelStyle}>City / Barangay *</label><select required style={inputStyle} value={city} onChange={e => setCity(e.target.value)}><option value="" disabled>Select Location</option>{BACOLOD_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></div>
                <div className="form-group"><label style={labelStyle}>Province</label><input type="text" style={{...inputStyle, background: '#f9fafb', color: '#6b7280'}} value={province} readOnly /></div>
                <div className="form-group"><label style={labelStyle}>Postal Code</label><input type="text" style={{...inputStyle, background: '#f9fafb', color: '#6b7280', cursor: 'not-allowed'}} value="6100" readOnly /></div>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '30px 0' }} />

          <section style={{ marginBottom: '40px' }}>
             <h4 style={sectionHeaderStyle}>Account Security</h4>
             <div style={grid3Style}>
                <div className="form-group"><label style={labelStyle}>Email Address *</label><input required type="email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
                <div className="form-group" style={{ position: 'relative' }}>
                    <label style={labelStyle}>Password *</label>
                    <input required type={showPassword ? "text" : "password"} style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                    <div onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '38px', cursor: 'pointer', color: '#6b7280' }}>{showPassword ? <FaEyeSlash /> : <FaEye />}</div>
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                    <label style={labelStyle}>Confirm Password *</label>
                    <input required type={showPassword ? "text" : "password"} style={{...inputStyle, borderColor: isMatch ? '#10B981' : isMismatch ? '#EF4444' : '#d1d5db'}} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                    {isMatch && <FaCheckCircle style={{ position: 'absolute', right: '12px', top: '40px', color: '#10B981' }} />}
                    {isMismatch && <FaTimesCircle style={{ position: 'absolute', right: '12px', top: '40px', color: '#EF4444' }} />}
                </div>
             </div>
             {isMismatch && <p style={{ color: '#EF4444', fontSize: '0.85rem', marginTop: '-15px', textAlign: 'right' }}>Passwords do not match</p>}
             {password && (
               <div style={{ marginTop: '-10px' }}>
                 <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                   {[1,2,3,4,5].map(i => (
                     <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i <= pwdStrength ? strengthColors[pwdStrength] : '#e5e7eb', transition: '0.3s' }} />
                   ))}
                 </div>
                 <p style={{ fontSize: '0.78rem', color: strengthColors[pwdStrength], fontWeight: '600', margin: 0 }}>{strengthLabels[pwdStrength]}</p>
               </div>
             )}
          </section>

          {/* --- NEW CHECKBOX FOR SELLERS --- */}
          <div style={{ marginBottom: '40px', background: '#f9fafb', padding: '15px', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
             <input type="checkbox" id="sellerCheck" checked={isSeller} onChange={e => setIsSeller(e.target.checked)} style={{ width: '22px', height: '22px', accentColor: 'black', marginTop: '3px', cursor: 'pointer' }} />
             <div>
                <label htmlFor="sellerCheck" style={{ fontWeight: '700', fontSize: '1rem', cursor: 'pointer', display: 'block', color: '#111' }}>I want to sell properties</label>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Check this box if you intend to post listings and connect with buyers.</span>
             </div>
          </div>
          {isSeller && (
            <div style={{ marginBottom: '40px', marginTop: '-20px' }}>
              <label style={labelStyle}>PRC License Number (optional)</label>
              <input type="text" style={inputStyle} value={prcLicenseNo} onChange={e => setPrcLicenseNo(e.target.value)} placeholder="e.g. 0012345" />
              <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '6px' }}>Enter your PRC license number for verification badge.</p>
            </div>
          )}

          {/* Terms and Privacy Acceptance */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                style={{ marginTop: '4px', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.85rem', color: '#374151', lineHeight: '1.4' }}>
                I agree to the{' '}
                <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '600' }} onClick={(e) => { e.preventDefault(); navigate('/terms-of-service'); }}>Terms of Service</span>
                {' '}and{' '}
                <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '600' }} onClick={(e) => { e.preventDefault(); navigate('/privacy-policy'); }}>Privacy Policy</span>
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '50px' }}>
             <button type="submit" disabled={isSubmitting || !acceptedTerms} style={{ padding: '15px 60px', borderRadius: '50px', border: 'none', background: 'black', color: 'white', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', opacity: (isSubmitting || !acceptedTerms) ? 0.7 : 1, boxShadow: '0 4px 15px rgba(0,0,0,0.2)', width: '100%' }}>
               {isSubmitting ? "Creating Account..." : "Complete Registration"}
             </button>
          </div>
        </form>
      </div>

    </div>
  );
}

const sectionHeaderStyle = { margin: '0 0 25px 0', color: '#111827', fontSize: '1.2rem', fontWeight: '700' };
const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' };
const inputStyle = { width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem', outline: 'none', transition: '0.2s', background: '#ffffff', color: '#000000' };
const grid3Style = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px', marginBottom: '20px' };