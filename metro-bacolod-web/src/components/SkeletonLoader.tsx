import React from "react";

const shimmerStyle: React.CSSProperties = {
  background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite",
  borderRadius: "8px",
};

// Inject keyframes once
const styleId = "skeleton-shimmer-style";
if (typeof document !== "undefined" && !document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;
  document.head.appendChild(style);
}

export function SkeletonCard({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", width: "100%" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ borderRadius: "16px", overflow: "hidden", border: "1px solid #e5e7eb", background: "rgba(255,255,255,0.6)" }}>
          <div style={{ ...shimmerStyle, height: "180px", borderRadius: "16px 16px 0 0" }} />
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ ...shimmerStyle, height: "16px", width: "70%" }} />
            <div style={{ ...shimmerStyle, height: "12px", width: "50%" }} />
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ ...shimmerStyle, height: "12px", width: "60px" }} />
              <div style={{ ...shimmerStyle, height: "12px", width: "60px" }} />
            </div>
            <div style={{ ...shimmerStyle, height: "20px", width: "100px", marginTop: "6px" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.4)" }}>
          <div style={{ ...shimmerStyle, width: "45px", height: "45px", borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ ...shimmerStyle, height: "14px", width: "40%" }} />
            <div style={{ ...shimmerStyle, height: "12px", width: "70%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "40px 20px" }}>
      <div style={{ ...shimmerStyle, width: "120px", height: "120px", borderRadius: "50%" }} />
      <div style={{ ...shimmerStyle, height: "20px", width: "200px" }} />
      <div style={{ ...shimmerStyle, height: "14px", width: "140px" }} />
      <div style={{ ...shimmerStyle, height: "14px", width: "250px", marginTop: "10px" }} />
    </div>
  );
}
