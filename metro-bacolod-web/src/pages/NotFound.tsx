import { useNavigate } from "react-router-dom";
import { FaHome, FaArrowLeft } from "react-icons/fa";
import logo from "../assets/MBC Logo.png";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="notfound-page">
      <div className="notfound-card">
        <img src={logo} alt="MBC Logo" className="notfound-logo" />
        <h1 className="notfound-code">404</h1>
        <h2 className="notfound-title">Page Not Found</h2>
        <p className="notfound-text">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="notfound-buttons">
          <button className="notfound-btn notfound-btn-primary" onClick={() => navigate("/")}>
            <FaHome size={14} /> Go Home
          </button>
          <button className="notfound-btn notfound-btn-outline" onClick={() => navigate(-1)}>
            <FaArrowLeft size={14} /> Go Back
          </button>
        </div>
      </div>

      <style>{`
        .notfound-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #e8ecf1 0%, #d6dce5 25%, #e2dfd8 50%, #dde4e0 75%, #e8ecf1 100%);
          font-family: 'Inter', sans-serif;
          padding: 20px;
        }
        .notfound-card {
          text-align: center;
          max-width: 480px;
          width: 100%;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 60px 40px;
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
        }
        .notfound-logo {
          width: 60px;
          height: auto;
          margin-bottom: 30px;
        }
        .notfound-code {
          font-size: 6rem;
          font-weight: 900;
          color: #111827;
          margin: 0;
          line-height: 1;
          letter-spacing: -4px;
        }
        .notfound-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #374151;
          margin: 10px 0 15px;
        }
        .notfound-text {
          color: #6b7280;
          font-size: 1rem;
          line-height: 1.6;
          margin-bottom: 35px;
        }
        .notfound-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .notfound-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 30px;
          border-radius: 50px;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }
        .notfound-btn-primary {
          background: #111827;
          color: white;
          box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        }
        .notfound-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.35);
        }
        .notfound-btn-outline {
          background: transparent;
          color: #374151;
          border: 1px solid #d1d5db;
        }
        .notfound-btn-outline:hover {
          background: #f3f4f6;
          transform: translateY(-2px);
        }
        @media (max-width: 480px) {
          .notfound-card { padding: 40px 25px; }
          .notfound-code { font-size: 4rem; }
          .notfound-buttons { flex-direction: column; }
          .notfound-btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
