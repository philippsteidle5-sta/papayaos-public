import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Mail, RefreshCw, Search, Users } from "lucide-react";

type WaitlistStatus = "NEW" | "CONTACTED" | "INVITED";
type WaitlistEntry = {
  id: string;
  email: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  status: WaitlistStatus;
};

const statusLabels: Record<WaitlistStatus, string> = {
  NEW: "Neu",
  CONTACTED: "Kontaktiert",
  INVITED: "Eingeladen",
};

export function AdminWaitlistTab() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<WaitlistStatus | "ALL">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/beta-waitlist", { credentials: "same-origin" });
      if (!response.ok) throw new Error(response.status === 403 ? "Admin-Zugang erforderlich." : "Beta-Liste konnte nicht geladen werden.");
      const data = await response.json();
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Beta-Liste konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const filtered = useMemo(() => entries.filter((entry) => {
    const matchesStatus = filter === "ALL" || entry.status === filter;
    const matchesQuery = entry.email.toLowerCase().includes(query.trim().toLowerCase());
    return matchesStatus && matchesQuery;
  }), [entries, filter, query]);

  async function setStatus(entry: WaitlistEntry, status: WaitlistStatus) {
    setUpdatingId(entry.id);
    try {
      const response = await fetch(`/api/admin/beta-waitlist/${encodeURIComponent(entry.id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Status konnte nicht gespeichert werden.");
      const data = await response.json();
      setEntries((previous) => previous.map((item) => item.id === entry.id ? data.entry : item));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status konnte nicht gespeichert werden.");
    } finally {
      setUpdatingId(null);
    }
  }

  function exportCsv() {
    const cell = (value: string) => `"${(/^[=+\-@]/.test(value) ? "'" : "") + value.replace(/"/g, '""')}"`;
    const rows = [
      ["E-Mail", "Eingetragen", "Status", "Quelle"],
      ...filtered.map((entry) => [entry.email, entry.createdAt, statusLabels[entry.status], entry.source]),
    ];
    const csv = "\uFEFF" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `papayaos-beta-warteliste-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const newCount = entries.filter((entry) => entry.status === "NEW").length;
  const invitedCount = entries.filter((entry) => entry.status === "INVITED").length;

  return (
    <section className="flex-1 min-h-0 space-y-4 overflow-y-auto custom-scrollbar" aria-label="Beta-Warteliste">
      <div className="rounded-2xl border border-orange-500/25 bg-gradient-to-r from-orange-500/10 via-zinc-900 to-pink-500/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-orange-300 text-xs font-semibold uppercase tracking-[0.2em]"><Mail className="h-4 w-4" /> Beta Access</div>
            <h3 className="mt-2 text-xl font-bold text-white">Warteliste</h3>
            <p className="mt-1 text-xs text-zinc-400">Echte Eintragungen von der aktuellen Verkaufsseite. Eine Einladung wird hier nur markiert, nicht automatisch verschickt.</p>
          </div>
          <button type="button" onClick={() => { setLoading(true); void refresh(); }} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:border-orange-500/50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Aktualisieren</button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[["Eintragungen", entries.length], ["Neu", newCount], ["Eingeladen", invitedCount]].map(([label, count]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-black/25 p-3"><div className="text-xl font-bold text-white">{count}</div><div className="text-[11px] text-zinc-400">{label}</div></div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[190px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><input aria-label="E-Mail suchen" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="E-Mail suchen" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-orange-500" /></label>
        <select aria-label="Status filtern" value={filter} onChange={(event) => setFilter(event.target.value as WaitlistStatus | "ALL")} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"><option value="ALL">Alle Status</option><option value="NEW">Neu</option><option value="CONTACTED">Kontaktiert</option><option value="INVITED">Eingeladen</option></select>
        <button type="button" disabled={filtered.length === 0} onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:border-orange-500/50 disabled:opacity-40"><Download className="h-3.5 w-3.5" /> CSV</button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">{error}</div>}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="border-b border-zinc-800 bg-zinc-950 text-zinc-400"><tr><th className="p-3">E-Mail</th><th className="p-3">Eingetragen</th><th className="p-3">Quelle</th><th className="p-3">Status</th></tr></thead>
          <tbody className="divide-y divide-zinc-800/70">
            {filtered.map((entry) => <tr key={entry.id} className="text-zinc-200 hover:bg-white/[0.03]"><td className="p-3 font-medium text-white">{entry.email}</td><td className="p-3 text-zinc-400">{new Date(entry.createdAt).toLocaleString("de-DE")}</td><td className="p-3 text-zinc-400">{entry.source}</td><td className="p-3"><select aria-label={`Status für ${entry.email}`} value={entry.status} disabled={updatingId === entry.id} onChange={(event) => void setStatus(entry, event.target.value as WaitlistStatus)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-orange-200 disabled:opacity-50"><option value="NEW">Neu</option><option value="CONTACTED">Kontaktiert</option><option value="INVITED">Eingeladen</option></select></td></tr>)}
            {!loading && filtered.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-zinc-500"><Users className="mx-auto mb-2 h-5 w-5" />{entries.length ? "Keine passenden Eintragungen." : "Noch keine Beta-Eintragungen vorhanden."}</td></tr>}
            {loading && entries.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-zinc-500">Beta-Liste wird geladen…</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
