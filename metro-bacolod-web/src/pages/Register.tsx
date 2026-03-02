import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } from "firebase/auth";
import { auth, db } from "../firebase-config";
import { doc, setDoc } from "firebase/firestore";
import { glassToast } from '../components/GlassToast';
import logo from "../assets/MBC Logo.png"; 
import { BACOLOD_LOCATIONS } from "../constants/locations";
import { FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle, FaImage, FaSpinner, FaIdCard, FaCertificate, FaUser } from "react-icons/fa"; 

export default function Register() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ROLE STATE ---
  const [selectedRole, setSelectedRole] = useState<"Client" | "Seller" | "Agent">("Client");
  
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
  const [province] = useState("Negros Occidental");
  const zipCode = "6100";

  // Security
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); 
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Agent-specific
  const [prcLicenseNo, setPrcLicenseNo] = useState("");
  const [prcFrontFile, setPrcFrontFile] = useState<File | null>(null);
  const [prcFrontPreview, setPrcFrontPreview] = useState<string>("");
  const [prcBackFile, setPrcBackFile] = useState<File | null>(null);
  const [prcBackPreview, setPrcBackPreview] = useState<string>("");
  const prcFrontInputRef = useRef<HTMLInputElement>(null);
  const prcBackInputRef = useRef<HTMLInputElement>(null);

  // Seller-specific: Government ID upload (front + back)
  const [govIdFrontFile, setGovIdFrontFile] = useState<File | null>(null);
  const [govIdFrontPreview, setGovIdFrontPreview] = useState<string>("");
  const [govIdBackFile, setGovIdBackFile] = useState<File | null>(null);
  const [govIdBackPreview, setGovIdBackPreview] = useState<string>("");
  const [isUploadingId, setIsUploadingId] = useState(false);
  const govIdFrontInputRef = useRef<HTMLInputElement>(null);
  const govIdBackInputRef = useRef<HTMLInputElement>(null);

  // Privacy toggles for Seller/Agent contact info visibility
  const [showPhone, setShowPhone] = useState(true);
  const [showEmail, setShowEmail] = useState(true);

  // --- RANDOM ID GENERATOR ---
  const generateRandomId = (role: string) => {
    const prefix = role === "Seller" ? "SELR" : role === "Agent" ? "AGNT" : "CLNT";
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

  const handleIdFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (s: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      glassToast.error("File too large. Max 10MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      glassToast.error("Only image files are allowed.");
      return;
    }
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const uploadSingleImage = async (file: File): Promise<string> => {
    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!CLOUD_NAME || !UPLOAD_PRESET) throw new Error("Missing Cloudinary config.");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("cloud_name", CLOUD_NAME);
    
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST", body: formData,
    });
    const data = await res.json();
    if (!data.secure_url) throw new Error("Failed to upload image.");
    return data.secure_url;
  };

  const runOcr = async (imageUrl: string): Promise<string> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return "";
      const idToken = await currentUser.getIdToken();
      const API_URL = import.meta.env.VITE_API_URL || 'https://metro-bacolod-connect.onrender.com';
      const res = await fetch(`${API_URL}/ocr/extract`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ imageUrl }),
      });
      const data = await res.json();
      return data.text || "";
    } catch {
      console.warn("OCR extraction failed (non-blocking)");
      return "";
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return glassToast.error("Passwords do not match!");
    if (!city) return glassToast.error("Please select a City/Barangay.");
    if (mobile.length !== 10) return glassToast.error("Mobile number must be 10 digits (excluding +63).");
    if (!acceptedTerms) return glassToast.error("You must accept the Terms of Service and Privacy Policy.");

    // Role-specific validation
    if (selectedRole === "Agent" && !prcLicenseNo.trim()) {
      return glassToast.error("PRC License Number is required for Agents.");
    }
    if (selectedRole === "Agent" && (!prcFrontFile || !prcBackFile)) {
      return glassToast.error("Both front and back photos of your PRC ID are required.");
    }
    if (selectedRole === "Seller" && (!govIdFrontFile || !govIdBackFile)) {
      return glassToast.error("Both front and back photos of your Government ID are required.");
    }

    setIsSubmitting(true);

    try {
      // Upload ID photos
      let govIdFrontUrl = "";
      let govIdBackUrl = "";
      let govIdOcrText = "";
      let prcFrontUrl = "";
      let prcBackUrl = "";
      let prcOcrText = "";

      if (selectedRole === "Seller" && govIdFrontFile && govIdBackFile) {
        setIsUploadingId(true);
        const [frontUrl, backUrl] = await Promise.all([
          uploadSingleImage(govIdFrontFile),
          uploadSingleImage(govIdBackFile),
        ]);
        govIdFrontUrl = frontUrl;
        govIdBackUrl = backUrl;
        govIdOcrText = await runOcr(frontUrl);
        setIsUploadingId(false);
      }

      if (selectedRole === "Agent" && prcFrontFile && prcBackFile) {
        setIsUploadingId(true);
        const [frontUrl, backUrl] = await Promise.all([
          uploadSingleImage(prcFrontFile),
          uploadSingleImage(prcBackFile),
        ]);
        prcFrontUrl = frontUrl;
        prcBackUrl = backUrl;
        prcOcrText = await runOcr(frontUrl);
        setIsUploadingId(false);
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const customId = generateRandomId(selectedRole);
      const fullMobile = `+63${mobile}`; 

      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`,
        photoURL: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`
      });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: selectedRole,
        customId: customId,
        firstName, 
        middleInitial: middleInitial, 
        lastName,
        dob, gender, maritalStatus, 
        mobile: fullMobile,
        address: city, 
        fullAddress: { street, city, province, zipCode },
        // Verification status
        isVerified: selectedRole === "Client",
        verificationStatus: selectedRole === "Client" ? "approved" : "pending",
        // Privacy settings
        showPhone: selectedRole === "Client" ? true : showPhone,
        showEmail: selectedRole === "Client" ? true : showEmail,
        // Role-specific fields
        ...(selectedRole === "Agent" ? { 
          prcLicenseNo: prcLicenseNo.trim(),
          prcIdFrontUrl: prcFrontUrl,
          prcIdBackUrl: prcBackUrl,
          prcOcrText: prcOcrText,
        } : {}),
        ...(selectedRole === "Seller" ? { 
          governmentIdFrontUrl: govIdFrontUrl,
          governmentIdBackUrl: govIdBackUrl,
          governmentIdOcrText: govIdOcrText,
        } : {}),
        termsAcceptedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      await sendEmailVerification(user);
      
      await signOut(auth);
      glassToast.success(`Account created! Please verify your email.`);
      setTimeout(() => navigate("/verify-email"), 1500);

    } catch (error: any) {
        console.error(error);
        setIsUploadingId(false);
        glassToast.error(error.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- PASSWORD STRENGTH ---
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

          <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '30px 0' }} />

          {/* --- ROLE SELECTION --- */}
          <section style={{ marginBottom: '40px' }}>
            <h4 style={sectionHeaderStyle}>Account Type</h4>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '-15px', marginBottom: '20px' }}>
              Select what best describes you. Sellers and Agents require verification before posting listings.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {([
                { role: "Client" as const, icon: <FaUser size={20} />, title: "Client / Buyer", desc: "Browse listings and connect with sellers. Only phone and email required." },
                { role: "Seller" as const, icon: <FaIdCard size={20} />, title: "Property Seller", desc: "Post property listings. Requires a valid government-issued ID for verification." },
                { role: "Agent" as const, icon: <FaCertificate size={20} />, title: "Licensed Agent", desc: "Post listings as a licensed broker. Requires a valid PRC License Number." },
              ]).map(item => (
                <div
                  key={item.role}
                  onClick={() => setSelectedRole(item.role)}
                  style={{
                    padding: '20px', borderRadius: '14px', cursor: 'pointer', transition: '0.2s',
                    border: selectedRole === item.role ? '2px solid #111827' : '2px solid #e5e7eb',
                    background: selectedRole === item.role ? '#f9fafb' : 'white',
                    boxShadow: selectedRole === item.role ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ color: selectedRole === item.role ? '#111827' : '#9ca3af' }}>{item.icon}</span>
                    <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#111' }}>{item.title}</span>
                    {selectedRole === item.role && <FaCheckCircle size={14} style={{ color: '#10b981', marginLeft: 'auto' }} />}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', lineHeight: '1.4' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* --- SELLER: Government ID Upload (Front & Back) --- */}
          {selectedRole === "Seller" && (
            <section style={{ marginBottom: '40px', background: '#fffbeb', padding: '24px', borderRadius: '14px', border: '1px solid #fde68a' }}>
              <h4 style={{ ...sectionHeaderStyle, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaIdCard size={16} color="#d97706" /> Government-Issued ID *
              </h4>
              <p style={{ fontSize: '0.83rem', color: '#92400e', marginBottom: '16px', lineHeight: '1.5' }}>
                Upload clear photos of both the <strong>front</strong> and <strong>back</strong> of a valid government-issued ID 
                (e.g. Driver's License, Passport, PhilSys ID, SSS ID). This will be reviewed by our admins before you can post listings.
              </p>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {/* Front */}
                <div style={{ flex: '1 1 200px' }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: '700', color: '#92400e', marginBottom: '8px' }}>Front Side *</p>
                  {govIdFrontPreview ? (
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
                      <img src={govIdFrontPreview} alt="ID Front" style={{ maxWidth: '280px', maxHeight: '180px', borderRadius: '10px', border: '2px solid #e5e7eb', objectFit: 'cover' }} />
                      <button type="button" onClick={() => { setGovIdFrontFile(null); setGovIdFrontPreview(""); }}
                        style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      <p style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600', marginTop: '6px' }}><FaCheckCircle size={11} /> {govIdFrontFile?.name}</p>
                    </div>
                  ) : (
                    <button type="button" onClick={() => govIdFrontInputRef.current?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 24px', borderRadius: '10px', border: '2px dashed #d97706', background: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', color: '#92400e' }}>
                      <FaImage size={16} /> Upload Front
                    </button>
                  )}
                  <input type="file" ref={govIdFrontInputRef} hidden accept="image/*" onChange={(e) => handleIdFileSelect(e, setGovIdFrontFile, setGovIdFrontPreview)} />
                </div>
                {/* Back */}
                <div style={{ flex: '1 1 200px' }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: '700', color: '#92400e', marginBottom: '8px' }}>Back Side *</p>
                  {govIdBackPreview ? (
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
                      <img src={govIdBackPreview} alt="ID Back" style={{ maxWidth: '280px', maxHeight: '180px', borderRadius: '10px', border: '2px solid #e5e7eb', objectFit: 'cover' }} />
                      <button type="button" onClick={() => { setGovIdBackFile(null); setGovIdBackPreview(""); }}
                        style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      <p style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600', marginTop: '6px' }}><FaCheckCircle size={11} /> {govIdBackFile?.name}</p>
                    </div>
                  ) : (
                    <button type="button" onClick={() => govIdBackInputRef.current?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 24px', borderRadius: '10px', border: '2px dashed #d97706', background: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', color: '#92400e' }}>
                      <FaImage size={16} /> Upload Back
                    </button>
                  )}
                  <input type="file" ref={govIdBackInputRef} hidden accept="image/*" onChange={(e) => handleIdFileSelect(e, setGovIdBackFile, setGovIdBackPreview)} />
                </div>
              </div>
            </section>
          )}

          {/* --- AGENT: PRC License Number + Front & Back Photo --- */}
          {selectedRole === "Agent" && (
            <section style={{ marginBottom: '40px', background: '#eff6ff', padding: '24px', borderRadius: '14px', border: '1px solid #bfdbfe' }}>
              <h4 style={{ ...sectionHeaderStyle, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaCertificate size={16} color="#2563eb" /> PRC License Verification *
              </h4>
              <p style={{ fontSize: '0.83rem', color: '#1e40af', marginBottom: '16px', lineHeight: '1.5' }}>
                Enter your PRC license number and upload clear photos of both the <strong>front</strong> and <strong>back</strong> of your PRC ID card.
                This will be verified by our admins before you can post listings.
              </p>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>PRC License Number *</label>
                <input type="text" style={{ ...inputStyle, borderColor: '#93c5fd', background: 'white' }} value={prcLicenseNo} onChange={e => setPrcLicenseNo(e.target.value)} placeholder="e.g. 0012345" required />
              </div>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {/* Front */}
                <div style={{ flex: '1 1 200px' }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e40af', marginBottom: '8px' }}>PRC ID — Front Side *</p>
                  {prcFrontPreview ? (
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
                      <img src={prcFrontPreview} alt="PRC Front" style={{ maxWidth: '280px', maxHeight: '180px', borderRadius: '10px', border: '2px solid #e5e7eb', objectFit: 'cover' }} />
                      <button type="button" onClick={() => { setPrcFrontFile(null); setPrcFrontPreview(""); }}
                        style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      <p style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600', marginTop: '6px' }}><FaCheckCircle size={11} /> {prcFrontFile?.name}</p>
                    </div>
                  ) : (
                    <button type="button" onClick={() => prcFrontInputRef.current?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 24px', borderRadius: '10px', border: '2px dashed #2563eb', background: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', color: '#1e40af' }}>
                      <FaImage size={16} /> Upload Front
                    </button>
                  )}
                  <input type="file" ref={prcFrontInputRef} hidden accept="image/*" onChange={(e) => handleIdFileSelect(e, setPrcFrontFile, setPrcFrontPreview)} />
                </div>
                {/* Back */}
                <div style={{ flex: '1 1 200px' }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e40af', marginBottom: '8px' }}>PRC ID — Back Side *</p>
                  {prcBackPreview ? (
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
                      <img src={prcBackPreview} alt="PRC Back" style={{ maxWidth: '280px', maxHeight: '180px', borderRadius: '10px', border: '2px solid #e5e7eb', objectFit: 'cover' }} />
                      <button type="button" onClick={() => { setPrcBackFile(null); setPrcBackPreview(""); }}
                        style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      <p style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600', marginTop: '6px' }}><FaCheckCircle size={11} /> {prcBackFile?.name}</p>
                    </div>
                  ) : (
                    <button type="button" onClick={() => prcBackInputRef.current?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 24px', borderRadius: '10px', border: '2px dashed #2563eb', background: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', color: '#1e40af' }}>
                      <FaImage size={16} /> Upload Back
                    </button>
                  )}
                  <input type="file" ref={prcBackInputRef} hidden accept="image/*" onChange={(e) => handleIdFileSelect(e, setPrcBackFile, setPrcBackPreview)} />
                </div>
              </div>
            </section>
          )}

          {/* --- Privacy Settings for Seller/Agent --- */}
          {(selectedRole === "Seller" || selectedRole === "Agent") && (
            <section style={{ marginBottom: '40px', background: '#f0fdf4', padding: '24px', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
              <h4 style={{ ...sectionHeaderStyle, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaUser size={16} color="#16a34a" /> Contact Info Privacy
              </h4>
              <p style={{ fontSize: '0.83rem', color: '#166534', marginBottom: '16px', lineHeight: '1.5' }}>
                Choose whether to show your contact information on your public profile. Other users can still message you.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Show my phone number on my profile</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showEmail} onChange={(e) => setShowEmail(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Show my email address on my profile</span>
                </label>
              </div>
            </section>
          )}

          {/* Verification Notice for Sellers/Agents */}
          {(selectedRole === "Seller" || selectedRole === "Agent") && (
            <div style={{ marginBottom: '25px', background: '#fef3c7', padding: '14px 18px', borderRadius: '10px', border: '1px solid #fde68a', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <FaCheckCircle size={14} style={{ color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#92400e', lineHeight: '1.4' }}>
                <strong>Verification Required:</strong> Please allow up to <strong>24 hours</strong> for our admins to review and verify your submitted documents.
                You will receive an <strong>email notification</strong> once your verification is complete.
                In the meantime, you can still browse listings and message other users.
              </p>
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
                <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '600' }} onClick={(e) => { e.preventDefault(); navigate('/terms'); }}>Terms of Service</span>
                {' '}and{' '}
                <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '600' }} onClick={(e) => { e.preventDefault(); navigate('/privacy'); }}>Privacy Policy</span>
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '50px' }}>
             <button type="submit" disabled={isSubmitting || !acceptedTerms} style={{ padding: '15px 60px', borderRadius: '50px', border: 'none', background: 'black', color: 'white', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', opacity: (isSubmitting || !acceptedTerms) ? 0.7 : 1, boxShadow: '0 4px 15px rgba(0,0,0,0.2)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
               {isSubmitting ? (<>{isUploadingId ? <><FaSpinner className="spin" /> Uploading ID...</> : <><FaSpinner className="spin" /> Creating Account...</>}</>) : "Complete Registration"}
             </button>
          </div>
        </form>
      </div>

    </div>
  );
}

const sectionHeaderStyle: React.CSSProperties = { margin: '0 0 25px 0', color: '#111827', fontSize: '1.2rem', fontWeight: '700' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem', outline: 'none', transition: '0.2s', background: '#ffffff', color: '#000000' };
const grid3Style: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px', marginBottom: '20px' };