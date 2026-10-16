import React from "react";
import { Brain, Calendar, History, Plus, Puzzle, Target } from "lucide-react";
import type { FocusCanvasLayoutProps } from "./FocusCanvasLayout";
import "./studio-workspace.css";
import "./standard-chat.css";

const TEAM = [
  { id: "syntax", name: "Papaya", image: "papaya", color: "#ff9f43", role: ["Wissen & Ideen", "Knowledge & ideas"] },
  { id: "pulse", name: "Mango", image: "mango", color: "#ffc93c", role: ["Kommunikation", "Communication"] },
  { id: "chronos", name: "Kiwi", image: "kiwi", color: "#a6d84a", role: ["Organisation", "Organization"] },
];

export function GardenWorkspace(p: FocusCanvasLayoutProps) {
  const de = p.lang === "de";
  const selected = TEAM.find(a => a.id === p.currentAgent.id) || TEAM[0];
  const choose = (id: string) => {
    const agent = p.agents.find(a => a.id === id);
    if (agent && p.onSelectAgent) {
      p.onSelectCommunicationScope?.("SINGLE");
      p.onSelectAgent(agent);
    }
  };
  const newChat = () => {
    if (!p.isLoading && p.onNewChat && window.confirm(de
      ? "Das aktuelle Gespräch dieses Agenten zurücksetzen? Der bisherige Chatverlauf wird gelöscht."
      : "Reset this agent's current conversation? Its existing chat history will be deleted.")) p.onNewChat();
  };
  return <main className="standard-workspace" style={{ "--chat-accent": selected.color } as React.CSSProperties}>
    <nav className="standard-rail" aria-label={de ? "Agenten und Werkzeuge" : "Agents and tools"}>
      <div className="standard-rail-top">
        <button className="standard-icon" onClick={newChat} disabled={!p.onNewChat || p.isLoading} title={de ? "Gespräch zurücksetzen" : "Reset conversation"} aria-label={de ? "Gespräch zurücksetzen" : "Reset conversation"}><Plus size={21}/></button>
        <button className="standard-icon" onClick={p.onHistory} disabled={!p.onHistory} title={de ? "Chatverlauf öffnen" : "Open chat history"} aria-label={de ? "Chatverlauf öffnen" : "Open chat history"}><History size={21}/></button>
        <button className="standard-icon standard-store-trigger" onClick={p.onPlugins} disabled={!p.onPlugins} title="Plugin Store" aria-label="Plugin Store"><Puzzle size={21}/></button>
      </div>
      <div className="standard-agents" role="group" aria-label={de ? "Agent auswählen" : "Select agent"}>
        {TEAM.map(a => <button key={a.id} onClick={() => choose(a.id)} disabled={!p.onSelectAgent || p.isLoading} aria-pressed={p.currentAgent.id === a.id && p.communicationScope === "SINGLE"} title={`${a.name} · ${a.role[de ? 0 : 1]}`} style={{ "--agent-accent": a.color } as React.CSSProperties}>
          <span className="standard-agent-picture"><img src={`/mascots/${a.image}-avatar.png`} alt=""/></span><b>{a.name}</b>
        </button>)}
      </div>
      <div className="standard-rail-bottom">
        <button className="standard-icon" onClick={p.onMemory} disabled={!p.onMemory} title="Memory" aria-label="Memory"><Brain size={20}/></button>
        {p.onGoals && <button className="standard-icon" onClick={p.onGoals} title={de ? "Ziele" : "Goals"} aria-label={de ? "Ziele" : "Goals"}><Target size={20}/></button>}
        {p.onCalendar && <button className="standard-icon" onClick={p.onCalendar} title={de ? "Kalender" : "Calendar"} aria-label={de ? "Kalender" : "Calendar"}><Calendar size={20}/></button>}
      </div>
    </nav>
    <section className="standard-chat-area" aria-label={de ? "Chat" : "Chat"}>{p.children}</section>
  </main>;
}
