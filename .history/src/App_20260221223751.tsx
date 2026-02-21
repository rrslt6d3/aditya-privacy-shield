import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { trackEvent } from '@aptabase/tauri'; 
import "./App.css";

const DISCORD_WEBHOOK_URL = "YOUR_DISCORD_WEBHOOK_URL_HERE";

// 1. Added types to the parameters
const pingMyPhone = async (errorType: string, details: string) => {
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        content: `🚨 **Aditya Privacy Shield Alert** 🚨\n**Type:** ${errorType}\n**Details:** ${details}` 
      })
    });
  } catch (e) {
    // Fails silently if offline
  }
};

// 2. Added <any, { hasError: boolean }> to satisfy TypeScript class components
class ErrorBoundary extends React.Component<any, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    trackEvent("ui_crash_prevented", { error: String(error) });
    pingMyPhone("UI Crash", String(error));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-container">
          <h2>System Recovering... 🛡️</h2>
          <p>We blocked a glitch. Your data remains safe.</p>
          <button className="glow-button" onClick={() => this.setState({ hasError: false })}>
            Reboot Interface
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [text, setText] = useState("");
  const [secureText, setSecureText] = useState("");
  const [status, setStatus] = useState("System Ready");

  useEffect(() => {
    trackEvent("app_started");

    // 3. Added event: any
    const handleGlobalError = (event: any) => {
      console.error("ALERT DEVELOPER: Background error trapped:", event.message);
    };
    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleGlobalError);

    const updateApp = async () => {
      try {
        const update = await check();
        if (update?.available) {
          setStatus("Updating Security Dictionary...");
          await update.downloadAndInstall();
          await relaunch();
        }
      } catch (err) {
        console.warn("User offline. Proceeding with current local dictionary.");
      }
    };
    updateApp();

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleGlobalError);
    };
  }, []);

  const handleShield = async () => {
    try {
      setStatus("Shielding Data...");
      // 4. Added <string> to tell TypeScript exactly what comes back from Rust
      const result = await invoke<string>("sanitize_text", { input: text });
      setSecureText(result);
      setStatus("Data Protected Locally ✅");
      trackEvent("shield_activated"); 
    } catch (error: any) { // 5. Added error: any
      setStatus("Engine Reset Required.");
      setSecureText(`Error intercepted: ${String(error)}. Please try modifying your text.`);
      trackEvent("rust_engine_error", { details: String(error) });
      pingMyPhone("Backend Engine Rejection", String(error));
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Aditya Privacy Shield Pro 🛡️</h1>
        <div className="status-badge">{status}</div>
      </header>
      <main>
        <div className="panel">
          <label>Raw Prompt (Sensitive)</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <button onClick={handleShield} className="glow-button">Activate Privacy Shield</button>
        {secureText && (
          <div className="panel result fade-in">
            <label>Sanitized Prompt (Safe for AI)</label>
            <div className="output">{secureText}</div>
            <button onClick={() => navigator.clipboard.writeText(secureText)}>Copy Safe Text</button>
          </div>
        )}
      </main>
      <footer>Military-Grade Local Encryption | Telemetry Active</footer>
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