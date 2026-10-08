import React, { useEffect, useRef, useState } from "react";
import { AgentConfig } from "../types";
import { UserProfile } from "../rbac";
import { PapayaAccessScreen } from "./PapayaAccessScreen";

interface CyberpunkLandingPageProps {
  onEnterApp: (email?: string, role?: string) => void;
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
export const CyberpunkLandingPage: React.FC<CyberpunkLandingPageProps> = ({ onEnterApp, lang = "de" }) => {
  const [loginOpen, setLoginOpen] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleSalesPageMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "papayaos:open-login") setLoginOpen(true);
      if (event.data?.type === "papayaos:auth-success") window.location.assign("/?app=true");
    };
    window.addEventListener("message", handleSalesPageMessage);
    return () => window.removeEventListener("message", handleSalesPageMessage);
  }, []);

  return (
    <main className="fixed inset-0 bg-black">
      <iframe
        ref={frameRef}
        title="PapayaOS Salespage"
        src="/sales-preview.html"
        className="h-full w-full border-0"
        loading="eager"
      />

      <PapayaAccessScreen
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={(email, role) => onEnterApp(email, role)}
        lang={lang}
      />
    </main>
  );
};

export default CyberpunkLandingPage;

