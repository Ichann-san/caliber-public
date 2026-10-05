/**
 * DTO (contracts/v1) -> frozen view models (src/components/view-models.ts).
 *
 * Rules kept here: historical RCA, rules and ML stay separate groups; ML
 * score is a relative ranking score, never a percentage; null numbers are
 * "Not recorded", never 0; source dates are shown as given; demo people and
 * timestamps carry a Demo label; eqType null is "Unknown" (never guessed).
 */

import type {
  Action,
  ActionStatus,
  CaseDetail,
  CaseListItem,
  CaseStatus,
  Division,
  EvidenceRecord,
  Finding,
  Impact,
  Json,
  MlState,
  Summary,
  Timeline,
  TimelineEvent,
  User,
} from "@contracts/v1";
import type {
  ActionRefView,
  ActivityItemView,
  BreakdownRowView,
  CaseCardView,
  CaseDetailHeaderView,
  ChronologyItemView,
  EvidenceRecordView,
  EvidenceRefView,
  InsightGroupView,
  InsightItemView,
  MetricView,
  PersonRole,
  PersonView,
  PersonaView,
  ProvenanceLabelView,
  QuestionView,
  ReviewView,
  StatusView,
  SummaryView,
  TimelineLaneView,
  WithheldActionView,
} from "@/components/view-models";
import {
  NOT_RECORDED,
  formatDemoTimestamp,
  formatHours,
  formatCompactKusd,
  formatCompactNumber,
  formatKusd,
  formatRelativeDate,
  formatSourceDate,
  initials,
  shortEvidenceId,
} from "./format";
import { partitionReferences } from "./suppression";

export interface MapContext {
  divisions: Division[];
}

export function divisionName(ctx: MapContext, id: string | null | undefined): string | null {
  if (!id) return null;
  return ctx.divisions.find((d) => d.id === id)?.name ?? id;
}

export const caseHref = (id: string) => `/cases/${encodeURIComponent(id)}`;

const AVATARS = Array.from({ length: 7 }, (_, index) =>
  ["a", "b", "c"].map((variant) => `/avatars/user-${String(index + 1).padStart(2, "0")}${variant}.svg`),
).flat();

function avatarForUser(id: string): string {
  let hash = 0;
  for (const char of id) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return AVATARS[hash % AVATARS.length];
}

/* ---------- Labels ---------- */

export const DEMO_LABEL: ProvenanceLabelView = {
  kind: "demo",
  text: "Demo",
  title: "Simulated prototype state, not from the source record",
};
export const SOURCE_LABEL: ProvenanceLabelView = { kind: "source", text: "Source" };

export const displayPersonName = (name: string) => name.replace(/\s*\(Demo\)$/i, "");

const STATUS: Record<CaseStatus, StatusView> = {
  draft: { label: "Draft", tone: "neutral" },
  submitted: { label: "Submitted", tone: "info" },
  needs_revision: { label: "Needs revision", tone: "attention" },
  investigating: { label: "Investigating", tone: "progress" },
  action_in_progress: { label: "Action in progress", tone: "progress" },
  awaiting_verification: { label: "Awaiting verification", tone: "info" },
  closed: { label: "Closed", tone: "success" },
};
export const STATUS_ORDER: CaseStatus[] = [
  "draft",
  "submitted",
  "needs_revision",
  "investigating",
  "action_in_progress",
  "awaiting_verification",
  "closed",
];
export const statusView = (status: CaseStatus): StatusView => STATUS[status];

const ACTION_STATUS: Record<ActionStatus, StatusView> = {
  draft: { label: "Draft", tone: "neutral" },
  approved: { label: "Approved", tone: "info" },
  in_progress: { label: "In progress", tone: "progress" },
  completed: { label: "Completed", tone: "info" },
  verified: { label: "Verified", tone: "success" },
};
export const actionStatusView = (status: ActionStatus): StatusView => ACTION_STATUS[status];

const PRIORITY_TEXT = { high: "High", medium: "Medium", low: "Low" } as const;

export function reviewView(item: Pick<CaseListItem, "priority" | "priorityReview">): ReviewView {
  if (item.priorityReview === "reviewed" && item.priority) {
    return { reviewed: true, label: `Priority ${PRIORITY_TEXT[item.priority]}` };
  }
  return { reviewed: false, label: "Not yet reviewed" };
}

export const ML_LABEL: Record<MlState, ProvenanceLabelView> = {
  ranked: { kind: "ml", text: "ML ranked", title: "Offline ML O3 candidate ranking available" },
  abstain: { kind: "ml", text: "ML abstain", title: "The ranker abstained; this does not mean the asset is healthy" },
  unavailable: { kind: "unavailable", text: "Analysis not available" },
};

/* ---------- Impact ---------- */

export function impactMetrics(impact: Impact): MetricView[] {
  return [
    {
      label: "Downtime",
      value: formatHours(impact.downtimeHours),
      unit: "h",
      unavailableText: NOT_RECORDED,
    },
    {
      label: "Actual loss",
      value: formatKusd(impact.actualLossKusd),
      unavailableText: NOT_RECORDED,
    },
    {
      label: "Potential loss",
      value: formatKusd(impact.potentialLossKusd),
      unavailableText: NOT_RECORDED,
    },
  ];
}

/* ---------- People ---------- */

const ROLE_LABEL: Record<PersonRole, string> = {
  proposer: "Proposer",
  accountable_owner: "Accountable owner",
  assignee: "Assignee",
  historical_rca_pic: "Historical RCA PIC",
};

export function personView(ctx: MapContext, user: User | null, role: PersonRole): PersonView {
  return {
    role,
    roleLabel: ROLE_LABEL[role],
    name: user ? displayPersonName(user.displayName) : null,
    jobTitle: user?.jobTitle ?? null,
    division: divisionName(ctx, user?.divisionId),
    avatarSrc: user ? avatarForUser(user.id) : undefined,
    initials: user ? initials(user.displayName) : undefined,
    provenance: DEMO_LABEL,
    missingText: role === "assignee" ? "Not assigned" : NOT_RECORDED,
  };
}

export function historicalPicView(pic: string | null): PersonView {
  return {
    role: "historical_rca_pic",
    roleLabel: ROLE_LABEL.historical_rca_pic,
    name: pic,
    jobTitle: null,
    division: null,
    provenance: { kind: "source", text: "Source", title: "Historical PIC code from the RCA record, not mapped to a person" },
    missingText: NOT_RECORDED,
  };
}

const ACCESS_LABEL = { management: "Management", engineer: "Engineer", unassigned: "Unassigned staff" } as const;

export function personaView(ctx: MapContext, user: User): PersonaView {
  return {
    id: user.id,
    name: displayPersonName(user.displayName),
    jobTitle: user.jobTitle,
    accessLabel: ACCESS_LABEL[user.role],
    division: divisionName(ctx, user.divisionId),
  };
}

/* ---------- Card ---------- */

export function displayId(item: Pick<CaseListItem, "id" | "scenarioId">): string {
  if (item.scenarioId) return item.scenarioId.replace(/^DEMO-/i, "CASE-");
  const m = /^mock-case-[a-z0-9]+-(\d+)$/.exec(item.id);
  return m ? `NEW-${m[1]}` : item.id;
}

export function toCaseCard(ctx: MapContext, item: CaseListItem): CaseCardView {
  const dateDetailText = formatSourceDate(item.occurredAt);
  return {
    id: item.id,
    href: caseHref(item.id),
    displayId: displayId(item),
    title: item.title,
    dateText: formatRelativeDate(item.occurredAt.value) ?? dateDetailText,
    dateDetailText,
    identity: {
      tag: item.tag ?? NOT_RECORDED,
      component: item.component ?? NOT_RECORDED,
      mechanism: item.mechanism ?? NOT_RECORDED,
      plant: item.plant ?? NOT_RECORDED,
      division: divisionName(ctx, item.people.proposingDivisionId),
    },
    status: statusView(item.status),
    review: reviewView(item),
    impact: impactMetrics(item.impact),
    proposer: personView(ctx, item.people.proposer, "proposer"),
    owner: personView(ctx, item.people.accountableOwner, "accountable_owner"),
    insight: ML_LABEL[item.mlState],
  };
}

/* ---------- Evidence ---------- */

const EVIDENCE_KIND_LABEL: Record<string, string> = {
  source_record: "Source record",
  incident_field: "Incident field",
  rca_factor: "RCA factor",
  taxonomy_rule: "Taxonomy rule",
  rca_chronology: "RCA chronology",
  sensor_episode: "Sensor episode",
};

function kindLabel(kind: string): string {
  return EVIDENCE_KIND_LABEL[kind] ?? kind.replace(/_/g, " ");
}

export function evidenceRefs(detail: Pick<CaseDetail, "evidence"> | null, ids: string[]): EvidenceRefView[] {
  return ids.map((id) => {
    const record = detail?.evidence.find((e) => e.id === id);
    return { id, label: record ? `${kindLabel(record.kind)}: ${shortEvidenceId(id)}` : shortEvidenceId(id) };
  });
}

function evidenceProvenance(record: EvidenceRecord): ProvenanceLabelView {
  if (record.kind === "taxonomy_rule") return { kind: "rules", text: "Derived rule" };
  if (record.kind === "sensor_episode") return { kind: "source", text: "Source (derived)" };
  return SOURCE_LABEL;
}

function jsonText(payload: Json): string {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

export function evidenceRecordView(record: EvidenceRecord): EvidenceRecordView {
  const cls =
    record.payload && typeof record.payload === "object" && !Array.isArray(record.payload)
      ? (record.payload as Record<string, Json>).evidence_class
      : undefined;
  return {
    id: record.id,
    title: `${kindLabel(record.kind)}: ${shortEvidenceId(record.id)}`,
    provenance: evidenceProvenance(record),
    locator: record.sourceLocator ?? (record.sourceIds.length > 0 ? record.sourceIds.join("; ") : "Location not recorded"),
    // Rendered as text by EvidenceRecord; never injected as HTML.
    body: record.text ? `${record.text}\n\n${jsonText(record.payload)}` : jsonText(record.payload),
    classLabel: typeof cls === "string" ? cls : undefined,
  };
}

/* ---------- Chronology ---------- */

export function chronologyItems(detail: CaseDetail): ChronologyItemView[] {
  return detail.chronology.map((entry) => ({
    id: entry.id,
    dateText: entry.date.value,
    dateKind: !entry.date.value ? "undated" : entry.date.provenance === "demo" ? "demo" : "source",
    title: entry.text,
    evidence: evidenceRefs(detail, entry.evidenceIds),
  }));
}

/* ---------- Insight ---------- */

const FINDING_STATUS: Record<string, string> = {
  verified_ng: "Verified NG",
  checked_no_ng: "Checked, not NG",
  candidate_to_verify: "Candidate to verify",
  context: "Context",
  observed_signal: "Observed signal",
};

function findingItem(detail: CaseDetail, f: Finding): InsightItemView {
  return {
    id: f.id,
    text: f.text,
    category: f.category ?? undefined,
    statusLabel: f.status ? (FINDING_STATUS[f.status] ?? f.status.replace(/_/g, " ")) : undefined,
    evidence: evidenceRefs(detail, f.evidenceIds),
  };
}

export const ABSTAIN_CAVEAT =
  "Abstain does not mean the asset is healthy or that no historical RCA exists.";

export function insightGroups(detail: CaseDetail): InsightGroupView[] {
  const isNewReport = detail.sourceIncidentId === null;
  const newReason = "New report: no source record or RCA is linked yet.";

  const historical: InsightGroupView = {
    kind: "historical_rca",
    title: "Historical RCA findings",
    provenance: { kind: "source", text: "Source RCA" },
    state: isNewReport ? "unavailable" : "available",
    reason: isNewReport ? newReason : undefined,
    items: detail.historicalFindings.map((f) => findingItem(detail, f)),
  };

  const rules: InsightGroupView = {
    kind: "rules",
    title: "Rules context (Gate 4)",
    provenance: { kind: "rules", text: "Rules (Gate 4)" },
    state: isNewReport ? "unavailable" : "available",
    reason: isNewReport ? newReason : undefined,
    items: detail.rulesFindings.map((f) => findingItem(detail, f)),
  };

  const ins = detail.insight;
  const mlBase = {
    kind: "ml" as const,
    title: "ML candidate ranking",
    provenance: {
      kind: "ml" as const,
      text: "ML ranking",
      title: [ins.modelVersion, ins.validationBasis].filter(Boolean).join("; ") || undefined,
    },
  };
  let ml: InsightGroupView;
  if (ins.state === "ranked") {
    ml = {
      ...mlBase,
      state: "available",
      items: [...ins.candidates]
        .sort((a, b) => a.rank - b.rank)
        .map((c) => ({
          ...findingItem(detail, c.finding),
          rank: c.rank,
          scoreText: `Ranking score ${c.score.toFixed(2)}`,
        })),
    };
  } else if (ins.state === "abstain") {
    ml = { ...mlBase, state: "abstain", reason: ins.reason ?? undefined, caveat: ABSTAIN_CAVEAT, items: [] };
  } else {
    ml = { ...mlBase, state: "unavailable", reason: ins.reason ?? undefined, items: [] };
  }

  return [historical, rules, ml];
}

/* ---------- Questions ---------- */

export function questionViews(ctx: MapContext, detail: CaseDetail): QuestionView[] {
  return detail.questions.map((q) => {
    // The Gate 4 question text names its addressee; nothing else is inferred.
    const m = /^What does (.+?) know about/.exec(q.text);
    return {
      id: q.id,
      toDivision: m ? m[1] : "Involved divisions",
      question: q.text,
      why: "Generated by the Gate 4 rules (variant A) from the source record.",
      evidence: evidenceRefs(detail, q.evidenceIds),
    };
  });
}

/* ---------- Follow-up references ---------- */

const CATEGORY_LABEL: Record<string, string> = {
  CORRECTIVE: "Corrective",
  PREVENTIVE: "Preventive",
  "PRO-ACTIVE": "Pro-active",
  PROACTIVE: "Pro-active",
};

interface HistoricalActionLike {
  action_id?: Json;
  category?: Json;
  owner_division?: Json;
}

export function actionRefViews(
  ctx: MapContext,
  detail: CaseDetail,
): { items: ActionRefView[]; withheld: WithheldActionView[] } {
  const history = detail.historicalActions.filter(
    (h): h is { [key: string]: Json } => typeof h === "object" && h !== null && !Array.isArray(h),
  ) as HistoricalActionLike[];
  const { offered, withheld } = partitionReferences(detail);

  const items: ActionRefView[] = offered.map((ref) => {
    const hist = history.find((h) => typeof h.action_id === "string" && ref.evidenceIds.includes(h.action_id));
    const cat = typeof hist?.category === "string" ? hist.category : null;
    const owner = typeof hist?.owner_division === "string" ? hist.owner_division : null;
    return {
      id: ref.id,
      text: ref.text,
      categoryLabel: cat ? (CATEGORY_LABEL[cat] ?? cat) : "Reference",
      ownerDivision: owner ? divisionName(ctx, owner) : null,
      applicabilityLabel: "Needs applicability review",
      evidence: evidenceRefs(detail, ref.evidenceIds),
    };
  });

  return {
    items,
    withheld: withheld.map((w) => ({
      id: w.id,
      text: w.text ?? `Action reference ${shortEvidenceId(w.id)}`,
      reason: w.reason,
      ruleId: w.ruleId,
    })),
  };
}

/* ---------- Activity ---------- */

export function activityItems(detail: CaseDetail): ActivityItemView[] {
  return [...detail.activity]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((a) => ({
      id: a.id,
      whenText: formatDemoTimestamp(a.createdAt),
      whenKind: "demo",
      actor: `${displayPersonName(a.actor.displayName)}, ${a.actor.jobTitle}`,
      text: a.text,
    }));
}

/* ---------- Detail header ---------- */

export function detailHeader(ctx: MapContext, detail: CaseDetail): CaseDetailHeaderView {
  return {
    card: toCaseCard(ctx, detail),
    sourceStatusText: detail.historicalStatus,
    eqTypeText: detail.eqType ?? "Unknown",
  };
}

export function actionAssigneeName(detail: CaseDetail, action: Action): string {
  if (!action.assigneeId) return "Not assigned";
  const u = detail.people.assignees.find((a) => a.id === action.assigneeId);
  return u ? `${displayPersonName(u.displayName)}, ${u.jobTitle}` : action.assigneeId;
}

/* ---------- Summary ---------- */

export interface SummaryExtras {
  byProblemType: BreakdownRowView[];
  insightCoverage: BreakdownRowView[];
}

export function summaryView(summary: Summary, scopeText: string, extras: SummaryExtras | null): SummaryView {
  const total = summary.totalCases;
  const knownMoney = (sum: number, known: number) => (known > 0 ? formatCompactKusd(sum) : null);
  const metrics: MetricView[] = [
    { label: "Cases in scope", value: formatCompactNumber(total) },
    { label: "Awaiting management review", value: formatCompactNumber(summary.awaitingReviewCount) },
    {
      label: "Actual loss (recorded)",
      value: knownMoney(summary.actualLossKusd, summary.knownActualLossCount),
      unavailableText: NOT_RECORDED,
    },
    {
      label: "Potential loss (recorded)",
      value: knownMoney(summary.potentialLossKusd, summary.knownPotentialLossCount),
      unavailableText: NOT_RECORDED,
    },
    {
      label: "Summed incident downtime",
      value: summary.knownDowntimeCount > 0 ? formatCompactNumber(summary.summedIncidentDowntimeHours) : null,
      unit: "h",
      unavailableText: NOT_RECORDED,
    },
  ];

  const byStatus: BreakdownRowView[] = STATUS_ORDER.map((st) => ({
    label: STATUS[st].label,
    count: summary.countsByStatus[st] ?? 0,
  })).filter((row) => row.count > 0);

  return {
    scopeText,
    metrics,
    byStatus,
    byProblemType: extras?.byProblemType ?? [],
    insightCoverage: extras?.insightCoverage ?? [],
    footnotes: [
      "Actual and potential loss are recorded values, not savings.",
      "Downtime is the sum of incident hours across the filtered cases, not plant downtime.",
      `Actual loss recorded for ${summary.knownActualLossCount} of ${total} cases; potential loss for ${summary.knownPotentialLossCount} of ${total}; downtime for ${summary.knownDowntimeCount} of ${total}. Missing values are left out of the sums, never counted as zero.`,
      summary.impactScopeLabel + ".",
    ],
  };
}

/** Problem type and insight coverage rows from the filtered visible case list. */
export function summaryExtras(items: CaseListItem[]): SummaryExtras {
  const byType = new Map<string, number>();
  for (const c of items) {
    const key = c.mechanism ?? NOT_RECORDED;
    byType.set(key, (byType.get(key) ?? 0) + 1);
  }
  const ml: Record<MlState, number> = { ranked: 0, abstain: 0, unavailable: 0 };
  for (const c of items) ml[c.mlState] += 1;
  return {
    byProblemType: [...byType.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count })),
    insightCoverage: [
      { label: "ML ranked", count: ml.ranked },
      { label: "ML abstain", count: ml.abstain },
      { label: "Analysis not available", count: ml.unavailable },
    ],
  };
}

/* ---------- Timeline ---------- */

export interface UndatedTimelineItem {
  id: string;
  caseId: string;
  caseTitle: string;
  href: string;
  dateText: string;
  label: string;
  isDemo: boolean;
}

function isPositionable(e: TimelineEvent): boolean {
  if (!e.date.value) return false;
  if (e.date.precision !== "date" && e.date.precision !== "timestamp") return false;
  const iso = e.date.precision === "date" ? `${e.date.value}T00:00:00Z` : e.date.value;
  return Number.isFinite(Date.parse(iso));
}

function truncate(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max - 3).trimEnd()}...` : text;
}

function eventLabel(e: TimelineEvent): string {
  if (e.kind === "incident") return e.date.provenance === "demo" ? "Reported occurrence" : "Occurred";
  if (e.kind === "action_due") return `Action due, ${truncate(e.title, 60)}`;
  return truncate(e.title, 60);
}

export function timelineView(timeline: Timeline): {
  lanes: TimelineLaneView[];
  undated: UndatedTimelineItem[];
  undatedCount: number;
} {
  const titles = new Map<string, string>();
  for (const e of timeline.items) if (e.kind === "incident" && !titles.has(e.caseId)) titles.set(e.caseId, e.title);
  const titleFor = (caseId: string) => titles.get(caseId) ?? `Case ${shortEvidenceId(caseId)}`;

  const lanes = new Map<string, TimelineLaneView>();
  const undated: UndatedTimelineItem[] = [];
  for (const e of timeline.items) {
    const href = caseHref(e.caseId);
    const isDemo = e.date.provenance === "demo";
    if (!isPositionable(e)) {
      undated.push({
        id: e.id,
        caseId: e.caseId,
        caseTitle: titleFor(e.caseId),
        href,
        dateText: e.date.value ?? "Date not recorded",
        label: eventLabel(e),
        isDemo,
      });
      continue;
    }
    let lane = lanes.get(e.caseId);
    if (!lane) {
      lane = { id: e.caseId, title: titleFor(e.caseId), href, events: [], undatedCount: 0 };
      lanes.set(e.caseId, lane);
    }
    lane.events.push({
      id: e.id,
      caseId: e.caseId,
      caseTitle: titleFor(e.caseId),
      href,
      dateISO: e.date.precision === "date" ? `${e.date.value}T00:00:00Z` : (e.date.value as string),
      dateText: e.date.value as string,
      kind: isDemo ? "demo" : "source",
      label: eventLabel(e),
    });
  }
  for (const u of undated) {
    const lane = lanes.get(u.caseId);
    if (lane) lane.undatedCount = (lane.undatedCount ?? 0) + 1;
  }
  return { lanes: [...lanes.values()], undated, undatedCount: timeline.undatedCount };
}
