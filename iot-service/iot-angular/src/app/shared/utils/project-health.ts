/**
 * Device health of a project / owner, as computed by the backend
 * (iot-backend-go app/services/projecthealth — one SQL query using the SAME
 * freshness rule as telemetry-freshness.ts). Sent as `health` by
 * GET /projects, GET /owners and GET /owners/{id}/detail (also per project).
 *
 * Use this for every project/owner-level status so the projects list,
 * owners list and owner detail always show identical numbers.
 */
export interface ProjectHealth {
  nodes: number;
  fresh: number;
  stale: number;
  offline: number;
  nodata: number;
  sensors: number;
  openAlerts: number;
  lastSeenAt: string | null;
}

/** Overall verdict for a project/owner row. */
export type HealthState = 'problem' | 'warning' | 'ok' | 'empty';

export const EMPTY_HEALTH: ProjectHealth = {
  nodes: 0, fresh: 0, stale: 0, offline: 0, nodata: 0, sensors: 0, openAlerts: 0, lastSeenAt: null
};

/** Read `health` from an API item; null when the backend didn't send it (never invent zeros). */
export function healthOf(item: any): ProjectHealth | null {
  const h = item?.health;
  if (!h || typeof h !== 'object') return null;
  const n = (v: any) => Number(v) || 0;
  return {
    nodes: n(h.nodes), fresh: n(h.fresh), stale: n(h.stale), offline: n(h.offline),
    nodata: n(h.nodata), sensors: n(h.sensors), openAlerts: n(h.openAlerts),
    lastSeenAt: h.lastSeenAt || null
  };
}

/** Nodes not reporting right now (offline + never reported). */
export function deadNodes(h: ProjectHealth): number {
  return h.offline + h.nodata;
}

/**
 * problem = any node dead or any open alert; warning = only late (stale) nodes;
 * ok = every node fresh, no open alert; empty = no devices at all.
 */
export function healthState(h: ProjectHealth | null): HealthState {
  if (!h || h.nodes === 0) return 'empty';
  if (deadNodes(h) > 0 || h.openAlerts > 0) return 'problem';
  if (h.stale > 0) return 'warning';
  return 'ok';
}

export const HEALTH_LABEL: Record<HealthState, string> = {
  problem: 'Bermasalah',
  warning: 'Terlambat',
  ok: 'Normal',
  empty: 'Belum ada perangkat'
};

export const HEALTH_BADGE: Record<HealthState, string> = {
  problem: 'bg-danger-subtle text-danger',
  warning: 'bg-warning-subtle text-warning',
  ok: 'bg-success-subtle text-success',
  empty: 'bg-secondary-subtle text-secondary'
};

/** Sort weight: problems first, then late, then normal, then empty. */
export const HEALTH_ORDER: Record<HealthState, number> = { problem: 0, warning: 1, ok: 2, empty: 3 };

/** Sum several health objects (e.g. KPI totals over a list). */
export function sumHealth(list: (ProjectHealth | null)[]): ProjectHealth {
  const t: ProjectHealth = { ...EMPTY_HEALTH };
  for (const h of list) {
    if (!h) continue;
    t.nodes += h.nodes; t.fresh += h.fresh; t.stale += h.stale; t.offline += h.offline;
    t.nodata += h.nodata; t.sensors += h.sensors; t.openAlerts += h.openAlerts;
    if (h.lastSeenAt && (!t.lastSeenAt || Date.parse(h.lastSeenAt) > Date.parse(t.lastSeenAt))) t.lastSeenAt = h.lastSeenAt;
  }
  return t;
}
