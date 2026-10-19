import React, { useEffect, useRef, useState } from "react";
import type { FocusCanvasLayoutProps } from "./FocusCanvasLayout";
import "./studio-workspace.css";
import "./standard-chat.css";

// The supplied HTML owns presentation; React retains the authenticated application.
export function GardenWorkspace(p: FocusCanvasLayoutProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef(p); latest.current = p;
  const [ready, setReady] = useState(false);
  const [model, setModel] = useState(() => {
    try { return localStorage.getItem("papaya_workspace_model") || "gemini-3.8-flash"; }
    catch { return "gemini-3.8-flash"; }
  });
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.source !== "papaya-workspace") return;
      const current = latest.current;
      const { action, value } = event.data;
      if (action === "ready") { setReady(true); return; }
      if (action === "model" && ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"].includes(value)) {
        try { localStorage.setItem("papaya_workspace_model", value); } catch {}
        setModel(value);
      }
      if (action === "agent" && !current.isLoading) {
        if (value === "sync") current.onSelectCommunicationScope?.("ALL");
        else {
          const id = ({ papaya: "syntax", mango: "pulse", kiwi: "chronos" } as Record<string, string>)[value];
          const agent = current.agents.find(agent => agent.id === id);
          if (agent) { current.onSelectCommunicationScope?.("SINGLE"); current.onSelectAgent?.(agent); }
        }
      }
      if (action === "send" && typeof value === "string" && !current.isLoading && current.canSend && (value.trim() || current.images.length)) current.onSendText(value);
      if (action === "input" && typeof value === "string") current.onChangeInputText(value);
      if (action === "speak" && typeof value === "string") {
        const message = current.messages.find(message => message.id === value && message.role !== "user");
        if (message) current.onSpeak?.(message.content, message.role);
      }
      if (action === "plugins") current.onPlugins?.();
      if (action === "memory") current.onMemory?.();
      if (action === "calendar") current.onCalendar?.();
      if (action === "goals") current.onGoals?.();
      if (action === "history") current.onHistory?.();
      if (action === "mic") current.onToggleMic?.();
      if (action === "attach" && current.canAttach) current.onAttach();
      if (action === "removeImage" && Number.isInteger(value)) current.onRemoveImage?.(value);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    if (!ready) return;
    frame.current?.contentWindow?.postMessage({ source: "papaya-host", state: {
      agent: p.communicationScope === "SINGLE" ? ({ syntax: "papaya", pulse: "mango", chronos: "kiwi" }[p.currentAgent.id] || "papaya") : "sync",
      lang: p.lang, model, messages: p.messages, input: p.inputText,
      loading: p.isLoading, canSend: p.canSend, micActive: p.micActive, images: p.images,
      tools: { plugins: !!p.onPlugins, memory: !!p.onMemory, calendar: !!p.onCalendar, goals: !!p.onGoals, history: !!p.onHistory, mic: !!p.onToggleMic, attach: p.canAttach },
    } }, window.location.origin);
  }, [ready, model, p]);
  return <main className="standard-workspace" style={{ width: "100%", minHeight: 0, overflow: "hidden" }}>
    <iframe ref={frame} title="PapayaOS Agent Workspace" src="/agent-workspace.html?v=trio-1" style={{ display: "block", width: "100%", height: "100%", border: 0 }}/>
  </main>;
}
