import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { glassToast } from '../components/GlassToast';
import logo from "../assets/MBC Logo.png"; 
import { BACOLOD_LOCATIONS } from "../constants/locations";
import { FaCheckCircle, FaIdCard, FaCertificate, FaUser, FaImage, FaSpinner } from "react-icons/fa";

export default function CompleteProfile() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ROLE STATE ---
  const [selectedRole, setSelectedRole] = useState<"Client" | "Seller" | "Agent">("Client");
  
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState(""); 
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [mobile, setMobile] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState(""); 
  const [prcLicenseNo, setPrcLicenseNo] = useState("");
  const province = "Negros Occidental";

  // Privacy toggles for Seller/Agent contact info visibility
  const [showPhone, setShowPhone] = useState(true);
  const [showEmail, setShowEmail] = useState(true);

  // Agent: PRC ID upload (front + back)
  const [prcFrontFile, setPrcFrontFile] = useState<File | null>(null);
  const [prcFrontPreview, setPrcFrontPreview] = useState<string>("");
  const [prcBackFile, setPrcBackFile] = useState<File | null>(null);
  const [prcBackPreview, setPrcBackPreview] = useState<string>("");
  const prcFrontInputRef = useRef<HTMLInputElement>(null);
  const prcBackInputRef = useRef<HTMLInputElement>(null);

  // Seller: Gov ID upload (front + back)
  const [govIdFrontFile, setGovIdFrontFile] = useState<File | null>(null);
  const [govIdFrontPreview, setGovIdFrontPreview] = useState<string>("");
  const [govIdBackFile, setGovIdBackFile] = useState<File | null>(null);
  const [govIdBackPreview, setGovIdBackPreview] = useState<string>("");
  const [isUploadingId, setIsUploadingId] = useState(false);
  const govIdFrontInputRef = useRef<HTMLInputElement>(null);
  const govIdBackInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate("/"); return; }
      if (user.displayName) {
        const nameParts = user.displayName.split(" ");
        setFirstName(nameParts[0] || "");
        if (nameParts.length > 1) {
          setLastName(nameParts.slice(1).join(" "));
        }
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data().role) {
        navigate("/dashboard");
      }
    });
    return () => unsub();
  }, [navigate]);

  const generateRandomId = (role: string) => {
    const prefix = role === "Seller" ? "SELR" : role === "Agent" ? "AGNT" : "CLNT";
    const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase(); 
    return `${prefix}-${randomChars}`;
  };

  const handleMobile = (e: any) => {
    const val = e.target.value.replace(/\D/g, ''); 
    if (val.length <= 10) setMobile(val);
  };

  const handleIdFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (s: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { glassToast.error("File too large. Max 10MB."); return; }
    if (!file.type.startsWith("image/")) { glassToast.error("Only image files are allowed."); return; }
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
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
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
    } catch { console.warn("OCR extraction failed (non-blocking)"); return ""; }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city) return glassToast.error("Please select a City/Barangay.");
    if (mobile.length !== 10) return glassToast.error("Mobile number must be 10 digits.");
    if (selectedRole === "Agent" && !prcLicenseNo.trim()) return glassToast.error("PRC License Number is required for Agents.");
    if (selectedRole === "Agent" && (!prcFrontFile || !prcBackFile)) return glassToast.error("Both front and back photos of your PRC ID are required.");
    if (selectedRole === "Seller" && (!govIdFrontFile || !govIdBackFile)) return glassToast.error("Both front and back photos of your Government ID are required.");

    const user = auth.currentUser;
    if (!user) return glassToast.error("No authenticated user found.");

    setIsSubmitting(true);

    try {
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

      const customId = generateRandomId(selectedRole);
      const fullMobile = `+63${mobile}`; 

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
        fullAddress: { street, city, province, zipCode: "6100" },
        isVerified: selectedRole === "Client",
        verificationStatus: selectedRole === "Client" ? "approved" : "pending",
        showPhone: selectedRole === "Client" ? true : showPhone,
        showEmail: selectedRole === "Client" ? true : showEmail,
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
        createdAt: new Date().toISOString()
      }, { merge: true });

      glassToast.success(`Profile complete! Welcome to MBC.`);
      navigate("/dashboard");

    } catch (error: any) {
        console.error(error);
        setIsUploadingId(false);
        glassToast.error("Failed to complete profile.");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', overflowY: 'auto', backgroundColor: '#ffffff', fontFamily: "'Inter', sans-serif", zIndex: 9999, color: '#111' }}>
      <div style={{ width: '100%', padding: '15px 5%', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'white', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={logo} alt="Logo" style={{ width: '40px' }} />
          <div><h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>Complete Setup</h2></div>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <form onSubmit={handleCompleteProfile}>
          <div style={{ marginBottom: '40px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '10px' }}>Almost there!</h1>
            <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>Since you signed in with Google, we just need a few more details.</p>
          </div>

          <section style={{ marginBottom: '40px' }}>
            <h4 style={sectionHeaderStyle}>Personal Details</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
                <div style={{ flex: '2 1 200px' }}><label style={labelStyle}>First Name *</label><input required type="text" style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
                <div style={{ flex: '1 1 80px' }}><label style={labelStyle}>M.I.</label><input type="text" style={{...inputStyle, textAlign: 'center'}} value={middleInitial} onChange={e => setMiddleInitial(e.target.value.toUpperCase())} maxLength={2} /></div>
                <div style={{ flex: '2 1 200px' }}><label style={labelStyle}>Last Name *</label><input required type="text" style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} /></div>
            </div>
            <div style={grid3Style}>
                <div><label style={labelStyle}>Date of Birth *</label><input required type="date" style={inputStyle} value={dob} onChange={e => setDob(e.target.value)} /></div>
                <div><label style={labelStyle}>Gender *</label><select required style={inputStyle} value={gender} onChange={e => setGender(e.target.value)}><option value="" disabled>Select Gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Prefer not to say">Prefer not to say</option></select></div>
                <div><label style={labelStyle}>Marital Status *</label><select required style={inputStyle} value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)}><option value="" disabled>Select Status</option><option value="Single">Single</option><option value="Married">Married</option><option value="Widowed">Widowed</option><option value="Separated">Separated</option></select></div>
            </div>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h4 style={sectionHeaderStyle}>Address & Contact</h4>
            <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Mobile Number *</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
                    <span style={{ background: '#f3f4f6', padding: '12px 15px', fontWeight: '600', borderRight: '1px solid #d1d5db' }}>+63</span>
                    <input required type="tel" value={mobile} onChange={handleMobile} placeholder="917 123 4567" style={{ border: 'none', outline: 'none', padding: '12px', width: '100%', fontSize: '1rem' }} />
                </div>
            </div>
            <div style={{ marginBottom: '20px' }}><label style={labelStyle}>Street / Block / Lot *</label><input required type="text" style={inputStyle} value={street} onChange={e => setStreet(e.target.value)} /></div>
            <div style={grid3Style}>
                <div><label style={labelStyle}>City / Barangay *</label><select required style={inputStyle} value={city} onChange={e => setCity(e.target.value)}><option value="" disabled>Select Location</option>{BACOLOD_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></div>
                <div><label style={labelStyle}>Province</label><input type="text" style={{...inputStyle, background: '#f9fafb', color: '#6b7280'}} value={province} readOnly /></div>
                <div><label style={labelStyle}>Postal Code</label><input type="text" style={{...inputStyle, background: '#f9fafb', color: '#6b7280'}} value="6100" readOnly /></div>
            </div>
          </section>

          {/* --- ROLE SELECTION --- */}
          <section style={{ marginBottom: '40px' }}>
            <h4 style={sectionHeaderStyle}>Account Type</h4>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '-15px', marginBottom: '20px' }}>
              Select what best describes you. Sellers and Agents require verification before posting listings.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {([
                { role: "Client" as const, icon: <FaUser size={20} />, title: "Client / Buyer", desc: "Browse listings and connect with sellers." },
                { role: "Seller" as const, icon: <FaIdCard size={20} />, title: "Property Seller", desc: "Post property listings. Requires a valid government-issued ID." },
                { role: "Agent" as const, icon: <FaCertificate size={20} />, title: "Licensed Agent", desc: "Post listings as a licensed broker. Requires PRC License." },
              ]).map(item => (
                <div key={item.role} onClick={() => setSelectedRole(item.role)} style={{
                  padding: '20px', borderRadius: '14px', cursor: 'pointer', transition: '0.2s',
                  border: selectedRole === item.role ? '2px solid #111827' : '2px solid #e5e7eb',
                  background: selectedRole === item.role ? '#f9fafb' : 'white',
                }}>
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
                Upload clear photos of both the <strong>front</strong> and <strong>back</strong> of a valid government-issued ID.
              </p>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
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
                Enter your PRC license number and upload clear photos of both the <strong>front</strong> and <strong>back</strong> of your PRC ID.
              </p>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>PRC License Number *</label>
                <input type="text" style={{ ...inputStyle, borderColor: '#93c5fd', background: 'white' }} value={prcLicenseNo} onChange={e => setPrcLicenseNo(e.target.value)} placeholder="e.g. 0012345" required />
              </div>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
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
                Choose whether to show your contact information on your public profile. Other users will still be able to message you.
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

          {/* Verification notice */}
          {(selectedRole === "Seller" || selectedRole === "Agent") && (
            <div style={{ marginBottom: '25px', background: '#fef3c7', padding: '14px 18px', borderRadius: '10px', border: '1px solid #fde68a', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <FaCheckCircle size={14} style={{ color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#92400e', lineHeight: '1.4' }}>
                <strong>Verification Required:</strong> Please allow up to <strong>24 hours</strong> for our admins to review your documents.
                You will receive an <strong>email notification</strong> once verification is complete.
              </p>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} style={{ padding: '15px 60px', borderRadius: '50px', border: 'none', background: 'black', color: 'white', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {isSubmitting ? (<>{isUploadingId ? <><FaSpinner className="spin" /> Uploading ID...</> : <><FaSpinner className="spin" /> Saving...</>}</>) : "Finish Setup"}
          </button>
        </form>
      </div>
    </div>
  );
}

const sectionHeaderStyle: React.CSSProperties = { margin: '0 0 25px 0', color: '#111827', fontSize: '1.2rem', fontWeight: '700' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem', outline: 'none' };
const grid3Style: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px', marginBottom: '20px' };