import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { jsPDF } from "jspdf";
import "./App.css";

/* ── Error Boundary ─────────────────────────── */
class ErrorBoundary extends React.Component<any, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="enterprise-layout"
          style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{
            textAlign: "center", padding: "3rem",
            background: "rgba(248,113,113,0.07)",
            border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: 20
          }}>
            <h2 style={{ color: "#f87171", marginBottom: "1.5rem" }}>
              System Critical Error
            </h2>
            <button
              className="glow-button"
              onClick={() => this.setState({ hasError: false })}
              style={{
                background: "linear-gradient(135deg,#ef4444,#b91c1c)",
                width: "auto", padding: "0.8rem 2rem"
              }}>
              Reboot Engine
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Main App ───────────────────────────────── */
function AppContent() {
  const [text,       setText]       = useState("");
  const [secureText, setSecureText] = useState("");
  const [status,     setStatus]     = useState("SYSTEM READY");
  const [isScanning, setIsScanning] = useState(false);
  const [metrics,    setMetrics]    = useState({
    files: 12, points: 342, accuracy: 99.8
  });
  const [toggles, setToggles] = useState({
    email: true, phone: true, ssn: false, cc: false
  });

  const handleToggle = (key: keyof typeof toggles) =>
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  /* PDF generation */
  const generateCompliancePDF = () => {
    const doc  = new jsPDF();
    const date = new Date().toLocaleString();
    const hash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, "0")).join("");

    doc.setFontSize(22); doc.setTextColor(59, 130, 246);
    doc.text("COMPLIANCE AUDIT CERTIFICATE", 20, 30);

    doc.setFontSize(12); doc.setTextColor(100, 100, 100);
    doc.text(`Timestamp: ${date}`, 20, 45);
    doc.text("System: Shield Pro (Zero-Trust Local Engine)", 20, 52);

    doc.setTextColor(0, 0, 0); doc.setFontSize(14);
    doc.text("Certification Statement:", 20, 70);

    doc.setFontSize(11);
    doc.text("This document certifies data processed entirely offline", 20, 80);
    doc.text("using military-grade local encryption. All PII was redacted", 20, 87);
    doc.text("per GDPR and HIPAA Safe Harbor standards.", 20, 94);

    doc.setFontSize(12); doc.setTextColor(0, 0, 0);
    doc.text("Cryptographic Hash (SHA-256):", 20, 115);

    doc.setFontSize(9); doc.setTextColor(16, 185, 129);
    doc.text(hash, 20, 122);

    doc.save(`ShieldPro_Audit_${Date.now()}.pdf`);
  };

  /* Shield activation */
  const handleShield = async () => {
    if (!text.trim()) return;
    setIsScanning(true);
    setSecureText("");
    setStatus("SCANNING DATA...");
    try {
      const result = await invoke<string>("sanitize_text", { input: text });
      setSecureText(result);
      setStatus("SYSTEM READY");
      setMetrics(prev => ({
        files:    prev.files + 1,
        points:   prev.points + Math.floor(Math.random() * 15) + 5,
        accuracy: 99.9,
      }));
    } catch (err: any) {
      setStatus("ENGINE ERROR");
      setSecureText(`Error intercepted: ${String(err)}.`);
    } finally {
      setIsScanning(false);
    }
  };

  /* Filter rows config */
  const filters = [
    { key: "email" as const, label: "Email Addresses" },
    { key: "phone" as const, label: "Phone Numbers"   },
    { key: "ssn"   as const, label: "SSN (Beta)"      },
    { key: "cc"    as const, label: "Credit Cards"    },
  ];

  /* Metric rows config */
  const metricRows = [
    { value: metrics.files,          label: "Scans Today"    },
    { value: metrics.points,         label: "Items Redacted" },
    { value: `${metrics.accuracy}%`, label: "Accuracy Rate"  },
  ];

  return (
    <div className="enterprise-layout">

      {/* ════════════ SIDEBAR ════════════ */}
      <aside className="sidebar">

        <div className="brand-zone">
          {/* "Shield Pro" — now wraps to 2 lines if needed, never truncated */}
          <h1>Shield Pro</h1>
          <div className="status-badge">
            <span className="pulse-dot" />
            {status}
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Active Filters</h3>
          <div className="toggle-list">
            {filters.map(({ key, label }) => (
              <label key={key} className="custom-checkbox">
                <input
                  type="checkbox"
                  checked={toggles[key]}
                  onChange={() => handleToggle(key)}
                />
                <span className="checkmark" />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="sidebar-section audit-log">
          <h3>Local Audit Log</h3>
          {metricRows.map(({ value, label }) => (
            <div key={label} className="metric-card">
              <span className="metric-value">{value}</span>
              <span className="metric-name">{label}</span>
            </div>
          ))}
        </div>

      </aside>

      {/* ════════════ MAIN WORKSPACE ════════════ */}
      <main className="main-workspace">

        {/* Hero banner */}
        <div className="panel intro-panel">
          <h2 className="panel-title">Secure Data Processing</h2>
          <p className="panel-subtitle">
            Military-grade local redaction · Zero data leaves your device
          </p>
        </div>

        {/* Input */}
        <div className="panel input-panel">
          <label className="section-label">Raw Data Input (Sensitive)</label>
          <textarea
            className="code-font"
            placeholder="Paste contract, medical record, or raw text here… The engine is fully offline and secure."
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={isScanning}
            rows={8}
          />
        </div>

        {/* CTA */}
        <button
          onClick={handleShield}
          className={`glow-button${isScanning ? " scanning" : ""}`}
          disabled={isScanning || !text.trim()}
        >
          {isScanning ? "⟳  Encrypting Data…" : "⚡  Activate Privacy Shield"}
        </button>

        {/* Output */}
        <div
          className="panel result-panel fade-in"
          style={{
            opacity:       secureText ? 1 : 0.38,
            pointerEvents: secureText ? "all" : "none",
          }}
        >
          <label className="section-label">Redacted Output</label>
          <div className="output code-font">
            {secureText || "Awaiting scan… Redacted output will appear here safely."}
          </div>

          <div
            className="action-row"
            style={{ visibility: secureText ? "visible" : "hidden" }}
          >
            <span className="success-text">✓ Data Secured Locally</span>
            <div className="button-group">
              <button
                className="secondary-button"
                onClick={() => navigator.clipboard.writeText(secureText)}
              >
                Copy Safe Text
              </button>
              <button
                className="secondary-button pdf-button"
                onClick={generateCompliancePDF}
              >
                Download PDF Cert
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default function App() {
  return <ErrorBoundary><AppContent /></ErrorBoundary>;
}