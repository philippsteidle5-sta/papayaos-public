export type WorkflowNodeType = "trigger" | "agent" | "app";

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  appId?: string;
  x: number;
  y: number;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface AgentWorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowPlan {
  orderedNodeIds: string[];
  orderedAppIds: string[];
  disconnectedNodeIds: string[];
  hasCycle: boolean;
  agentConnected: boolean;
}

const STORAGE_KEY = "papaya_agent_workflow_graphs_v1";
const NODE_LIMIT = 60;
const EDGE_LIMIT = 120;

const coreNodes: WorkflowNode[] = [
  { id: "trigger", type: "trigger", x: 42, y: 236 },
  { id: "agent", type: "agent", x: 312, y: 236 },
];
const coreEdge: WorkflowEdge = { id: "trigger-agent", source: "trigger", target: "agent" };

export function createAgentWorkflowGraph(appIds: string[]): AgentWorkflowGraph {
  const uniqueIds = Array.from(new Set(appIds));
  const apps = uniqueIds.map((appId, index): WorkflowNode => ({
    id: `app-${appId}`,
    type: "app",
    appId,
    x: 610 + (index % 2) * 236,
    y: 42 + Math.floor(index / 2) * 112,
  }));
  return {
    nodes: [...coreNodes.map((node) => ({ ...node })), ...apps],
    edges: [coreEdge, ...apps.map((node) => ({ id: `agent-${node.id}`, source: "agent", target: node.id }))],
  };
}

export function normalizeAgentWorkflowGraph(value: unknown, validAppIds: string[]): AgentWorkflowGraph {
  const validIds = new Set(validAppIds);
  if (!value || typeof value !== "object") return createAgentWorkflowGraph([]);
  const candidate = value as Partial<AgentWorkflowGraph>;
  const seen = new Set<string>();
  const nodes: WorkflowNode[] = [];
  for (const raw of Array.isArray(candidate.nodes) ? candidate.nodes.slice(0, NODE_LIMIT) : []) {
    if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || seen.has(raw.id) || raw.id === "trigger" || raw.id === "agent") continue;
    if (raw.type !== "app" || typeof raw.appId !== "string" || !validIds.has(raw.appId)) continue;
    if (nodes.length >= NODE_LIMIT - coreNodes.length) break;
    seen.add(raw.id);
    nodes.push({
      id: raw.id.slice(0, 80),
      type: "app",
      appId: raw.appId,
      x: Number.isFinite(raw.x) ? Math.max(0, Math.min(2400, raw.x)) : 610,
      y: Number.isFinite(raw.y) ? Math.max(0, Math.min(1800, raw.y)) : 80,
    });
  }
  const savedCoreNodes = Array.isArray(candidate.nodes) ? candidate.nodes : [];
  const allNodes = [
    ...coreNodes.map((node) => {
      const saved = savedCoreNodes.find((item) => item?.id === node.id && item.type === node.type);
      return saved ? {
        ...node,
        x: Number.isFinite(saved.x) ? Math.max(0, Math.min(2400, saved.x)) : node.x,
        y: Number.isFinite(saved.y) ? Math.max(0, Math.min(1800, saved.y)) : node.y,
      } : { ...node };
    }),
    ...nodes,
  ];
  const knownIds = new Set(allNodes.map((node) => node.id));
  const edgeKeys = new Set<string>();
  const edges: WorkflowEdge[] = [coreEdge];
  edgeKeys.add("trigger:agent");
  for (const raw of Array.isArray(candidate.edges) ? candidate.edges.slice(0, EDGE_LIMIT) : []) {
    if (!raw || typeof raw !== "object" || typeof raw.source !== "string" || typeof raw.target !== "string") continue;
    if (!knownIds.has(raw.source) || !knownIds.has(raw.target) || raw.source === raw.target) continue;
    if (raw.target === "trigger" || raw.source === "trigger" || raw.target === "agent") continue;
    const key = `${raw.source}:${raw.target}`;
    if (edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    edges.push({ id: key, source: raw.source, target: raw.target });
  }
  return { nodes: allNodes, edges };
}

function readGraphs(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function getSavedAgentWorkflowGraph(agentId: string, validAppIds: string[]): AgentWorkflowGraph | null {
  const saved = readGraphs()[agentId.toLowerCase()];
  return saved ? normalizeAgentWorkflowGraph(saved, validAppIds) : null;
}

export function getAgentWorkflowGraph(agentId: string, enabledAppIds: string[], validAppIds: string[]): AgentWorkflowGraph {
  return getSavedAgentWorkflowGraph(agentId, validAppIds) || createAgentWorkflowGraph(enabledAppIds);
}

export function saveAgentWorkflowGraph(agentId: string, graph: AgentWorkflowGraph, validAppIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const graphs = readGraphs();
    graphs[agentId.toLowerCase()] = normalizeAgentWorkflowGraph(graph, validAppIds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(graphs));
    window.dispatchEvent(new CustomEvent("syntax_agent_workflow_graph_updated", { detail: { agentId } }));
  } catch (error) {
    console.error("Failed to save agent workflow graph", error);
  }
}

export function resetAgentWorkflowGraph(agentId: string): void {
  if (typeof window === "undefined") return;
  try {
    const graphs = readGraphs();
    delete graphs[agentId.toLowerCase()];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(graphs));
    window.dispatchEvent(new CustomEvent("syntax_agent_workflow_graph_updated", { detail: { agentId } }));
  } catch (error) {
    console.error("Failed to reset agent workflow graph", error);
  }
}

export function getWorkflowAppIds(graph: AgentWorkflowGraph): string[] {
  return Array.from(new Set(getWorkflowPlan(graph).orderedAppIds));
}

export function reconcileWorkflowGraphApps(graph: AgentWorkflowGraph, enabledAppIds: string[]): AgentWorkflowGraph {
  const enabled = new Set(enabledAppIds);
  const nodes = graph.nodes.filter((node) => node.type !== "app" || (node.appId && enabled.has(node.appId)));
  const represented = new Set(nodes.filter((node) => node.type === "app").map((node) => node.appId));
  for (const appId of enabled) {
    if (represented.has(appId)) continue;
    const count = nodes.filter((node) => node.type === "app").length;
    nodes.push({ id: `app-${appId}`, type: "app", appId, x: 610 + (count % 2) * 236, y: 42 + Math.floor(count / 2) * 112 });
  }
  const knownIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => knownIds.has(edge.source) && knownIds.has(edge.target));
  for (const node of nodes) {
    if (node.type === "app" && !graph.nodes.some((old) => old.id === node.id)) {
      edges.push({ id: `agent-${node.id}`, source: "agent", target: node.id });
    }
  }
  const connectedIds = new Set(getWorkflowAppIds({ nodes, edges }));
  for (const appId of enabled) {
    if (connectedIds.has(appId)) continue;
    const node = nodes.find((item) => item.type === "app" && item.appId === appId);
    if (node) edges.push({ id: `agent-${node.id}`, source: "agent", target: node.id });
  }
  return { nodes, edges };
}

export function getWorkflowPlan(graph: AgentWorkflowGraph): WorkflowPlan {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const adjacency = new Map(graph.nodes.map((node) => [node.id, [] as string[]]));
  for (const edge of graph.edges) {
    if (byId.has(edge.source) && byId.has(edge.target)) adjacency.get(edge.source)!.push(edge.target);
  }
  const reachable = new Set<string>();
  const queue = ["trigger"];
  while (queue.length) {
    const id = queue.shift()!;
    if (reachable.has(id) || !byId.has(id)) continue;
    reachable.add(id);
    queue.push(...(adjacency.get(id) || []));
  }
  const indegree = new Map(Array.from(reachable, (id) => [id, 0]));
  for (const edge of graph.edges) {
    if (reachable.has(edge.source) && reachable.has(edge.target)) indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1);
  }
  const ready = graph.nodes.filter((node) => reachable.has(node.id) && indegree.get(node.id) === 0).map((node) => node.id);
  const orderedNodeIds: string[] = [];
  while (ready.length) {
    const id = ready.shift()!;
    orderedNodeIds.push(id);
    for (const next of adjacency.get(id) || []) {
      if (!reachable.has(next)) continue;
      const degree = (indegree.get(next) || 0) - 1;
      indegree.set(next, degree);
      if (degree === 0) ready.push(next);
    }
  }
  return {
    orderedNodeIds,
    orderedAppIds: orderedNodeIds.map((id) => byId.get(id)).filter((node) => node?.type === "app" && node.appId).map((node) => node!.appId!),
    disconnectedNodeIds: graph.nodes.filter((node) => node.type === "app" && !reachable.has(node.id)).map((node) => node.id),
    hasCycle: orderedNodeIds.length !== reachable.size,
    agentConnected: reachable.has("agent"),
  };
}
