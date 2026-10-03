import React, { useEffect, useRef, useState } from "react";
import { Key, X } from "lucide-react";
import { AgentConfig } from "../types";
import { UserProfile } from "../rbac";
import { KeyLoginModal } from "./KeyLoginModal";
import { validateAndRedeemAccessKey } from "../utils/leadDatabase";

interface CyberpunkLandingPageProps {
  onEnterApp: () => void;
  agents: AgentConfig[];
  userProfile: UserProfile;
  onUpgradeToPro: (tierName: string) => void;
  onOpenGmailInbox?: () => void;
  onOpenVeoVideoStudio?: () => void;
  onOpenAgentFleetStudio?: () => void;
  onViewMaintenanceMode?: () => void;
  lang?: "de" | "en";
  onToggleLang?: () => void;
}

/** Sales page with the OS account login and beta-key entry connected. */
export const CyberpunkLandingPage: React.FC<CyberpunkLandingPageProps> = ({ onEnterApp }) => {
  const [loginOpen, setLoginOpen] = useState(false);
  const [keyEntryOpen, setKeyEntryOpen] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleSalesPageMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "papayaos:open-login") setLoginOpen(true);
    };
    window.addEventListener("message", handleSalesPageMessage);
    return () => window.removeEventListener("message", handleSalesPageMessage);
  }, []);

  const redeemKey = (event: React.FormEvent) => {
    event.preventDefault();
    const result = validateAndRedeemAccessKey(accessKey);
    if (!result.success) {
      setKeyError(result.message);
      return;
    }
    setKeyError("");
    setKeyEntryOpen(false);
    onEnterApp();
  };

  return (
    <main className="fixed inset-0 bg-black">
      <iframe
        ref={frameRef}
        title="PapayaOS Salespage"
        src="/sales-preview.html"
        className="h-full w-full border-0"
        loading="eager"
      />

      <KeyLoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => onEnterApp()}
        lang="de"
      />

      {keyEntryOpen && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <section className="relative w-full max-w-md rounded-2xl border border-orange-500/40 bg-[#09090d] p-6 text-white shadow-[0_0_60px_rgba(255,107,53,.16)]">
            <button onClick={() => setKeyEntryOpen(false)} aria-label="Schließen" className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
            <div className="mb-4 flex items-center gap-3 text-orange-400"><Key size={20} /><h2 className="font-bold tracking-wide">BETA-KEY EINLÖSEN</h2></div>
            <p className="mb-5 text-sm text-zinc-300">Der Beta-Key schaltet den OS-Zugang für den zugehörigen Zeitraum frei.</p>
            <form onSubmit={redeemKey} className="space-y-4">
              <input autoFocus type="password" required value={accessKey} onChange={(event) => { setAccessKey(event.target.value); setKeyError(""); }} placeholder="Beta-Key eingeben" className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 font-mono text-sm outline-none focus:border-orange-400" />
              {keyError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-300">{keyError}</p>}
              <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-3 font-bold text-white hover:brightness-110">ENTSICHERN & STARTEN →</button>
            </form>
          </section>
        </div>
      )}

      {!loginOpen && !keyEntryOpen && (
        <button onClick={() => setKeyEntryOpen(true)} className="fixed bottom-5 right-5 z-[200] rounded-full border border-orange-400/50 bg-zinc-950/95 px-4 py-3 text-sm font-semibold text-orange-200 shadow-xl hover:bg-zinc-900">
          <Key size={16} className="mr-2 inline" />Beta-Key nutzen
        </button>
      )}
      {loginOpen && (
        <button onClick={() => { setLoginOpen(false); setKeyEntryOpen(true); }} className="fixed bottom-5 right-5 z-[251] rounded-full border border-orange-400/50 bg-zinc-950 px-4 py-3 text-xs font-semibold text-orange-200 shadow-xl hover:bg-zinc-900">
          <Key size={15} className="mr-2 inline" />Beta-Key stattdessen
        </button>
      )}
    </main>
  );
};

export default CyberpunkLandingPage;

