import type { CaseDetail, CaseListItem, CaseQuery, ReferenceData, Summary, Timeline, TimelineEvent, User } from "@contracts/v1";
import { canReadCase, permissionsFor } from "@contracts/access";
import { demand } from "./errors";

export function queryParams(url: URL, refs: ReferenceData, filterOnly = false): CaseQuery {
  const accepted = ["search", "status", "divisionId", "mechanism", "plant", "mlState", "priorityReview", ...(filterOnly ? [] : ["page", "pageSize", "sort"])];
  for (const key of url.searchParams.keys()) demand(accepted.includes(key) && url.searchParams.getAll(key).length === 1, 400, "VALIDATION_ERROR", "Invalid query parameter: " + key);
  const q = Object.fromEntries(url.searchParams) as Record<string, string>;
  const lists: Record<string, string[]> = {
    status: ["active", "all", "draft", "submitted", "needs_revision", "investigating", "action_in_progress", "awaiting_verification", "closed"],
    divisionId: refs.divisions.map(d => d.id), mechanism: refs.mechanisms, plant: refs.plants,
    mlState: ["ranked", "abstain", "unavailable"], priorityReview: ["reviewed", "not_reviewed"],
    sort: ["priority", "updated_desc", "occurred_desc"],
  };
  for (const [key, options] of Object.entries(lists)) if (q[key] !== undefined) demand(options.includes(q[key]), 400, "VALIDATION_ERROR", "Invalid filter: " + key);
  const page = q.page === undefined ? 1 : Number(q.page), pageSize = q.pageSize === undefined ? 10 : Number(q.pageSize);
  demand(Number.isSafeInteger(page) && page >= 1 && [5, 10, 20].includes(pageSize), 400, "VALIDATION_ERROR", "Invalid pagination.");
  demand((q.search?.length ?? 0) <= 240, 400, "VALIDATION_ERROR", "Search is too long.");
  return { ...q, page, pageSize, search: q.search?.trim() } as CaseQuery;
}
export function visibleCases(items: CaseDetail[], user: User, q: CaseQuery): CaseDetail[] {
  const search = q.search?.toLowerCase();
  const result = items.filter(c => canReadCase(user, c)
    && (q.status === "all" || (q.status && q.status !== "active" ? c.status === q.status : c.status !== "closed"))
    && (!q.divisionId || c.divisionIds.includes(q.divisionId))
    && (!q.mechanism || c.mechanism === q.mechanism) && (!q.plant || c.plant === q.plant)
    && (!q.mlState || c.mlState === q.mlState) && (!q.priorityReview || c.priorityReview === q.priorityReview)
    && (!search || [c.title, c.tag, c.component, c.plant].some(v => v?.toLowerCase().includes(search))));
  const priorities = { high: 0, medium: 1, low: 2 };
  result.sort((a, b) => {
    let diff = 0;
    if (!q.sort || q.sort === "priority") diff = (a.priority ? priorities[a.priority] : 3) - (b.priority ? priorities[b.priority] : 3);
    if (q.sort === "occurred_desc") diff = dateNumber(b.occurredAt) - dateNumber(a.occurredAt);
    else if (!diff) diff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    return diff || a.id.localeCompare(b.id);
  });
  return result;
}
function dateNumber(date: CaseDetail["occurredAt"]): number {
  if (!date.value || !["date", "timestamp"].includes(date.precision)) return -8640000000000000;
  const n = Date.parse(date.value);
  return Number.isFinite(n) ? n : -8640000000000000;
}
export function present(item: CaseDetail, user: User): CaseDetail { return { ...item, permissions: permissionsFor(user, item) }; }
export function listItem(item: CaseDetail, user: User): CaseListItem {
  const { eqType, monitoring, chronology, historicalFindings, rulesFindings, insight, conflicts, questions,
    actionReferences, suppressedActions, historicalActions, evidence, actions, activity, ...base } = present(item, user);
  return base;
}
export function summary(items: CaseDetail[]): Summary {
  const out: Summary = { totalCases: items.length, countsByStatus: { draft: 0, submitted: 0, needs_revision: 0, investigating: 0, action_in_progress: 0, awaiting_verification: 0, closed: 0 },
    awaitingReviewCount: 0, actualLossKusd: 0, potentialLossKusd: 0, summedIncidentDowntimeHours: 0,
    knownActualLossCount: 0, knownPotentialLossCount: 0, knownDowntimeCount: 0,
    impactScopeLabel: "Recorded impact of filtered cases; downtime is summed incident hours" };
  for (const item of items) {
    out.countsByStatus[item.status]++;
    if (item.status === "submitted") out.awaitingReviewCount++;
    if (item.impact.actualLossKusd !== null) { out.actualLossKusd += item.impact.actualLossKusd; out.knownActualLossCount++; }
    if (item.impact.potentialLossKusd !== null) { out.potentialLossKusd += item.impact.potentialLossKusd; out.knownPotentialLossCount++; }
    if (item.impact.downtimeHours !== null) { out.summedIncidentDowntimeHours += item.impact.downtimeHours; out.knownDowntimeCount++; }
  }
  out.actualLossKusd = Number(out.actualLossKusd.toFixed(2)); out.potentialLossKusd = Number(out.potentialLossKusd.toFixed(2));
  out.summedIncidentDowntimeHours = Number(out.summedIncidentDowntimeHours.toFixed(2));
  return out;
}
export function timeline(items: CaseDetail[]): Timeline {
  const events: TimelineEvent[] = [];
  for (const item of items) {
    events.push({ id: item.id + ":incident", caseId: item.id, title: item.title, kind: "incident", date: item.occurredAt, evidenceIds: item.sourceIncidentId ? [item.sourceIncidentId] : [] });
    events.push(...item.chronology.map(c => ({ id: c.id, caseId: item.id, title: c.text, kind: "chronology" as const, date: c.date, evidenceIds: c.evidenceIds })));
    events.push(...item.actions.map(a => ({ id: a.id, caseId: item.id, title: a.title, kind: "action_due" as const,
      date: { value: a.dueDate, precision: a.dueDate ? "date" as const : "unavailable" as const, provenance: "demo" as const }, evidenceIds: a.evidenceIds })));
  }
  const unknown = (e: TimelineEvent) => dateNumber(e.date) === -8640000000000000;
  events.sort((a, b) => Number(unknown(a)) - Number(unknown(b)) || dateNumber(a.date) - dateNumber(b.date) || a.id.localeCompare(b.id));
  return { items: events, undatedCount: events.filter(unknown).length };
}
