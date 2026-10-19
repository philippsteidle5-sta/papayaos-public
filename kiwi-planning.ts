import type { Express } from 'express';
import { randomUUID } from 'node:crypto';

type Interval = { start: string; end: string };
type Task = { id: string; title: string; minutes: number };
type Block = Interval & { taskId: string; title: string };
type Run = {
  id: string; status: 'awaiting_approval' | 'approved'; createdAt: string;
  expiresAt: string; timeZone: string; blocks: Block[]; unscheduled: Task[];
  approvedAt?: string;
};
type State = { runs: Run[]; plans: Record<string, Block[]> };
type Options = {
  app: Express;
  getUser: (req: any) => { id: string } | undefined;
  read: <T>(key: string, fallback: T) => T;
  write: (key: string, value: unknown) => void;
};

// Absolute instants preserve the caller's timezone and daylight-saving choices.
function interval(value: any): { start: number; end: number } {
  const stamp = (s: unknown) => typeof s === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(s) ? Date.parse(s) : NaN;
  const start = stamp(value?.start), end = stamp(value?.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('Zeitfenster benötigen gültige Start- und Endzeiten mit Zeitzone.');
  return { start, end };
}

export function installKiwiPlanning(o: Options) {
  const key = (id: string) => `kiwi-planning:${id}`;
  const load = (id: string) => o.read<State>(key(id), { runs: [], plans: {} });
  o.app.get('/api/kiwi/plans', (req, res) => {
    const user = o.getUser(req);
    if (!user) return res.sendStatus(401);
    return res.json(load(user.id));
  });
  o.app.post('/api/kiwi/plans/propose', (req, res) => {
    const user = o.getUser(req);
    if (!user) return res.sendStatus(401);
    try {
      const { tasks, availability, busy, timeZone } = req.body || {};
      if (!Array.isArray(tasks) || !tasks.length || tasks.length > 50 ||
          !Array.isArray(availability) || !availability.length || availability.length > 50 ||
          !Array.isArray(busy) || busy.length > 500 || typeof timeZone !== 'string') {
        return res.status(422).json({ error: 'MISSING_PLANNING_INPUT', message: 'Aufgaben mit Zeitbedarf, freie Zeitfenster, belegte Zeiten und Zeitzone sind erforderlich.' });
      }
      new Intl.DateTimeFormat('de-DE', { timeZone });
      const ids = new Set<string>();
      for (const task of tasks) {
        if (typeof task?.id !== 'string' || !task.id || task.id.length > 100 || ids.has(task.id) ||
            typeof task.title !== 'string' || !task.title.trim() || task.title.length > 200 ||
            !Number.isInteger(task.minutes) || task.minutes < 5 || task.minutes > 480) throw new Error('Jede Aufgabe benötigt eine eindeutige Kennung, einen Titel und 5 bis 480 Minuten Zeitbedarf.');
        ids.add(task.id);
      }
      const windows = availability.map(interval).sort((a, b) => a.start - b.start);
      const occupied = busy.map(interval);
      const now = Date.now();
      if (windows.some(w => w.start < now || w.end - w.start > 86400000) ||
          windows[windows.length - 1].end - windows[0].start > 7 * 86400000) throw new Error('Bitte freie Zeitfenster für höchstens sieben zukünftige Tage angeben.');
      const state = load(user.id);
      // Existing approved plans also block time, preventing overlapping approvals.
      occupied.push(...Object.values(state.plans).flat().map(interval));
      const blocks: Block[] = [], unscheduled: Task[] = [];
      for (const task of tasks as Task[]) {
        let placed = false;
        for (const window of windows) {
          let start = window.start;
          const duration = task.minutes * 60000;
          for (const conflict of occupied.slice().sort((a, b) => a.start - b.start)) {
            if (conflict.end <= start || conflict.start >= window.end) continue;
            if (start + duration <= conflict.start) break;
            start = Math.max(start, conflict.end);
          }
          if (start + duration > window.end) continue;
          blocks.push({ taskId: task.id, title: task.title.trim(), start: new Date(start).toISOString(), end: new Date(start + duration).toISOString() });
          occupied.push({ start, end: start + duration });
          placed = true;
          break;
        }
        if (!placed) unscheduled.push(task);
      }
      const run: Run = { id: randomUUID(), status: 'awaiting_approval', createdAt: new Date().toISOString(), expiresAt: new Date(now + 1800000).toISOString(), timeZone, blocks, unscheduled };
      state.runs = [...state.runs.filter(r => r.status === 'approved' || Date.parse(r.expiresAt) > now), run].slice(-100);
      o.write(key(user.id), state);
      return res.status(201).json({ run, calendarWritten: false });
    } catch (error) {
      return res.status(422).json({ error: 'INVALID_PLANNING_INPUT', message: error instanceof Error ? error.message : 'Planung konnte nicht erstellt werden.' });
    }
  });
  o.app.post('/api/kiwi/plans/:id/approve', (req, res) => {
    const user = o.getUser(req);
    if (!user) return res.sendStatus(401);
    const state = load(user.id), run = state.runs.find(r => r.id === req.params.id);
    if (!run) return res.sendStatus(404);
    if (run.status === 'approved') return res.json({ run, verified: true, calendarWritten: false });
    if (req.body?.approve !== true) return res.status(422).json({ error: 'EXPLICIT_APPROVAL_REQUIRED' });
    if (Date.parse(run.expiresAt) <= Date.now() || run.blocks.some(b => Date.parse(b.start) <= Date.now())) return res.status(409).json({ error: 'PLAN_EXPIRED' });
    const existing = Object.values(state.plans).flat().map(interval);
    if (run.blocks.some(b => { const candidate = interval(b); return existing.some(e => candidate.start < e.end && candidate.end > e.start); })) return res.status(409).json({ error: 'PLAN_CONFLICT', message: 'Ein inzwischen freigegebener Plan belegt diese Zeit. Bitte neu planen.' });
    run.status = 'approved';
    run.approvedAt = new Date().toISOString();
    state.plans[run.id] = run.blocks;
    o.write(key(user.id), state);
    const saved = load(user.id);
    if (JSON.stringify(saved.plans[run.id]) !== JSON.stringify(run.blocks)) return res.status(500).json({ error: 'PLAN_SAVE_NOT_VERIFIED' });
    return res.json({ run, verified: true, calendarWritten: false });
  });
}
