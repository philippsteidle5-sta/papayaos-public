import React, { useEffect, useRef } from "react";

interface PapayaAccessScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (email?: string, role?: string) => void;
  onUseBetaKey?: () => void;
  lang?: "de" | "en";
}

/** Share the supplied login document between the sales page and workspace. */
export function PapayaAccessScreen({ isOpen, onClose, onSuccess, lang = "de" }: PapayaAccessScreenProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const controller = new AbortController();
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "papayaos:close-login") onClose();
      if (event.data?.type !== "papayaos:auth-success") return;
      try {
        const response = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        const result = response.ok ? await response.json() : null;
        if (!active || !result?.ok || !result.user?.email) return;
        window.location.assign("/?app=true");
      } catch { /* The document retains its form if session verification fails. */ }
    };
    window.addEventListener("message", handleMessage);
    return () => { active = false; controller.abort(); window.removeEventListener("message", handleMessage); };
  }, [isOpen, onClose, onSuccess]);
  if (!isOpen) return null;
  return <section role="dialog" aria-modal="true" aria-label={lang === "de" ? "Bei PapayaOS anmelden" : "Log in to PapayaOS"} style={{ position: "fixed", inset: 0, zIndex: 500, background: "#071f16" }}>
    <iframe ref={frame} title="PapayaOS Login" src={`/login.html?lang=${lang}`} style={{ display: "block", width: "100%", height: "100%", border: 0 }}/>
  </section>;
}
