import React from "react";
import { ArrowUpRight, MessageSquare, ShieldCheck, SlidersHorizontal, Sparkles, UserRound, Volume2, VolumeX } from "lucide-react";
import { AgentConfig, CommunicationScope } from "../types";
import "./focus-canvas.css";
import { GardenWorkspace } from "./GardenWorkspace";

type Language = "de" | "en";

function PapayaCoreSeal({ state, lang }: { state: string; lang: Language }) {
  const de = lang === "de";
  return <div className="papaya-core-seal" data-state={state || "idle"} aria-label={de ? "Papaya Core aktiv" : "Papaya Core active"}>
    <span className="papaya-seal-orbit papaya-seal-orbit--a"/><span className="papaya-seal-orbit papaya-seal-orbit--b"/>
    <span className="papaya-seal-arc"/><span className="papaya-seal-point papaya-seal-point--a"/><span className="papaya-seal-point papaya-seal-point--b"/>
    <span className="papaya-seal-mark"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 5C14 11 9 20 10 29c1 8 7 14 14 14s13-6 14-14C39 20 34 11 24 5Z" fill="url(#papaya-seal-gradient)"/><path d="M24 17c-4 4-6 8-5 13 .6 3.1 2.3 5.5 5 7 2.7-1.5 4.4-3.9 5-7 1-5-1-9-5-13Z" fill="#421d19"/><path d="M24 8c0 5-2 8-6 11" fill="none" stroke="#ffd5ab" strokeWidth="1.4" strokeLinecap="round"/><defs><linearGradient id="papaya-seal-gradient" x1="9" y1="8" x2="38" y2="42" gradientUnits="userSpaceOnUse"><stop stopColor="#ffd08f"/><stop offset=".48" stopColor="#ff7544"/><stop offset="1" stopColor="#e73362"/></linearGradient></defs></svg></span>
    <span className="papaya-seal-caption">PAPAYA<span>CORE</span></span>
  </div>;
}

export function FocusConstellation({ agents, bigThree, activeSpeakingAgentId, state, onSelectAgent, onOpenChat, lang }: {
  agents: AgentConfig[];
  bigThree: boolean;
  activeSpeakingAgentId: string | null;
  state: "idle" | "listening" | "thinking" | "speaking" | "";
  micLevel: number;
  speakingLevel: number;
  onSelectAgent?: (agent: AgentConfig) => void;
  onOpenChat: () => void;
  lang: Language;
}) {
  const center = agents.find(agent => agent.id === "syntax") || agents[0];
  const satellites = agents.filter(agent => agent.id !== center?.id && (!bigThree || ["neo", "vega"].includes(agent.id)));
  const positions = bigThree ? [[21, 48], [79, 48]] : [[50, 13], [78, 25], [86, 53], [71, 79], [29, 79], [14, 53], [22, 25]];
  return (
    <div className="focus-constellation">
      <div className="focus-constellation-label"><Sparkles size={12}/>{bigThree ? "THE BIG 3" : (lang === "de" ? "GEMEINSAM WEITERDENKEN" : "THINKING TOGETHER")}</div>
      <svg className="focus-constellation-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="50" cy="47" rx="36" ry="34"/><ellipse cx="50" cy="47" rx="22" ry="21"/>{satellites.map((agent, index) => { const [x, y] = positions[index % positions.length]; return <line key={agent.id} x1="50" y1="47" x2={x} y2={y} />; })}</svg>
      <div className="focus-constellation-center"><PapayaCoreSeal state={state} lang={lang}/><button onClick={onOpenChat} aria-label={lang === "de" ? "Gemeinsamen Chat öffnen" : "Open shared conversation"}>{center?.short || "PAPAYA"}<ArrowUpRight size={11}/></button></div>
      {satellites.map((agent, index) => { const [x, y] = positions[index % positions.length]; return <button key={agent.id} className="focus-constellation-node" style={{ left: `${x}%`, top: `${y}%`, '--core-color': agent.color } as React.CSSProperties} onClick={() => onSelectAgent?.(agent)} disabled={!onSelectAgent} aria-label={`${lang === "de" ? "Zu" : "Switch to"} ${agent.name}${lang === "de" ? " wechseln" : ""}`} data-speaking={activeSpeakingAgentId === agent.id && state === "speaking"}><span className="focus-agent-light"/><strong>{agent.short}</strong></button>; })}
      <button className="focus-constellation-chat" onClick={onOpenChat}><MessageSquare size={13}/>{lang === "de" ? "Gemeinsamen Chat öffnen" : "Open shared conversation"}<ArrowUpRight size={12}/></button>
    </div>
  );
}

export function FocusCanvasHeader({ lang, muted, isAdminUser, onToggleMute, onToggleLang, onSettings, onHome, onMemory, onGoals, onPlugins, onOpenAdmin, onOpenLogin }: {
  lang: Language;
  muted: boolean;
  isAdminUser: boolean;
  onToggleMute: () => void;
  onToggleLang: () => void;
  onSettings: () => void;
  onHome: () => void;
  onMemory: () => void;
  onGoals: () => void;
  onPlugins: () => void;
  onOpenAdmin: () => void;
  onOpenLogin: () => void;
}) {
  const de = lang === "de";
  return (
    <header className="papaya-focus-header">
      <button className="focus-brand" onClick={onHome} aria-label={de ? "PapayaOS Verkaufsseite" : "PapayaOS home"}>
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <path d="M12 2c-4.6 3-7.1 7.6-6.6 12.3C5.9 18.6 8.7 21.9 12 22c3.3-.1 6.1-3.4 6.6-7.7C19.1 9.6 16.6 5 12 2z" fill="currentColor" />
          <ellipse cx="12" cy="14" rx="3" ry="4.6" fill="#361813" />
          <g fill="#ffe5c7"><circle cx="11" cy="11.6" r=".7"/><circle cx="13.1" cy="12.6" r=".7"/><circle cx="11" cy="14.3" r=".7"/><circle cx="13" cy="15.8" r=".7"/><circle cx="11.2" cy="17" r=".7"/></g>
        </svg>
        <span>PapayaOS</span><span className="focus-brand-divider"/><small>Workspace</small>
      </button>
      <nav className="focus-header-nav" aria-label={de ? "Arbeitsbereiche" : "Workspaces"}>
        <span aria-current="page"><Sparkles size={13}/>{de ? "Mein Raum" : "My space"}</span>
        <button onClick={onMemory}>Memory</button>
        <button onClick={onGoals}>{de ? "Ziele" : "Goals"}</button>
        <button onClick={onPlugins}>Plugins</button>
      </nav>
      <div className="focus-header-tools">
        {isAdminUser && (
          <button className="focus-admin-entry" onClick={onOpenAdmin} aria-label={de ? "Admin-Tool öffnen" : "Open admin tool"} title={de ? "Admin-Tool öffnen" : "Open admin tool"}>
            <ShieldCheck size={15}/><span>{de ? "Admin-Tool" : "Admin Tool"}</span>
          </button>
        )}
        {!isAdminUser && (
          <button className="focus-account-entry" onClick={onSettings} aria-label={de ? "Kontoeinstellungen" : "Account settings"} title={de ? "Kontoeinstellungen" : "Account settings"}>
            <UserRound size={15}/><span>{de ? "Konto" : "Account"}</span>
          </button>
        )}
        <button id="global-header-mute-toggle" onClick={onToggleMute} aria-label={muted ? (de ? "Audio aktivieren" : "Enable audio") : (de ? "Audio stummschalten" : "Mute audio")} aria-pressed={muted}>
          {muted ? <VolumeX size={16}/> : <Volume2 size={16}/>}<span>{muted ? (de ? "Stumm" : "Muted") : "Audio"}</span>
        </button>
        <button onClick={onToggleLang} aria-label={de ? "Switch to English" : "Auf Deutsch wechseln"}>{lang.toUpperCase()}</button>
        <button onClick={onSettings} aria-label={de ? "Einstellungen" : "Settings"} title={de ? "Einstellungen" : "Settings"}><SlidersHorizontal size={17}/></button>
      </div>
    </header>
  );
}

export interface FocusCanvasLayoutProps {
  onHistory?: () => void;
  onNewChat?: () => void;
  children: React.ReactNode;
  agents: AgentConfig[];
  currentAgent: AgentConfig;
  lang: Language;
  state: string;
  isMatrixMode: boolean;
  communicationScope: CommunicationScope;
  onSelectCommunicationScope?: (scope: CommunicationScope) => void;
  onSelectAgent?: (agent: AgentConfig) => void;
  onOpenChat: () => void;
  messageCount: number;
  inputText: string;
  onChangeInputText: (text: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  canSend: boolean;
  micActive: boolean;
  onToggleMic?: () => void;
  onAttach: () => void;
  canAttach: boolean;
  images: string[];
  onRemoveImage?: (index: number) => void;
  onClearImages?: () => void;
  onMemory?: () => void;
  onCalendar?: () => void;
  onGoals?: () => void;
  onPlugins?: () => void;
  onCustomize?: () => void;
  onInspect?: () => void;
  onMap?: () => void;
  isMapOpen?: boolean;
  isCalendarOpen?: boolean;
  isGoalsOpen?: boolean;
}

export function FocusCanvasLayout(props: FocusCanvasLayoutProps) {
  return <GardenWorkspace {...props}/>;
}
