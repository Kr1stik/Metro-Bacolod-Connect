import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { glassToast } from '../components/GlassToast';
import logo from "../assets/MBC Logo.png"; 
import { BACOLOD_LOCATIONS } from "../constants/locations";

export default function CompleteProfile() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FORM STATE ---
  const [isSeller, setIsSeller] = useState(false); 
  
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

  useEffect(() => {
    // 1. Pull their name from their Google Account automatically!
    const user = auth.currentUser;
    if (user && user.displayName) {
      const nameParts = user.displayName.split(" ");
      setFirstName(nameParts[0] || "");
      if (nameParts.length > 1) {
        setLastName(nameParts.slice(1).join(" "));
      }
    }

    // 2. Safety check: if they somehow navigated here but already have a profile, kick them to dashboard
    if (user) {
        getDoc(doc(db, "users", user.uid)).then(snap => {
            if (snap.exists() && snap.data().role) {
                navigate("/dashboard");
            }
        });
    }
  }, [navigate]);

  const generateRandomId = (role: string) => {
    const prefix = role === "Seller" ? "SELR" : "CLNT";
    const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase(); 
    return `${prefix}-${randomChars}`;
  };

  const handleMobile = (e: any) => {
    const val = e.target.value.replace(/\D/g, ''); 
    if (val.length <= 10) setMobile(val);
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city) return glassToast.error("Please select a City/Barangay.");
    if (mobile.length !== 10) return glassToast.error("Mobile number must be 10 digits.");

    const user = auth.currentUser;
    if (!user) return glassToast.error("No authenticated user found.");

    setIsSubmitting(true);

    try {
      const accountRole = isSeller ? "Seller" : "Client";
      const customId = generateRandomId(accountRole);
      const fullMobile = `+63${mobile}`; 

      // Save to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: accountRole, 
        customId: customId,
        firstName, 
        middleName: middleInitial, 
        lastName,
        dob, gender, maritalStatus, 
        mobile: fullMobile,
        address: city, 
        fullAddress: { street, city, province, zipCode: "6100" },
        ...(isSeller && prcLicenseNo.trim() ? { prcLicenseNo: prcLicenseNo.trim() } : {}),
        createdAt: new Date().toISOString()
      }, { merge: true }); // Merge ensures we don't overwrite anything Google created

      glassToast.success(`Profile complete! Welcome to MBC.`);
      navigate("/dashboard");

    } catch (error: any) {
        console.error(error);
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

          <div style={{ marginBottom: '40px', background: '#f9fafb', padding: '15px', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
             <input type="checkbox" id="sellerCheck" checked={isSeller} onChange={e => setIsSeller(e.target.checked)} style={{ width: '22px', height: '22px', cursor: 'pointer' }} />
             <div>
                <label htmlFor="sellerCheck" style={{ fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>I want to sell properties</label>
                <span style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block' }}>Check this box if you intend to post listings and connect with buyers.</span>
             </div>
          </div>
          {isSeller && (
            <div style={{ marginBottom: '40px', marginTop: '-20px' }}>
              <label style={labelStyle}>PRC License Number (optional)</label>
              <input type="text" style={inputStyle} value={prcLicenseNo} onChange={e => setPrcLicenseNo(e.target.value)} placeholder="e.g. 0012345" />
              <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '6px' }}>Enter your PRC license number for verification badge.</p>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} style={{ padding: '15px 60px', borderRadius: '50px', border: 'none', background: 'black', color: 'white', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', width: '100%' }}>
            {isSubmitting ? "Saving..." : "Finish Setup"}
          </button>
        </form>
      </div>
    </div>
  );
}

const sectionHeaderStyle = { margin: '0 0 25px 0', color: '#111827', fontSize: '1.2rem', fontWeight: '700' };
const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' };
const inputStyle = { width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem', outline: 'none' };
const grid3Style = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px', marginBottom: '20px' };