/** Shared FE/BE contract. Changes require integrator coordination.
 * Type declarations describe wire values; they are not runtime validation.
 */
export const CONTRACT_VERSION = "gate5-web-v1" as const;
export type ID = string;
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Role = "management" | "engineer" | "unassigned";
export type CaseStatus = "draft" | "submitted" | "needs_revision" | "investigating" | "action_in_progress" | "awaiting_verification" | "closed";
export type Priority = "high" | "medium" | "low";
export type MlState = "ranked" | "abstain" | "unavailable";
export type Provenance = "historical" | "derived" | "demo";
export interface SourceDate {
  value: string | null;
  precision: "date" | "timestamp" | "source_text" | "unavailable";
  provenance: Provenance;
}
export interface Division { id: ID; name: string }
export interface User {
  id: ID; displayName: string; jobTitle: string; role: Role;
  divisionId: ID | null; managedDivisionIds: ID[]; isDemo: true;
}
export interface People {
  proposingDivisionId: ID;
  proposer: User; accountableOwner: User; assignees: User[];
  historicalRcaPic: string | null;
  provenance: "demo";
}
export interface Impact {
  actualLossKusd: number | null; potentialLossKusd: number | null;
  totalExposureKusd: number | null; downtimeHours: number | null;
  evidenceIds: ID[];
}
export interface CasePermissions {
  canEdit: boolean; canAssign: boolean; canAddNote: boolean; canDraftAction: boolean;
  canReviewAction: boolean; allowedTransitions: CaseStatus[];
}
export interface CaseListItem {
  id: ID; sourceIncidentId: ID | null; scenarioId: ID | null;
  title: string; description: string; occurredAt: SourceDate;
  tag: string | null; component: string | null; mechanism: string | null;
  plant: string | null; divisionIds: ID[];
  status: CaseStatus; historicalStatus: string | null;
  priority: Priority | null; priorityReview: "not_reviewed" | "reviewed";
  impact: Impact; people: People; mlState: MlState;
  createdAt: string; updatedAt: string; version: number;
  isDemo: true; permissions: CasePermissions;
}
export interface EvidenceRecord {
  id: ID; kind: string; text: string | null; sourceLocator: string | null;
  passageIds: ID[]; sourceIds: ID[];
  /** Original supplied record for an evidence drawer; never executable HTML. */
  payload: Json;
}
export interface Finding {
  id: ID; text: string; category: string | null; status: string | null;
  source: string; sourceTag: string | null; evidenceIds: ID[];
}
export interface RankedCandidate {
  finding: Finding; rank: number; score: number;
}
export interface Insight {
  state: MlState; reason: string | null; modelVersion: string | null;
  validationBasis: string | null;
  scoreMeaning: "relative_ranking_not_probability";
  candidates: RankedCandidate[];
}
export interface SourceConflict {
  id: ID; description: string; disposition: string | null;
  state: "unresolved"; evidenceIds: ID[];
}
export interface Question {
  id: ID; text: string; evidenceIds: ID[]; source: "gate4_a";
}
export interface ActionReference {
  id: ID; text: string; sourceTag: string | null; evidenceIds: ID[];
  applicability: "requires_review"; executionAuthorized: false;
}
export interface SuppressedAction {
  id: ID; ruleId: "HR-PU-2101B-002"; reason: string;
}
export interface ChronologyEntry {
  id: ID; date: SourceDate; text: string; evidenceIds: ID[];
}
export interface Activity {
  id: ID; caseId: ID; actor: User; createdAt: string;
  kind: "created" | "note" | "updated" | "transition" | "action";
  text: string; provenance: "demo";
}
export type ActionStatus = "draft" | "approved" | "in_progress" | "completed" | "verified";
export interface Action {
  id: ID; caseId: ID; title: string; description: string;
  referenceId: ID | null; evidenceIds: ID[]; assigneeId: ID | null;
  dueDate: string | null; status: ActionStatus; applicabilityReview: string | null;
  completionNote: string | null; verificationNote: string | null;
  createdAt: string; updatedAt: string; provenance: "demo";
}
export interface CaseDetail extends CaseListItem {
  eqType: string | null;
  monitoring: { state: "available" | "unavailable"; reason: string | null; context: Json };
  chronology: ChronologyEntry[]; historicalFindings: Finding[];
  rulesFindings: Finding[]; insight: Insight; conflicts: SourceConflict[];
  questions: Question[]; actionReferences: ActionReference[];
  suppressedActions: SuppressedAction[];
  /** Immutable history, not actionable draft suggestions. */
  historicalActions: Json[];
  evidence: EvidenceRecord[]; actions: Action[]; activity: Activity[];
}
export interface CaseFilters {
  search?: string; status?: CaseStatus | "active" | "all";
  divisionId?: ID; mechanism?: string; plant?: string;
  mlState?: MlState; priorityReview?: "not_reviewed" | "reviewed";
}
export interface CaseQuery extends CaseFilters {
  page?: number; pageSize?: 5 | 10 | 20;
  sort?: "priority" | "updated_desc" | "occurred_desc";
}
export interface Page<T> { items: T[]; page: number; pageSize: 5 | 10 | 20; total: number }
export interface ApiMeta { contractVersion: typeof CONTRACT_VERSION; baselineId: "B1" | null; dataMode: "api" | "mock" }
export interface ApiSuccess<T> { data: T; meta: ApiMeta }
export type ErrorCode = "VALIDATION_ERROR" | "PERSONA_REQUIRED" | "FORBIDDEN" | "NOT_FOUND" | "INVALID_TRANSITION" | "VERSION_CONFLICT" | "REFERENCE_SUPPRESSED" | "SERVICE_UNAVAILABLE" | "INTERNAL_ERROR";
export interface ApiError { error: { code: ErrorCode; message: string; fieldErrors?: Record<string, string[]> } }
export interface Summary {
  totalCases: number; countsByStatus: Record<CaseStatus, number>;
  awaitingReviewCount: number;
  actualLossKusd: number; potentialLossKusd: number; summedIncidentDowntimeHours: number;
  knownActualLossCount: number; knownPotentialLossCount: number; knownDowntimeCount: number;
  /** Nulls are omitted from sums; known counts disclose missing values. */
  impactScopeLabel: "Recorded impact of filtered cases; downtime is summed incident hours";
}
export interface PerformancePoint { date: string; meanRate: number; observedHours: number }
export interface PerformanceKpi {
  name: string; value: number | null; unit: string; state: string;
  periodStart: string | null; periodEnd: string | null; periodHours: number | null;
  definition: string; sourceIds: string[]; reason: string | null;
}
export interface PerformanceAsset {
  tag: string; plantUnit: string; windowStart: string; windowEnd: string;
  production: { unit: string; definition: string; sourceId: string; daily: PerformancePoint[] };
  monitoringCoverage: Record<string, number>; kpis: PerformanceKpi[];
}
export interface PerformanceSourceGroup {
  id: "incident" | "production" | "equipment" | "rca";
  title: string; supports: string; sourceIds: string[];
}
export interface PerformanceSnapshot {
  baselineId: "B1"; definition: string;
  assets: PerformanceAsset[]; sourceGroups: PerformanceSourceGroup[];
}
export interface TimelineEvent {
  id: ID; caseId: ID; title: string;
  kind: "incident" | "chronology" | "action_due";
  date: SourceDate; evidenceIds: ID[];
}
export interface Timeline { items: TimelineEvent[]; undatedCount: number }
export interface CreateCaseRequest {
  title: string; description: string; occurredAt: string | null;
  tag: string | null; component: string | null; mechanism: string | null;
  plant: string | null;
  /** Proposer and proposing division come from the active engineer persona. */
  relatedDivisionIds: ID[];
}
export interface UpdateCaseRequest {
  expectedVersion: number;
  title?: string; description?: string; occurredAt?: string | null;
  tag?: string | null; component?: string | null; mechanism?: string | null; plant?: string | null;
  relatedDivisionIds?: ID[]; assigneeIds?: ID[]; priority?: Priority;
}
export interface TransitionRequest { expectedVersion: number; to: CaseStatus; note: string }
export interface AddNoteRequest { text: string }
export interface CreateActionRequest {
  title: string; description: string; referenceId: ID | null;
  evidenceIds: ID[]; assigneeId: ID | null; dueDate: string | null;
}
export interface UpdateActionRequest {
  expectedCaseVersion: number; status?: ActionStatus;
  title?: string; description?: string; assigneeId?: ID | null; dueDate?: string | null;
  applicabilityReview?: string; completionNote?: string; verificationNote?: string;
  evidenceIds?: ID[];
}
export interface ReferenceData {
  divisions: Division[]; users: User[]; plants: string[]; mechanisms: string[];
}
/** Base transitions only. Ownership and preconditions MUST also be enforced by BE. */
export const TRANSITIONS: Record<CaseStatus, Partial<Record<Role, CaseStatus[]>>> = {
  draft: { engineer: ["submitted"] },
  submitted: { management: ["needs_revision", "investigating"] },
  needs_revision: { engineer: ["submitted"] },
  investigating: { engineer: ["action_in_progress"], management: ["action_in_progress"] },
  action_in_progress: { engineer: ["awaiting_verification"], management: ["awaiting_verification"] },
  awaiting_verification: { management: ["action_in_progress", "closed"] },
  closed: {},
};
