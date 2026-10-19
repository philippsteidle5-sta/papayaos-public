export interface KiwiPlanInput {
  timeZone: string;
  tasks: { id: string; title: string; minutes: number }[];
  availability: { start: string; end: string }[];
  busy: { start: string; end: string }[];
}

export interface KiwiPlanRun {
  id: string;
  status: 'awaiting_approval' | 'approved';
  createdAt: string;
  expiresAt: string;
  timeZone: string;
  blocks: { taskId: string; title: string; start: string; end: string }[];
  unscheduled: KiwiPlanInput['tasks'];
  approvedAt?: string;
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/kiwi/plans${path}`, body === undefined ? undefined : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'Kiwi-Planung ist momentan nicht erreichbar.');
  return payload as T;
}

export const getKiwiPlans = () => request<{ runs: KiwiPlanRun[]; plans: Record<string, KiwiPlanRun['blocks']> }>('');
export const proposeKiwiPlan = (input: KiwiPlanInput) => request<{ run: KiwiPlanRun; calendarWritten: false }>('/propose', input);
// Called only by the explicit approval control, never automatically after proposing.
export const approveKiwiPlan = (id: string) => request<{ run: KiwiPlanRun; verified: boolean; calendarWritten: false }>(`/${encodeURIComponent(id)}/approve`, { approve: true });
