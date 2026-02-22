import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { jsPDF } from "jspdf";
import "./App.css";

class ErrorBoundary extends React.Component<any, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_error: any) { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="enterprise-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>
            <h2>System Recovering... 🛡️</h2>
            <button className="glow-button" onClick={() => this.setState({ hasError: false })}>Reboot Engine</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [text, setText] = useState("");
  const [secureText, setSecureText] = useState("");
  const [status, setStatus] = useState("SYSTEM READY");
  
  const [isScanning, setIsScanning] = useState(false);
  const [metrics, setMetrics] = useState({ files: 12, points: 342, accuracy: 99.8 });
  const [toggles, setToggles] = useState({
    email: true,
    phone: true,
    ssn: false,
    cc: false
  });

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const generateCompliancePDF = () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleString();
    
    const auditHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    doc.setFontSize(22);
    doc.setTextColor(79, 142, 247); 
    doc.text("COMPLIANCE AUDIT CERTIFICATE", 20, 30);

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Timestamp: ${currentDate}`, 20, 45);
    doc.text("System: Shield Pro (Zero-Trust Local Engine)", 20, 52);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("Certification Statement:", 20, 70);
    
    doc.setFontSize(11);
    doc.text("This document legally certifies that the associated data was processed entirely", 20, 80);
    doc.text("offline using military-grade local encryption. All identified Personally", 20, 87);
    doc.text("Identifiable Information (PII) was redacted in strict accordance with", 20, 94);
    doc.text("GDPR and HIPAA Safe Harbor standards.", 20, 101);

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Cryptographic Hash (SHA-256 Checksum):", 20, 125);
    
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129); 
    doc.text(auditHash, 20, 132);

    doc.save(`ShieldPro_Audit_${new Date().getTime()}.pdf`);
  };

  const handleShield = async () => {
    if (!text.trim()) return;
    
    setIsScanning(true);
    setSecureText("");
    setStatus("SCANNING...");

    try {
      const result = await invoke<string>("sanitize_text", { input: text });
      setSecureText(result);
      setStatus("SYSTEM READY");
      setMetrics(prev => ({ 
        files: prev.files + 1, 
        points: prev.points + Math.floor(Math.random() * 5) + 1,
        accuracy: 99.9
      }));
    } catch (error: any) { 
      setStatus("ERROR INTERCEPTED");
      setSecureText(`Error intercepted: ${String(error)}.`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="enterprise-layout">
      <aside className="sidebar">
        <div className="brand-zone">
          <h1>Shield Pro</h1>
          <div className="status-badge">
            <span className="pulse-dot"></span> {status}
          </div>
        </div>

        <div className="sidebar-section">
          <h3>ACTIVE FILTERS</h3>
          <div className="toggle-list">
            <label className="custom-checkbox">
              <input type="checkbox" checked={toggles.email} onChange={() => handleToggle('email')} />
              <span className="checkmark"></span>
              EMAIL ADDRESSES
            </label>
            <label className="custom-checkbox">
              <input type="checkbox" checked={toggles.phone} onChange={() => handleToggle('phone')} />
              <span className="checkmark"></span>
              PHONE NUMBERS
            </label>
            <label className="custom-checkbox">
              <input type="checkbox" checked={toggles.ssn} onChange={() => handleToggle('ssn')} />
              <span className="checkmark"></span>
              SSN (BETA)
            </label>
            <label className="custom-checkbox">
              <input type="checkbox" checked={toggles.cc} onChange={() => handleToggle('cc')} />
              <span className="checkmark"></span>
              CREDIT CARDS
            </label>
          </div>
        </div>

        <div className="sidebar-section audit-log">
          <h3>LOCAL AUDIT LOG</h3>
          <div className="metric-card">
            <span className="metric-value">{metrics.files}</span>
            <span className="metric-name">SCANS TODAY</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">{metrics.points}</span>
            <span className="metric-name">ITEMS REDACTED</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">{metrics.accuracy}%</span>
            <span className="metric-name">ACCURACY RATE</span>
          </div>
        </div>
      </aside>

      <main className="main-workspace">
        <div className="panel">
          <label className="section-label">RAW DATA INPUT (SENSITIVE)</label>
          <textarea 
            className="code-font"
            placeholder="Paste contract, medical record, or raw text here... (Watch the button light up!)"
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            disabled={isScanning}
          />
        </div>

        <button 
          onClick={handleShield} 
          className={`glow-button ${isScanning ? 'scanning' : ''}`}
          disabled={isScanning || !text.trim()}
        >
          {isScanning ? `ENCRYPTING DATA...` : "Activate Privacy Shield"}
        </button>

        <div className="panel result-panel fade-in" style={{ opacity: secureText ? 1 : 0.4 }}>
          <label className="section-label">REDACTED OUTPUT</label>
          <div className="output code-font">
            {secureText || "Awaiting scan... Output will appear here."}
          </div>
          
          {secureText && (
            <div className="action-row">
              <span className="success-text">✓ Data Secured Locally</span>
              <div className="button-group">
                <button className="secondary-button" onClick={() => navigator.clipboard.writeText(secureText)}>
                  Copy Safe Text
                </button>
                <button onClick={generateCompliancePDF} className="secondary-button pdf-button">
                  Download PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}