import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_LOCAL_API_URL || "";

declare global {
  interface Window { google?: any; }
}

interface Props {
  onSuccess: (idToken: string) => void;
  onError?: (msg: string) => void;
}

export function GoogleSignInButton({ onSuccess, onError }: Props) {
  const [clientId, setClientId] = useState<string | null | undefined>(undefined); // undefined = loading
  const divRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Step 1: fetch Client ID from backend
  useEffect(() => {
    fetch(`${API_BASE}/api/config`)
      .then((r) => r.json())
      .then((d) => setClientId(d.googleClientId || null))
      .catch(() => setClientId(null));
  }, []);

  // Step 2: load Google GSI script then render button
  useEffect(() => {
    if (!clientId) return;

    const initButton = () => {
      if (initialized.current || !divRef.current) return;
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
    };

    if (window.google?.accounts?.id) {
      initButton();
    } else {
      const existing = document.getElementById("google-gsi-script");
      if (!existing) {
        const s = document.createElement("script");
        s.id = "google-gsi-script";
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.defer = true;
        s.onload = initButton;
        document.head.appendChild(s);
      } else {
        existing.addEventListener("load", initButton);
      }
    }
  }, [clientId]);

  // Still loading config
  if (clientId === undefined) {
    return (
      <div className="w-full h-10 flex items-center justify-center border rounded-md text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  // Google not configured
  if (clientId === null) return null;

  return (
    <div className="w-full overflow-hidden rounded-md" style={{ minHeight: 40 }}>
      <div ref={divRef} className="w-full" />
    </div>
  );
}
