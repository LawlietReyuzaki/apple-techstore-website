import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = import.meta.env.VITE_LOCAL_API_URL || "";

declare global {
  interface Window { google?: any; }
}

interface Props {
  onSuccess: (idToken: string) => void;
}

export function GoogleSignInButton({ onSuccess }: Props) {
  const [clientId, setClientId] = useState<string | null | undefined>(undefined);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Fetch Client ID from backend config
  useEffect(() => {
    fetch(`${API_BASE}/api/config`)
      .then((r) => r.json())
      .then((d) => setClientId(d.googleClientId || null))
      .catch(() => setClientId(null));
  }, []);

  // Load Google GSI script when we have a clientId
  useEffect(() => {
    if (!clientId) return;
    if (window.google?.accounts?.id) { setScriptLoaded(true); return; }
    const existing = document.getElementById("google-gsi-script");
    if (existing) {
      existing.addEventListener("load", () => setScriptLoaded(true));
      return;
    }
    const s = document.createElement("script");
    s.id = "google-gsi-script";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => setScriptLoaded(true);
    document.head.appendChild(s);
  }, [clientId]);

  // Render Google button once script is loaded
  useEffect(() => {
    if (!scriptLoaded || !clientId || !divRef.current || initialized.current) return;
    initialized.current = true;
    window.google?.accounts.id.initialize({
      client_id: clientId,
      callback: (resp: any) => onSuccess(resp.credential),
      ux_mode: "popup",
    });
    window.google?.accounts.id.renderButton(divRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: divRef.current.offsetWidth || 400,
    });
  }, [scriptLoaded, clientId]);

  // Always show button — just styled differently based on state
  if (clientId === undefined) {
    // Still fetching config
    return (
      <Button variant="outline" className="w-full h-11 gap-2" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (!clientId) {
    // No Client ID — show visual button that tells user to set up
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full h-11 gap-3 font-medium"
        onClick={() => alert("Google Sign-In is not configured yet. Please contact the administrator.")}
      >
        <GoogleIcon />
        Continue with Google
      </Button>
    );
  }

  // Client ID present — Google renders its own button into this div
  return (
    <div className="w-full overflow-hidden rounded-md" style={{ minHeight: 44 }}>
      <div ref={divRef} className="w-full" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
