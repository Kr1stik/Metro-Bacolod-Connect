import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FaSpinner } from "react-icons/fa";

export default function AuthHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Grab the "mode" and the secret "oobCode" from the URL Firebase created
    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");

    // If the link is broken or missing data, send them home
    if (!mode || !oobCode) {
      navigate("/");
      return;
    }

    // 2. Traffic Controller Logic: Read the mode and redirect to the correct custom page!
    if (mode === "resetPassword") {
      navigate(`/reset-password?oobCode=${oobCode}`);
    } else if (mode === "verifyEmail") {
      navigate(`/verify-success?oobCode=${oobCode}`);
    } else {
      navigate("/"); // Fallback for anything else
    }
  }, [searchParams, navigate]);

  // A brief loading screen while the redirect happens (usually takes 0.1 seconds)
  return (
    <div style={{ 
      height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', 
      justifyContent: 'center', background: '#f3f4f6', fontFamily: "'Google Sans', sans-serif" 
    }}>
      <FaSpinner className="spin" size={30} color="#111827" />
      <span style={{ marginLeft: '12px', fontSize: '1rem', color: '#374151', fontWeight: 600 }}>
        Securely routing you...
      </span>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}