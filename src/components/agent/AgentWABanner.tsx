"use client";

export default function AgentWABanner() {
  return (
    <a 
      href="https://chat.whatsapp.com/HfRqUhN3CXu98k4qFsMfsY?mode=gi_t"
      target="_blank"
      rel="noopener noreferrer"
      className="agent-wa-banner"
      style={{
        textDecoration: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "20px",
        padding: "24px 28px",
        borderRadius: "20px",
        background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
        boxShadow: "0 10px 25px -5px rgba(37, 211, 102, 0.4)",
        color: "white",
        cursor: "pointer",
        flexWrap: "wrap",
        transition: "all 0.2s ease",
      }}
    >
      <style jsx>{`
        .agent-wa-banner:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px -5px rgba(37, 211, 102, 0.5) !important;
        }
        .agent-wa-banner:active {
          transform: translateY(0);
        }
      `}</style>
      
      <div style={{ display: "flex", gap: "18px", alignItems: "center" }}>
        <div style={{
          width: "52px",
          height: "52px",
          background: "rgba(255,255,255,0.2)",
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "28px",
        }}>
          💬
        </div>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>Join Grup WA Agen</h3>
          <p style={{ fontSize: "14px", margin: "4px 0 0", opacity: 0.9 }}>
            Terhubung dengan tim pusat dan sesama Agen MbaKasir di Indonesia.
          </p>
        </div>
      </div>
      <div style={{
        background: "white",
        color: "#128C7E",
        padding: "10px 20px",
        borderRadius: "99px",
        fontWeight: 800,
        fontSize: "14px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
        Gabung Sekarang 
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
    </a>
  );
}
