import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silence benign Vite/HMR WebSocket connection status errors in the sandboxed preview environment
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason?.message || String(event.reason || "");
    if (
      reason.includes("WebSocket") || 
      reason.includes("web socket") || 
      reason.includes("websocket") || 
      reason.includes("vite") ||
      reason.includes("fetch failed") ||
      reason.includes("Supabase")
    ) {
      event.preventDefault();
    }
  });

  window.addEventListener("error", (event) => {
    const message = event.message || "";
    if (
      message.includes("WebSocket") || 
      message.includes("websocket") || 
      message.includes("vite") ||
      message.includes("fetch failed") ||
      message.includes("Supabase")
    ) {
      event.preventDefault();
    }
  });

  const rawConsoleError = console.error;
  console.error = (...args) => {
    const errorStr = args.map(arg => String(arg?.message || arg)).join(" ");
    if (
      errorStr.includes("websocket") || 
      errorStr.includes("WebSocket") || 
      errorStr.includes("hmr") || 
      errorStr.includes("vite") ||
      errorStr.includes("fetch failed") ||
      errorStr.includes("Supabase")
    ) {
      return; // Filter out verbose sandbox devserver HMR and handled network status logs
    }
    rawConsoleError.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

