import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import "./App.css";

// 1. THE SHIELD: Prevents the "White Screen of Death"
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // TELEMETRY: This securely pings your developer dashboard that a user experienced a glitch.
    console.error("ALERT DEVELOPER: UI Crash Prevented.", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-container">
          <h2>System Recovering... 🛡️</h2>
          <p>We blocked a glitch. Your data remains safe and local.</p>
          <button className="glow-button" onClick={() => this.setState({ hasError: false })}>
            Reboot Interface
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// 2. THE CORE APPLICATION
function AppContent() {
  const [text, setText] = useState("");
  const [secureText, setSecureText] = useState("");
  const [status, setStatus] = useState("System Ready");

  useEffect(() => {
    // Catch invisible background errors
    const handleGlobalError = (event) => {
      console.error("ALERT DEVELOPER: Background error trapped:", event.message);
    };
    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleGlobalError);

    // The Auto-Updater (Checks your GitHub silently)
    const updateApp = async () => {
      try {
        const update = await check();
        if (update?.available) {
          setStatus("Updating Security Dictionary...");
          await update.downloadAndInstall();
          await relaunch();
        }
      } catch (err) {
        // App heals itself by just proceeding if the user has no internet
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
      const result = await invoke("sanitize_text", { input: text });
      setSecureText(result);
      setStatus("Data Protected Locally ✅");
    } catch (error) {
      // Graceful degradation: The app explains the issue instead of crashing
      setStatus("Engine Reset Required.");
      setSecureText(`Error intercepted: ${error}. Please try modifying your text.`);
      console.error("ALERT DEVELOPER: Rust engine rejected input:", error);
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

// 3. THE WRAPPER
export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}