// Stable storage IDs preserve existing conversations and plugin assignments.
export const AGENT_GROUPS = [
  { id: "syntax", name: "Papaya", members: ["syntax", "neo", "vega"], role: "KI, Analyse & Entwicklung", color: "#ff9b38" },
  { id: "pulse", name: "Mango", members: ["pulse", "globe"], role: "Kommunikation & Recherche", color: "#ffc93c" },
  { id: "chronos", name: "Kiwi", members: ["chronos", "oracle", "odin"], role: "Organisation, Finanzen & Sicherheit", color: "#96ce75" },
];

export function canonicalAgentId(value: string = "syntax"): string {
  const id = value.toLowerCase();
  if (["maze", "jarvis", "papaya"].includes(id)) return "syntax";
  return AGENT_GROUPS.find(group => group.id === id || group.name.toLowerCase() === id || group.members.includes(id))?.id || id;
}

export function mergeAgentChats<T extends { id: string; role?: string }>(chats: Record<string, T[]>): Record<string, T[]> {
  const merged = { ...chats };
  for (const group of AGENT_GROUPS) {
    const seen = new Set<string>();
    const members = group.id === "syntax" ? [...group.members, "maze", "jarvis"] : group.members;
    merged[group.id] = members.flatMap(id => Array.isArray(chats[id]) ? chats[id] : []).filter(message => {
      if (!message || typeof message.id !== "string" || seen.has(message.id)) return false;
      seen.add(message.id);
      return true;
    });
  }
  // Original member histories remain available for recovery; only three agents are active.
  return merged;
}
