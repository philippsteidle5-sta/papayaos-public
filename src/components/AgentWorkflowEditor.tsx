import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Link2, Play, RotateCcw, Trash2, Workflow } from "lucide-react";
import { AgentConfig } from "../types";
import { AgentWorkflowSettings, SystemAppDefinition } from "../utils/agentAppLinksStore";
import { AgentWorkflowGraph, WorkflowEdge, WorkflowNode, getWorkflowAppIds, getWorkflowPlan } from "../utils/agentWorkflowGraph";

const NODE_WIDTH = 202;
const NODE_HEIGHT = 78;

interface AgentWorkflowEditorProps {
  agents: AgentConfig[];
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
  graph: AgentWorkflowGraph;
  onGraphChange: React.Dispatch<React.SetStateAction<AgentWorkflowGraph>>;
  settings: AgentWorkflowSettings;
  onSettingsChange: React.Dispatch<React.SetStateAction<AgentWorkflowSettings>>;
  apps: SystemAppDefinition[];
  isEn: boolean;
}

function createsCycle(graph: AgentWorkflowGraph, source: string, target: string): boolean {
  const pending = [target];
  const seen = new Set<string>();
  while (pending.length) {
    const id = pending.pop()!;
    if (id === source) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    graph.edges.filter((edge) => edge.source === id).forEach((edge) => pending.push(edge.target));
  }
  return false;
}

function edgePath(from: WorkflowNode, to: { x: number; y: number }): string {
  const x1 = from.x + NODE_WIDTH;
  const y1 = from.y + NODE_HEIGHT / 2;
  const bend = Math.max(54, Math.abs(to.x - x1) * 0.48);
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`;
}

export const AgentWorkflowEditor: React.FC<AgentWorkflowEditorProps> = ({
  agents,
  selectedAgentId,
  onSelectAgent,
  graph,
  onGraphChange,
  settings,
  onSettingsChange,
  apps,
  isEn,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const connectingRef = useRef<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [inspection, setInspection] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  const agent = agents.find((item) => item.id === selectedAgentId);
  const appMap = useMemo(() => new Map(apps.map((app) => [app.id, app])), [apps]);
  const nodeMap = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const stageWidth = Math.max(1040, ...graph.nodes.map((node) => node.x + NODE_WIDTH + 50));
  const stageHeight = Math.max(540, ...graph.nodes.map((node) => node.y + NODE_HEIGHT + 60));

  useEffect(() => {
    setSelectedNodeId(null);
    setPendingSourceId(null);
    setPointer(null);
    setInspection([]);
    setNotice("");
  }, [selectedAgentId]);

  useEffect(() => {
    setInspection([]);
  }, [graph]);

  const labelFor = (node?: WorkflowNode): string => {
    if (!node) return "?";
    if (node.type === "trigger") return isEn ? "Chat message" : "Chat-Nachricht";
    if (node.type === "agent") return agent?.short || selectedAgentId.toUpperCase();
    const app = node.appId ? appMap.get(node.appId) : undefined;
    return app ? (isEn ? app.nameEn : app.nameDe) : (isEn ? "Unavailable function" : "Nicht verfügbare Funktion");
  };

  const getPoint = (event: React.PointerEvent): { x: number; y: number } => {
    const rect = stageRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const addApp = (appId: string) => {
    const count = graph.nodes.filter((node) => node.type === "app").length;
    if (graph.nodes.length >= 60) {
      setNotice(isEn ? "Maximum of 60 nodes reached." : "Maximal 60 Nodes möglich.");
      return;
    }
    const id = `app-${appId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const node: WorkflowNode = { id, type: "app", appId, x: 610 + (count % 2) * 236, y: 42 + Math.floor(count / 2) * 112 };
    onGraphChange((current) => ({ ...current, nodes: [...current.nodes, node] }));
    setSelectedNodeId(id);
    setNotice(isEn ? "Node added. Connect its input to include it in the flow." : "Node hinzugefügt. Verbinde den Eingang, damit er im Ablauf liegt.");
    requestAnimationFrame(() => canvasScrollRef.current?.scrollTo({ left: Math.max(0, node.x - 160), top: Math.max(0, node.y - 100), behavior: "smooth" }));
  };

  const removeNode = (nodeId: string) => {
    if (nodeId === "trigger" || nodeId === "agent") return;
    onGraphChange((current) => ({
      nodes: current.nodes.filter((node) => node.id !== nodeId),
      edges: current.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
    }));
    setSelectedNodeId(null);
    setNotice(isEn ? "Node removed." : "Node entfernt.");
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selectedNodeId && selectedNodeId !== "trigger" && selectedNodeId !== "agent") {
        event.preventDefault();
        removeNode(selectedNodeId);
      }
      if (event.key === "Escape") {
        setPendingSourceId(null);
        setPointer(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNodeId, onGraphChange]);

  const connect = (source: string, target: string) => {
    if (target === "trigger" || target === "agent" || source === target) return;
    if (graph.edges.some((edge) => edge.source === source && edge.target === target)) {
      setNotice(isEn ? "These nodes are already connected." : "Diese Nodes sind bereits verbunden.");
      return;
    }
    if (createsCycle(graph, source, target)) {
      setNotice(isEn ? "Connection rejected: it would create a loop." : "Verbindung abgelehnt: Sie würde eine Schleife erzeugen.");
      return;
    }
    const edge: WorkflowEdge = { id: `${source}:${target}`, source, target };
    onGraphChange((current) => ({ ...current, edges: [...current.edges, edge] }));
    setPendingSourceId(null);
    setPointer(null);
    setNotice(isEn ? "Nodes connected." : "Nodes verbunden.");
  };

  const startDrag = (event: React.PointerEvent, node: WorkflowNode) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const point = getPoint(event);
    dragRef.current = { id: node.id, dx: point.x - node.x, dy: point.y - node.y };
    stageRef.current?.setPointerCapture(event.pointerId);
    setSelectedNodeId(node.id);
  };

  const startConnection = (event: React.PointerEvent, nodeId: string) => {
    event.stopPropagation();
    event.preventDefault();
    connectingRef.current = nodeId;
    setPendingSourceId(nodeId);
    setPointer(getPoint(event));
    stageRef.current?.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (dragRef.current) {
      const point = getPoint(event);
      const { id, dx, dy } = dragRef.current;
      onGraphChange((current) => ({
        ...current,
        nodes: current.nodes.map((node) => node.id === id
          ? { ...node, x: Math.max(0, Math.min(2400, point.x - dx)), y: Math.max(0, Math.min(1800, point.y - dy)) }
          : node),
      }));
    }
    if (connectingRef.current) setPointer(getPoint(event));
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (connectingRef.current) {
      const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-workflow-input]");
      const targetId = hit?.dataset.workflowInput;
      if (targetId) connect(connectingRef.current, targetId);
      connectingRef.current = null;
      setPointer(null);
    }
    dragRef.current = null;
    if (stageRef.current?.hasPointerCapture(event.pointerId)) stageRef.current.releasePointerCapture(event.pointerId);
  };

  const inspectFlow = () => {
    const plan = getWorkflowPlan(graph);
    const messages: string[] = [];
    if (plan.hasCycle) messages.push(isEn ? "A loop was found in the graph." : "Im Ablauf wurde eine Schleife gefunden.");
    if (!plan.agentConnected) messages.push(isEn ? "The agent is not connected to the trigger." : "Der Agent ist nicht mit dem Start verbunden.");
    if (plan.disconnectedNodeIds.length) messages.push(isEn
      ? `${plan.disconnectedNodeIds.length} function node(s) are not connected to the start.`
      : `${plan.disconnectedNodeIds.length} Funktions-Node(s) sind nicht mit dem Start verbunden.`);
    const orderedLabels = plan.orderedNodeIds.map((id) => labelFor(nodeMap.get(id)));
    messages.push(`${isEn ? "Planned order" : "Geplante Reihenfolge"}: ${orderedLabels.join(" → ")}`);
    if (!plan.hasCycle && plan.agentConnected && !plan.disconnectedNodeIds.length) {
      messages.unshift(isEn ? "Structure is valid. No external apps were executed." : "Struktur ist gültig. Es wurden keine externen Apps ausgeführt.");
    }
    setInspection(messages);
    setNotice("");
  };

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : undefined;
  const relatedEdges = graph.edges.filter((edge) => edge.id !== "trigger-agent" && (edge.source === selectedNodeId || edge.target === selectedNodeId));
  const pendingNode = pendingSourceId ? nodeMap.get(pendingSourceId) : undefined;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#0b0b11]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[.08] px-3 py-2.5 sm:px-4">
        <span className="inline-flex items-center gap-2 text-xs font-bold text-white"><Workflow className="h-4 w-4 text-orange-400" />{isEn ? "Agent workflow editor" : "Agenten-Workflow-Editor"}</span>
        <select value={selectedAgentId} onChange={(event) => onSelectAgent(event.target.value)} aria-label={isEn ? "Select agent" : "Agent auswählen"} className="min-w-0 max-w-[200px] rounded-lg border border-white/10 bg-[#1b1b25] px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-400">
          {agents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-mono text-slate-400">{graph.nodes.length} Nodes · {graph.edges.length} {isEn ? "links" : "Verbindungen"}</span>
        <span className="flex-1" />
        <button type="button" onClick={() => { onGraphChange({ nodes: graph.nodes.filter((node) => node.type !== "app"), edges: graph.edges.filter((edge) => edge.id === "trigger-agent") }); setSelectedNodeId(null); setNotice(isEn ? "Function nodes cleared. Save to keep this change." : "Funktions-Nodes entfernt. Speichere, um die Änderung zu behalten."); }} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-white"><RotateCcw className="h-3.5 w-3.5" />{isEn ? "Clear canvas" : "Canvas leeren"}</button>
        <button type="button" onClick={inspectFlow} className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-orange-400"><Play className="h-3.5 w-3.5" />{isEn ? "Check flow" : "Ablauf prüfen"}</button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[238px_minmax(0,1fr)]">
        <aside className="min-h-0 max-h-44 overflow-y-auto border-b border-white/[.08] bg-[#14141c] p-3 lg:max-h-none lg:border-b-0 lg:border-r">
          <h3 className="text-xs font-bold text-white">{isEn ? "Functions for this agent" : "Funktionen für diesen Agenten"}</h3>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{isEn ? "Click to add a node, then connect it on the canvas. A function may appear more than once." : "Klicke zum Hinzufügen. Verbinde den Node im Canvas. Eine Funktion darf mehrfach vorkommen."}</p>
          <div className="mt-3 space-y-1.5">
            {apps.map((app) => <button key={app.id} type="button" onClick={() => addApp(app.id)} className="flex w-full items-start gap-2.5 rounded-lg border border-white/[.07] bg-white/[.025] px-2.5 py-2 text-left hover:border-orange-400/40 hover:bg-orange-400/[.05]">
              <span className="text-lg leading-none">{app.icon}</span><span className="min-w-0"><span className="block truncate text-[11px] font-semibold text-slate-200">{isEn ? app.nameEn : app.nameDe}</span><span className="mt-0.5 block text-[10px] leading-tight text-slate-500 line-clamp-2">{isEn ? app.descriptionEn : app.descriptionDe}</span></span>
            </button>)}
          </div>
          <details className="mt-4 border-t border-white/[.08] pt-3 text-[10px] text-slate-400">
            <summary className="cursor-pointer font-semibold text-slate-300">{isEn ? "Agent rules" : "Agenten-Regeln"}</summary>
            <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={settings.useMemory} onChange={(event) => onSettingsChange((current) => ({ ...current, useMemory: event.target.checked }))} className="accent-orange-400" />{isEn ? "Use shared memory" : "Geteiltes Memory nutzen"}</label>
            <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={settings.requireActionApproval} onChange={(event) => onSettingsChange((current) => ({ ...current, requireActionApproval: event.target.checked }))} className="accent-orange-400" />{isEn ? "Ask before consequential actions" : "Vor wichtigen Aktionen nachfragen"}</label>
            <label className="mt-3 block">{isEn ? "Working instructions" : "Arbeitsanweisung"}<textarea value={settings.customInstructions} onChange={(event) => onSettingsChange((current) => ({ ...current, customInstructions: event.target.value.slice(0, 2000) }))} maxLength={2000} rows={3} className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-black/25 p-2 text-[11px] text-white focus:border-orange-400 focus:outline-none" /></label>
          </details>
        </aside>

        <div className="min-h-0 flex flex-col">
          <div ref={canvasScrollRef} className="min-h-0 flex-1 overflow-auto bg-[radial-gradient(circle,#30303b_1px,transparent_1px)] bg-[length:20px_20px]" aria-label={isEn ? "Workflow canvas" : "Workflow-Canvas"}>
            <div ref={stageRef} className="relative touch-none" style={{ width: stageWidth, height: stageHeight }} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onPointerDown={(event) => { if (event.target === stageRef.current) setSelectedNodeId(null); }}>
              <svg className="pointer-events-none absolute inset-0" width={stageWidth} height={stageHeight} aria-hidden="true">
                {graph.edges.map((edge) => {
                  const source = nodeMap.get(edge.source), target = nodeMap.get(edge.target);
                  if (!source || !target) return null;
                  return <path key={edge.id} d={edgePath(source, { x: target.x, y: target.y + NODE_HEIGHT / 2 })} fill="none" stroke={edge.id === "trigger-agent" ? (agent?.color || "#fb923c") : "#a26b4b"} strokeWidth="2" opacity="0.8" />;
                })}
                {pendingNode && pointer && <path d={edgePath(pendingNode, pointer)} fill="none" stroke="#fb923c" strokeWidth="2" strokeDasharray="6 5" />}
              </svg>
              {graph.nodes.map((node) => {
                const app = node.appId ? appMap.get(node.appId) : undefined;
                const isSelected = selectedNodeId === node.id;
                const isCore = node.type !== "app";
                return <div key={node.id} style={{ left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT, borderColor: isSelected ? (agent?.color || "#fb923c") : undefined }} className={`absolute flex items-center gap-2.5 rounded-xl border bg-[#191922] px-3 shadow-[0_12px_30px_rgba(0,0,0,.35)] ${isSelected ? "ring-1 ring-orange-400/50" : "border-[#383844]"}`} onPointerDown={(event) => startDrag(event, node)}>
                  {node.type === "app" && <button type="button" data-workflow-input={node.id} aria-label={`${isEn ? "Input" : "Eingang"}: ${labelFor(node)}`} onPointerDown={(event) => { event.stopPropagation(); if (pendingSourceId) connect(pendingSourceId, node.id); }} onClick={(event) => event.stopPropagation()} className={`absolute -left-2 top-[33px] h-3.5 w-3.5 rounded-full border-2 border-[#191922] ${pendingSourceId ? "bg-orange-400" : "bg-slate-500 hover:bg-orange-400"}`} />}
                  <span className="text-xl">{node.type === "trigger" ? "💬" : node.type === "agent" ? "🤖" : (app?.icon || "◈")}</span>
                  <span className="min-w-0"><span className="block text-[10px] uppercase tracking-wide text-slate-500">{node.type === "trigger" ? (isEn ? "Trigger" : "Start") : node.type === "agent" ? (isEn ? "Agent" : "Agent") : (isEn ? "Function" : "Funktion")}</span><strong className="block truncate text-xs text-white">{labelFor(node)}</strong>{node.type === "app" && <span className="block truncate text-[10px] text-slate-500">{app?.shortName}</span>}</span>
                  {node.type !== "trigger" && <button type="button" aria-label={`${isEn ? "Connect from" : "Verbinden von"} ${labelFor(node)}`} onPointerDown={(event) => startConnection(event, node.id)} onClick={(event) => event.stopPropagation()} className="absolute -right-2 top-[33px] h-3.5 w-3.5 rounded-full border-2 border-[#191922] bg-orange-400 hover:bg-orange-300" />}
                  {isSelected && !isCore && <Check className="absolute bottom-1.5 right-2 h-3 w-3 text-orange-400" />}
                </div>;
              })}
              <p className="pointer-events-none absolute bottom-3 left-4 rounded-md bg-black/35 px-2 py-1 text-[10px] text-slate-500">{isEn ? "Drag nodes · connect output to input · select + Delete to remove" : "Nodes ziehen · Ausgang mit Eingang verbinden · auswählen + Entf zum Löschen"}</p>
            </div>
          </div>
          <div className="h-32 shrink-0 overflow-auto border-t border-white/[.08] bg-[#14141c] px-4 py-2.5 text-[11px] text-slate-400">
            <div className="flex flex-wrap items-center gap-2"><Link2 className="h-3.5 w-3.5 text-orange-400" /><strong className="text-slate-200">{isEn ? "Flow inspection" : "Ablaufprüfung"}</strong><span className="text-slate-600">·</span><span>{getWorkflowAppIds(graph).length} {isEn ? "active functions" : "aktive Funktionen"}</span>{notice && <span className="text-orange-300">{notice}</span>}</div>
            {inspection.length ? <ol className="mt-1.5 space-y-0.5 font-mono text-[10px]">{inspection.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}</ol> : <p className="mt-1.5 text-[10px] text-slate-500">{isEn ? "Check the structure to see order and disconnected nodes. This editor does not execute external apps." : "Prüfe die Struktur, um Reihenfolge und offene Nodes zu sehen. Dieser Editor führt keine externen Apps aus."}</p>}
            {selectedNode && relatedEdges.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="text-[10px] text-slate-500">{isEn ? "Connections" : "Verbindungen"}:</span>{relatedEdges.map((edge) => <button key={edge.id} type="button" onClick={() => onGraphChange((current) => ({ ...current, edges: current.edges.filter((item) => item.id !== edge.id) }))} className="inline-flex items-center gap-1 rounded border border-white/10 px-1.5 py-0.5 text-[10px] hover:border-red-400/50 hover:text-red-300" title={isEn ? "Remove connection" : "Verbindung entfernen"}>{labelFor(nodeMap.get(edge.source))} → {labelFor(nodeMap.get(edge.target))}<Trash2 className="h-3 w-3" /></button>)}</div>}
            {selectedNode?.type === "app" && <button type="button" onClick={() => removeNode(selectedNode.id)} className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-red-300 hover:text-red-200"><Trash2 className="h-3 w-3" />{isEn ? "Remove selected node" : "Ausgewählten Node entfernen"}</button>}
          </div>
        </div>
      </div>
    </div>
  );
};
