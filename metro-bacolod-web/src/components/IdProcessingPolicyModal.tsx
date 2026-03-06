import { useEffect } from "react";
import { FaShieldAlt, FaTimes } from "react-icons/fa";

interface IdProcessingPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IdProcessingPolicyModal({ isOpen, onClose }: IdProcessingPolicyModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: "16px", maxWidth: "600px", width: "100%",
          maxHeight: "80vh", overflowY: "auto", padding: "32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FaShieldAlt size={20} color="#2563eb" />
            <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: "800", color: "#111827" }}>
              ID Processing Policy
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "#6b7280", padding: "4px",
            }}
          >
            <FaTimes size={18} />
          </button>
        </div>

        <p style={{ fontSize: "0.85rem", color: "#6b7280", lineHeight: "1.6", marginBottom: "24px" }}>
          This policy explains how Metro Bacolod Connect handles your government-issued identification
          documents in compliance with the <strong>Philippine Data Privacy Act of 2012 (Republic Act No. 10173)</strong>.
        </p>

        {/* Why we need this */}
        <div style={{ marginBottom: "20px", padding: "16px", background: "#eff6ff", borderRadius: "10px", border: "1px solid #bfdbfe" }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", fontWeight: "700", color: "#1e40af" }}>
            Why We Need This
          </h4>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#1e3a5f", lineHeight: "1.6" }}>
            Metro Bacolod Connect requires a valid government or PRC ID strictly to verify your identity and
            professional status to <strong>prevent fraud</strong> on the platform. This ensures that all property
            listings come from verified, legitimate sellers and licensed agents.
          </p>
        </div>

        {/* How we handle it */}
        <div style={{ marginBottom: "20px", padding: "16px", background: "#f0fdf4", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", fontWeight: "700", color: "#166534" }}>
            How We Handle It
          </h4>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#14532d", lineHeight: "1.6" }}>
            Your ID image will be transmitted securely, encrypted at rest, and manually reviewed <strong>only
            by authorized verification personnel</strong>. Uploaded ID images are watermarked upon receipt
            to render them useless for identity theft if ever compromised.
          </p>
        </div>

        {/* Data Retention */}
        <div style={{ marginBottom: "24px", padding: "16px", background: "#fefce8", borderRadius: "10px", border: "1px solid #fde68a" }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", fontWeight: "700", color: "#854d0e" }}>
            Data Retention
          </h4>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#713f12", lineHeight: "1.6" }}>
            Once your agent or seller status is verified, the uploaded ID image will be <strong>immediately
            and permanently deleted</strong> from our servers. We retain only a verification flag, your license
            number (if applicable), and the date of verification. We do not sell or share your sensitive
            personal information with third parties.
          </p>
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 28px", borderRadius: "8px", border: "none",
              background: "#111827", color: "white", fontWeight: "600",
              fontSize: "0.9rem", cursor: "pointer",
            }}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
