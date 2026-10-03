import React, { useRef } from "react";
import { ArrowUp, ArrowUpRight, Brain, Calendar, ChevronRight, ImageIcon, MapPin, MessageSquare, Mic, Puzzle, SlidersHorizontal, Sparkles, Target, Volume2, VolumeX, X } from "lucide-react";
import { AgentConfig, CommunicationScope } from "../types";
import "./focus-canvas.css";

type Language = "de" | "en";

export function PapayaWorkspaceVisual({ agents, currentAgent, state, onSelectAgent, lang }: {
  agents: AgentConfig[];
  currentAgent: AgentConfig;
  state: string;
  onSelectAgent?: (agent: AgentConfig) => void;
  lang: Language;
}) {
  const de = lang === "de";
  const collaborators = agents.filter(agent => agent.id !== currentAgent.id).slice(0, 3);
  const status = state === "listening" ? (de ? "Ich höre zu" : "Listening") : state === "thinking" ? (de ? "Sortiere Gedanken" : "Thinking") : state === "speaking" ? (de ? "Antwort kommt" : "Replying") : (de ? "Bereit für dich" : "Ready when you are");
  return (
    <div className="papaya-workspace-visual" data-state={state || "idle"} style={{ "--papaya-agent": currentAgent.color || "#ff7544" } as React.CSSProperties} aria-label={de ? "PapayaOS Workspace Vorschau" : "PapayaOS workspace preview"}>
      <div className="papaya-visual-aura" aria-hidden="true" />
      <div className="papaya-preview-window">
        <div className="papaya-preview-topbar">
          <span className="papaya-window-mark">P</span>
          <span className="papaya-window-brand">PAPAYA<span>OS</span></span>
          <span className="papaya-window-divider" />
          <span className="papaya-window-view">{de ? "WORKSPACE" : "WORKSPACE"}</span>
          <span className="papaya-window-live"><i />{de ? "BEREIT" : "READY"}</span>
        </div>

        <div className="papaya-preview-content">
          <div className="papaya-preview-kicker"><span>{de ? "DEIN NÄCHSTER SCHRITT" : "YOUR NEXT STEP"}</span><span>01 / 03</span></div>
          <h2>{de ? "Ein guter Gedanke verdient einen klaren Plan." : "A good thought deserves a clear plan."}</h2>
          <p>{de ? "Dein Workspace hält Kontext, Agenten und Fortschritt zusammen." : "Your workspace keeps context, agents and momentum together."}</p>

          <div className="papaya-active-agent-card">
            <div className="papaya-active-agent-icon">{currentAgent.railLetter || "P"}</div>
            <div className="papaya-active-agent-copy"><span>{de ? "DEIN AGENT" : "YOUR AGENT"}</span><strong>{currentAgent.name}</strong></div>
            <span className="papaya-agent-state"><i />{status}</span>
          </div>

          <div className="papaya-flow-label">{de ? "DEINE SPEZIALISTEN" : "YOUR SPECIALISTS"}<span>{agents.length} {de ? "VERFÜGBAR" : "AVAILABLE"}</span></div>
          <div className="papaya-flow-list">
            {collaborators.map((agent, index) => (
              <button key={agent.id} className="papaya-flow-agent" onClick={() => onSelectAgent?.(agent)} disabled={!onSelectAgent} style={{ "--flow-color": agent.color || "#ff7544", "--flow-index": index } as React.CSSProperties}>
                <span className="papaya-flow-icon">{agent.railLetter || agent.short?.[0] || "•"}</span><span className="papaya-flow-copy"><strong>{agent.name}</strong><small>{agent.tag}</small></span><span className="papaya-flow-link" aria-hidden="true"/><ArrowUpRight size={13}/>
              </button>
            ))}
          </div>
        </div>
        <div className="papaya-preview-footer"><span><Brain size={12}/>{de ? "KONTEXT BLEIBT VERBUNDEN" : "CONTEXT STAYS CONNECTED"}</span><span>{de ? "FOKUS" : "FOCUS"}<b /></span></div>
      </div>
      <div className="papaya-floating-note papaya-floating-note--memory"><Brain size={13}/><span>MEMORY<small>{de ? "Wissen verbunden" : "Context connected"}</small></span><i /></div>
      <div className="papaya-floating-note papaya-floating-note--goals"><Target size={13}/><span>{de ? "ZIELE" : "GOALS"}<small>{de ? "Nächster Schritt" : "Next step"}</small></span><ArrowUpRight size={12}/></div>
    </div>
  );
}

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

export function FocusCanvasHeader({ lang, muted, onToggleMute, onToggleLang, onSettings, onHome, onMemory, onGoals, onPlugins }: {
  lang: Language;
  muted: boolean;
  onToggleMute: () => void;
  onToggleLang: () => void;
  onSettings: () => void;
  onHome: () => void;
  onMemory: () => void;
  onGoals: () => void;
  onPlugins: () => void;
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
        <span aria-current="page"><Sparkles size={13}/>Focus</span>
        <button onClick={onMemory}>Memory</button>
        <button onClick={onGoals}>{de ? "Ziele" : "Goals"}</button>
        <button onClick={onPlugins}>Plugins</button>
      </nav>
      <div className="focus-header-tools">
        <button id="global-header-mute-toggle" onClick={onToggleMute} aria-label={muted ? (de ? "Audio aktivieren" : "Enable audio") : (de ? "Audio stummschalten" : "Mute audio")} aria-pressed={muted}>
          {muted ? <VolumeX size={16}/> : <Volume2 size={16}/>}<span>{muted ? (de ? "Stumm" : "Muted") : "Audio"}</span>
        </button>
        <button onClick={onToggleLang} aria-label={de ? "Switch to English" : "Auf Deutsch wechseln"}>{lang.toUpperCase()}</button>
        <button onClick={onSettings} aria-label={de ? "Einstellungen" : "Settings"} title={de ? "Einstellungen" : "Settings"}><SlidersHorizontal size={17}/></button>
      </div>
    </header>
  );
}

interface FocusCanvasLayoutProps {
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
  const { children, agents, currentAgent, lang, state, isMatrixMode, communicationScope, onSelectCommunicationScope, onSelectAgent, onOpenChat, messageCount, inputText, onChangeInputText, onSubmit, isLoading, canSend, micActive, onToggleMic, onAttach, canAttach, images, onRemoveImage, onClearImages, onMemory, onCalendar, onGoals, onPlugins, onCustomize, onInspect, onMap, isMapOpen, isCalendarOpen, isGoalsOpen } = props;
  const de = lang === "de";
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const status = state === "thinking" || isLoading ? (de ? "Denkt gerade nach" : "Thinking it through") : state === "listening" ? (de ? "Hört dir zu" : "Listening to you") : state === "speaking" ? (de ? "Spricht mit dir" : "Speaking with you") : (de ? "Bereit für deinen nächsten Gedanken" : "Ready for your next thought");
  const roles: Record<string, string> = { syntax: de ? "Dein Assistent" : "Your assistant", maze: de ? "Dein Assistent" : "Your assistant", neo: "Vision", vega: "Code & Data", odin: "Security", pulse: "Content", chronos: de ? "Zeit & Fokus" : "Time & focus", oracle: "Finance", globe: "Research" };
  const actions = [
    { icon: Brain, label: "Memory", detail: de ? "Wissen verbinden" : "Connect your knowledge", onClick: onMemory },
    { icon: Target, label: de ? "Deine Ziele" : "Your goals", detail: de ? "Weiterkommen" : "Find your next step", onClick: onGoals, active: isGoalsOpen },
    { icon: Calendar, label: de ? "Kalender" : "Calendar", detail: de ? "Raum für Fokus" : "Make room for focus", onClick: onCalendar, active: isCalendarOpen },
    { icon: MapPin, label: "Maps", detail: de ? "Orte entdecken" : "Explore places", onClick: onMap, active: isMapOpen },
  ].filter(action => action.onClick);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isLoading && canSend && (inputText.trim() || images.length)) onSubmit();
  };

  return (
    <section className={`focus-workspace ${isMatrixMode ? "focus-workspace--matrix" : ""}`} aria-label={de ? "Dein Focus Workspace" : "Your Focus Workspace"}>
      <div className="focus-workspace-toolbar">
        <div className="focus-breadcrumb"><span/>{de ? "DEIN PERSÖNLICHER RAUM" : "YOUR PERSONAL SPACE"}</div>
        <div className="focus-session-tools">
          <div className="focus-modes" role="group" aria-label={de ? "Agentenmodus" : "Agent mode"}>
            {([['SINGLE', de ? 'Einzeln' : 'Solo'], ['THE_BIG_3', 'Big 3'], ['ALL', de ? 'Alle Agenten' : 'All agents']] as const).map(([scope, label]) => <button key={scope} onClick={() => onSelectCommunicationScope?.(scope)} disabled={!onSelectCommunicationScope} aria-pressed={communicationScope === scope}>{label}</button>)}
          </div>
          <button className="focus-history" onClick={onOpenChat}><MessageSquare size={15}/><span>{de ? "Verlauf" : "Conversation"}</span>{messageCount > 0 && <small>{messageCount}</small>}</button>
        </div>
      </div>

      <div className="focus-hero">
        <div className="focus-intro">
          <div className="focus-eyebrow"><span/>{de ? "WENIGER RAUSCHEN. MEHR RAUM." : "LESS NOISE. MORE SPACE."}</div>
          <h1>{de ? "Ein Gedanke." : "One thought."}<br/><em>{de ? "Alle Möglichkeiten." : "Every possibility."}</em></h1>
          <p>{de ? "Deine Agenten, dein Wissen, deine Ziele. Ein Ort, der mit dir weiterdenkt." : "Your agents, your knowledge, your goals. A space that thinks along with you."}</p>
          <div className="focus-shortcuts">
            {actions.map(({ icon: Icon, label, detail, onClick, active }) => <button key={label} onClick={onClick} aria-pressed={active}><Icon size={17}/><span><strong>{label}</strong><small>{detail}</small></span><ArrowUpRight size={13} className="focus-shortcut-arrow"/></button>)}
          </div>
        </div>
        <div className="focus-core-area">
          <div className="focus-orbit focus-orbit--outer" aria-hidden="true"/><div className="focus-orbit focus-orbit--inner" aria-hidden="true"/>
          <span className="focus-orbit-star focus-orbit-star--one" aria-hidden="true"/><span className="focus-orbit-star focus-orbit-star--two" aria-hidden="true"/>
          <div className="focus-scene">{children}</div>
          {!isMatrixMode && <div className="focus-core-caption"><button className="focus-core-name" onClick={onInspect} disabled={!onInspect} aria-label={de ? `Agentenprofil von ${currentAgent.short} öffnen` : `Open ${currentAgent.short} agent profile`}>{currentAgent.short || currentAgent.name}<span>CORE</span></button><span className="focus-state" role="status"><i data-busy={state !== "idle" && state !== ""}/>{status}</span></div>}
          {onCustomize && <button className="focus-core-customize" onClick={onCustomize} title={de ? "Core gestalten" : "Customize core"} aria-label={de ? "Core gestalten" : "Customize core"}><SlidersHorizontal size={14}/></button>}
        </div>
      </div>

      <div className="focus-command-area">
        <form className="focus-composer" onSubmit={submit}>
          {images.length > 0 && <div className="focus-attachments">{images.map((image, index) => <div key={`${index}-${image.slice(-24)}`}><img src={image} alt={`${de ? "Anhang" : "Attachment"} ${index + 1}`}/>{onRemoveImage && <button type="button" onClick={() => onRemoveImage(index)} aria-label={de ? `Anhang ${index + 1} entfernen` : `Remove attachment ${index + 1}`}><X size={12}/></button>}</div>)}{!onRemoveImage && onClearImages && <button type="button" onClick={onClearImages}>{de ? "Entfernen" : "Remove"}</button>}</div>}
          <label className="sr-only" htmlFor="focus-message">{de ? "Nachricht an deinen Agenten" : "Message your agent"}</label>
          <textarea ref={inputRef} id="focus-message" rows={2} value={inputText} onChange={event => onChangeInputText(event.target.value)} placeholder={de ? "Was möchtest du heute möglich machen?" : "What would you like to make possible today?"} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!isLoading && canSend && (inputText.trim() || images.length)) onSubmit(); } }}/>
          <div className="focus-composer-bottom">
            <span className="focus-composer-agent"><i style={{ background: currentAgent.color }}/>{isMatrixMode ? (communicationScope === "ALL" ? (de ? "Alle Agenten" : "All agents") : "Big 3") : currentAgent.short}<span>{de ? (isMatrixMode ? "denken mit dir" : "denkt mit dir") : (isMatrixMode ? "are here with you" : "is here with you")}</span></span>
            <div className="focus-composer-actions">
              {canAttach && <button type="button" onClick={onAttach} aria-label={de ? "Bild anhängen" : "Attach image"} title={de ? "Bild anhängen" : "Attach image"}><ImageIcon size={17}/></button>}
              {onToggleMic && <button type="button" onClick={onToggleMic} aria-pressed={micActive} aria-label={micActive ? (de ? "Mikrofon stoppen" : "Stop microphone") : (de ? "Mit deinem Agenten sprechen" : "Talk to your agent")} title={de ? "Sprache" : "Voice"}><Mic size={17}/></button>}
              <button type="submit" className="focus-send" disabled={isLoading || !canSend || (!inputText.trim() && !images.length)} aria-label={de ? "Nachricht senden" : "Send message"}><ArrowUp size={19}/></button>
            </div>
          </div>
        </form>
        <div className="focus-prompts"><span>{de ? "Ein Anfang:" : "A little inspiration:"}</span>{(de ? ["Meinen Tag strukturieren", "Eine Idee weiterdenken", "Etwas Neues lernen"] : ["Plan my day", "Explore an idea", "Learn something new"]).map(prompt => <button key={prompt} onClick={() => { onChangeInputText(prompt); inputRef.current?.focus(); }}>{prompt}<ArrowUpRight size={11}/></button>)}</div>
      </div>

      <footer className="focus-fleet">
        <div className="focus-fleet-heading"><span>{de ? "DEINE KONSTELLATION" : "YOUR CONSTELLATION"}</span><p>{agents.length} {de ? "Spezialisten. Ein gemeinsamer Raum." : "specialists. One shared space."}</p>{onPlugins && <button onClick={onPlugins}><Puzzle size={14}/>{de ? "Erweitern" : "Explore plugins"}<ChevronRight size={13}/></button>}</div>
        <div className="focus-agents" role="group" aria-label={de ? "Agent auswählen" : "Choose an agent"}>
          {agents.map(agent => <button key={agent.id} className="focus-agent" aria-pressed={agent.id === currentAgent.id && !isMatrixMode} onClick={() => { onSelectCommunicationScope?.("SINGLE"); onSelectAgent?.(agent); }} disabled={!onSelectAgent} style={{ '--core-color': agent.color } as React.CSSProperties}><span className="focus-agent-light"/><strong>{agent.short || agent.name}</strong><small>{roles[agent.id] || agent.tag}</small></button>)}
        </div>
      </footer>
    </section>
  );
}
