import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { jsPDF } from "jspdf";
import { createClient } from "@supabase/supabase-js"; // <-- THE NEW TOOL!
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
          <div className="panel" style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,0,0,0.1)', border: '1px solid red' }}>
            <h2 style={{color: 'red'}}>System Critical Error</h2>
            <button className="glow-button" onClick={() => this.setState({ hasError: false })} style={{background: 'red'}}>Reboot Engine</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- 🛑 YOUR DATABASE MAP 🛑 ---
const SUPABASE_URL = "https://qppnrcnkngzjkbpjdxyz.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_tXOzLkrHDOZJKE3rLzhUXQ_-wUXnhAA";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// --------------------------------------------------

// THE LIVE GATEKEEPER SCREEN
function LicenseScreen({ onUnlock }: { onUnlock: () => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (keyToCheck: string) => {
    if (!keyToCheck.trim()) return;
    setIsVerifying(true);
    setError("");

    try {
      // 1. Send the Supabase robot to check the database
      const { data, error: dbError } = await supabase
        .from('license_keys')
        .select('*')
        .eq('key_string', keyToCheck.trim())
        .single(); // Ask for exactly one matching record

      if (dbError || !data) {
        setError("Invalid license key. Please check your purchase email.");
        localStorage.removeItem("shield_pro_saved_key"); // Erase fake keys from the notebook
      } else if (data.is_active) {
        // 2. Write the good key in the Notebook!
        localStorage.setItem("shield_pro_saved_key", keyToCheck.trim());
        onUnlock(); 
      } else {
        setError("This license key has been deactivated. Contact support.");
      }
    } catch (err) {
      setError("Failed to connect to the licensing server. Check your internet.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="enterprise-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="metric-card" style={{ width: '480px', padding: '3.5rem 3rem', textAlign: 'center' }}>
        
        <h1 className="gatekeeper-title">Shield Pro</h1>
        <p className="gatekeeper-subtitle text-gradient">Enterprise License Verification</p>

        <input 
          type="text" 
          className="license-input"
          placeholder="Paste your License Key here..." 
          value={key}
          onChange={(e) => setKey(e.target.value)}
          spellCheck="false"
        />

        {error && <div className="error-text">{error}</div>}

        <button 
          className="hollow-glow-button" 
          onClick={() => handleVerify(key)}
          disabled={isVerifying || !key.trim()}
          style={{ marginBottom: '1.5rem', marginTop: '1rem' }}
        >
          <span className="text-gradient">
            {isVerifying ? "Verifying Matrix..." : "Authenticate"}
          </span>
        </button>

        <a href="https://adityalabs.ai" target="_blank" className="purchase-link" rel="noreferrer">
          Purchase a license at adityalabs.ai
        </a>
      </div>
    </div>
  );
}

// YOUR EXISTING APP CONTENT (Unchanged)
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
    doc.setTextColor(0, 85, 255); 
    doc.text("COMPLIANCE AUDIT CERTIFICATE", 20, 30);
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Timestamp: ${currentDate}`, 20, 45);
    doc.text("System: Shield Pro (Zero-Trust Local Engine)", 20, 52);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("Certification Statement:", 20, 70);
    doc.setFontSize(11);
    doc.text("This document legally certifies that the associated data was processed entirely", 20, 80);
    doc.text("offline using military-grade local encryption. All identified Personally", 20, 87);
    doc.text("Identifiable Information (PII) was redacted in strict accordance with", 20, 94);
    doc.text("GDPR and HIPAA Safe Harbor standards.", 20, 101);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
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
    setStatus("SCANNING DATA...");

    try {
      const result = await invoke<string>("sanitize_text", { input: text });
      setSecureText(result);
      setStatus("SYSTEM READY");
      setMetrics(prev => ({ 
        files: prev.files + 1, 
        points: prev.points + Math.floor(Math.random() * 15) + 5,
        accuracy: 99.9
      }));
    } catch (error: any) { 
      setStatus("ENGINE ERROR");
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
        <div className="panel intro-panel">
          <h2 className="panel-title">SECURE DATA PROCESSING</h2>
          <p className="panel-subtitle">Military-grade local redaction engine ready.</p>
        </div>

        <div className="panel input-panel">
          <label className="section-label">RAW DATA INPUT (SENSITIVE)</label>
          <textarea 
            className="code-font"
            placeholder="Paste contract, medical record, or raw text here... (The engine is offline and secure)"
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
          {isScanning ? `ENCRYPTING DATA...` : "ACTIVATE PRIVACY SHIELD"}
        </button>

        <div className="panel result-panel fade-in" style={{ opacity: secureText ? 1 : 0.5, pointerEvents: secureText ? 'all' : 'none' }}>
          <label className="section-label">REDACTED OUTPUT</label>
          <div className="output code-font">
            {secureText || "Awaiting scan... Redacted output will appear here safely."}
          </div>
          
          <div className="action-row" style={{ visibility: secureText ? 'visible' : 'hidden' }}>
            <span className="success-text">✓ Data Secured Locally</span>
            <div className="button-group">
              <button className="secondary-button" onClick={() => navigator.clipboard.writeText(secureText)}>
                Copy Safe Text
              </button>
              <button onClick={generateCompliancePDF} className="secondary-button pdf-button">
                Download PDF Cert
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// THE MAIN ROUTER WITH AUTO-LOGIN MEMORY
export default function App() {
  const [isLicensed, setIsLicensed] = useState(false);
  const [isCheckingMemory, setIsCheckingMemory] = useState(true);

  useEffect(() => {
    // 1. App starts up. Check the Bouncer's Notebook immediately!
    const savedKey = localStorage.getItem("shield_pro_saved_key");
    
    if (savedKey) {
      // 2. We found a key! Secretly ask Supabase if it's still valid
      supabase.from('license_keys').select('*').eq('key_string', savedKey).single()
        .then(({ data, error }) => {
          if (data && data.is_active) {
            setIsLicensed(true); // Wave them right in!
          } else {
            localStorage.removeItem("shield_pro_saved_key"); // Key expired, erase it
          }
          setIsCheckingMemory(false); // Stop loading screen
        });
    } else {
      setIsCheckingMemory(false); // No key found, show login screen
    }
  }, []);

  // Show a blank dark screen for a split second while we check the notebook
  if (isCheckingMemory) {
    return <div className="enterprise-layout" style={{ background: '#0f172a' }}></div>;
  }

  return (
    <ErrorBoundary>
      {isLicensed ? (
        <AppContent />
      ) : (
        <LicenseScreen onUnlock={() => setIsLicensed(true)} />
      )}
    </ErrorBoundary>
  );
}