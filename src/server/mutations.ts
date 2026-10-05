import { randomUUID } from "node:crypto";
import type { Action, CaseDetail, CreateCaseRequest, CreateActionRequest, ReferenceData, UpdateCaseRequest, UpdateActionRequest, TransitionRequest, User } from "@contracts/v1";
import { canReadCase, permissionsFor } from "@contracts/access";
import { demand } from "./errors";

export function authorize(item: CaseDetail, user: User, expected?: number) {
  demand(canReadCase(user, item), 404, "NOT_FOUND", "Case not found.");
  if (expected !== undefined) demand(expected === item.version, 409, "VERSION_CONFLICT", "Case changed. Reload before retrying.");
}
export function record(item: CaseDetail, user: User, kind: CaseDetail["activity"][number]["kind"], text: string) {
  item.updatedAt = new Date().toISOString(); item.version++;
  item.activity.push({ id: randomUUID(), caseId: item.id, actor: user, createdAt: item.updatedAt, kind, text, provenance: "demo" });
}
function divisions(ids: string[], refs: ReferenceData) {
  demand(ids.every(id => refs.divisions.some(d => d.id === id)), 400, "VALIDATION_ERROR", "Unknown division.");
}
export function createCase(data: CreateCaseRequest, user: User, refs: ReferenceData): CaseDetail {
  demand(user.role === "engineer" && user.divisionId, 403, "FORBIDDEN", "Only assigned engineers may create reports.");
  divisions(data.relatedDivisionIds, refs);
  const owner = refs.users.find(u => u.role === "management" && u.divisionId === user.divisionId);
  demand(owner, 400, "VALIDATION_ERROR", "Division owner is unavailable.");
  const now = new Date().toISOString();
  const item: CaseDetail = {
    id: "demo:" + randomUUID(), sourceIncidentId: null, scenarioId: null,
    title: data.title, description: data.description, occurredAt: { value: data.occurredAt, precision: data.occurredAt ? "date" : "unavailable", provenance: "demo" },
    tag: data.tag, component: data.component, mechanism: data.mechanism, plant: data.plant,
    divisionIds: [...new Set([user.divisionId, ...data.relatedDivisionIds])], status: "draft", historicalStatus: null,
    priority: null, priorityReview: "not_reviewed", impact: { actualLossKusd: null, potentialLossKusd: null, totalExposureKusd: null, downtimeHours: null, evidenceIds: [] },
    people: { proposingDivisionId: user.divisionId, proposer: user, accountableOwner: owner, assignees: [], historicalRcaPic: null, provenance: "demo" },
    mlState: "unavailable", createdAt: now, updatedAt: now, version: 1, isDemo: true,
    permissions: { canEdit: false, canAssign: false, canAddNote: false, canDraftAction: false, canReviewAction: false, allowedTransitions: [] },
    eqType: null, monitoring: { state: "unavailable", reason: "No monitoring data linked to this report.", context: null }, chronology: [], historicalFindings: [], rulesFindings: [],
    insight: { state: "unavailable", reason: "Analysis not available for this report.", modelVersion: null, validationBasis: null, scoreMeaning: "relative_ranking_not_probability", candidates: [] },
    conflicts: [], questions: [], actionReferences: [], suppressedActions: [], historicalActions: [], evidence: [], actions: [], activity: [],
  };
  item.activity.push({ id: randomUUID(), caseId: item.id, actor: user, createdAt: now, kind: "created", text: "Draft created.", provenance: "demo" });
  return item;
}
export function updateCase(item: CaseDetail, data: UpdateCaseRequest, user: User, refs: ReferenceData) {
  authorize(item, user, data.expectedVersion);
  const permissions = permissionsFor(user, item);
  const keys = Object.keys(data).filter(k => k !== "expectedVersion");
  demand(keys.length, 400, "VALIDATION_ERROR", "No changes provided.");
  if (keys.some(k => !["assigneeIds", "priority"].includes(k))) {
    demand(permissions.canEdit && !item.sourceIncidentId, 403, "FORBIDDEN", "Case source content cannot be edited.");
    for (const key of ["title", "description", "tag", "component", "mechanism", "plant"] as const) if (data[key] !== undefined) Object.assign(item, { [key]: data[key] });
    if (data.occurredAt !== undefined) item.occurredAt = { value: data.occurredAt, precision: data.occurredAt ? "date" : "unavailable", provenance: "demo" };
    if (data.relatedDivisionIds) { divisions(data.relatedDivisionIds, refs); item.divisionIds = [...new Set([item.people.proposingDivisionId, ...data.relatedDivisionIds])]; }
  }
  if (data.assigneeIds !== undefined || data.priority !== undefined) demand(permissions.canAssign, 403, "FORBIDDEN", "Management assignment permission required.");
  if (data.assigneeIds !== undefined) {
    const users = data.assigneeIds.map(id => refs.users.find(u => u.id === id));
    demand(users.every(u => u?.role === "engineer" && u.divisionId && item.divisionIds.includes(u.divisionId)), 400, "VALIDATION_ERROR", "Assignees must be engineers in involved divisions.");
    demand(item.actions.every(a => !a.assigneeId || data.assigneeIds!.includes(a.assigneeId)), 409, "INVALID_TRANSITION", "Reassign action owners before removing their case assignment.");
    item.people.assignees = users as User[];
  }
  if (data.priority) { item.priority = data.priority; item.priorityReview = "reviewed"; }
  record(item, user, "updated", "Case fields updated: " + keys.join(", "));
}
export function transition(item: CaseDetail, data: TransitionRequest, user: User) {
  authorize(item, user, data.expectedVersion);
  demand(permissionsFor(user, item).allowedTransitions.includes(data.to), 409, "INVALID_TRANSITION", "Transition is not permitted or its prerequisites are incomplete.");
  const before = item.status; item.status = data.to;
  record(item, user, "transition", `${before} -> ${data.to}: ${data.note}`);
}
function evidence(item: CaseDetail, ids: string[]) {
  demand(ids.every(id => item.evidence.some(e => e.id === id)), 400, "VALIDATION_ERROR", "Evidence must belong to this case.");
  demand(item.eqType === "PU" || !ids.includes("PU-2101B-002"), 409, "REFERENCE_SUPPRESSED", "Pump-specific action is withheld for this equipment.");
}
function reference(item: CaseDetail, id: string | null, ids: string[]) {
  evidence(item, ids);
  if (!id) return;
  demand(!item.suppressedActions.some(a => a.id === id), 409, "REFERENCE_SUPPRESSED", "This reference has been withheld.");
  const ref = item.actionReferences.find(a => a.id === id);
  demand(ref, 400, "VALIDATION_ERROR", "Unknown action reference.");
  evidence(item, ref.evidenceIds);
  demand(ref.evidenceIds.every(e => ids.includes(e)), 400, "VALIDATION_ERROR", "Include the reference's source evidence.");
}
function assignee(item: CaseDetail, id: string | null) {
  demand(id === null || item.people.assignees.some(u => u.id === id && u.role === "engineer"), 400, "VALIDATION_ERROR", "Action owner must be assigned to this case.");
}
export function createAction(item: CaseDetail, data: CreateActionRequest, user: User) {
  authorize(item, user);
  demand(permissionsFor(user, item).canDraftAction, 403, "FORBIDDEN", "Action drafting is not permitted.");
  reference(item, data.referenceId, data.evidenceIds); assignee(item, data.assigneeId);
  const now = new Date().toISOString();
  item.actions.push({ ...data, id: randomUUID(), caseId: item.id, status: "draft", applicabilityReview: null, completionNote: null, verificationNote: null, createdAt: now, updatedAt: now, provenance: "demo" });
  record(item, user, "action", "Draft action created: " + data.title);
}
export function updateAction(item: CaseDetail, actionId: string, data: UpdateActionRequest, user: User) {
  authorize(item, user, data.expectedCaseVersion);
  const permissions = permissionsFor(user, item), manager = permissions.canReviewAction;
  const engineer = user.role === "engineer" && item.people.assignees.some(u => u.id === user.id);
  demand(["investigating", "action_in_progress", "awaiting_verification"].includes(item.status) && (manager || engineer), 403, "FORBIDDEN", "Action update is not permitted.");
  const action = item.actions.find(a => a.id === actionId);
  demand(action, 404, "NOT_FOUND", "Action not found.");
  demand(action.status !== "verified", 409, "INVALID_TRANSITION", "Verified actions are immutable.");
  const keys = Object.keys(data).filter(k => k !== "expectedCaseVersion");
  demand(keys.length, 400, "VALIDATION_ERROR", "No changes provided.");
  if (data.title !== undefined || data.description !== undefined) demand(action.status === "draft", 409, "INVALID_TRANSITION", "Only draft content is editable.");
  if (data.assigneeId !== undefined || data.dueDate !== undefined) demand(action.status === "draft" || manager, 403, "FORBIDDEN", "Management permission required to change assignment or schedule.");
  const to = data.status;
  if (to) {
    const paths: Record<Action["status"], Action["status"][]> = { draft: ["approved"], approved: ["in_progress"], in_progress: ["completed"], completed: ["verified", "in_progress"], verified: [] };
    demand(paths[action.status].includes(to), 409, "INVALID_TRANSITION", "Invalid action transition.");
    if (to === "approved" || to === "verified" || action.status === "completed") demand(manager, 403, "FORBIDDEN", "Manager review required.");
    if (to === "approved") demand(data.applicabilityReview, 400, "VALIDATION_ERROR", "Applicability review is required.");
    if (to === "completed") demand(data.completionNote && data.evidenceIds?.length, 400, "VALIDATION_ERROR", "Completion note and evidence are required.");
    if (to === "verified" || action.status === "completed") demand(data.verificationNote, 400, "VALIDATION_ERROR", "Manager verification/correction note is required.");
    if (to === "verified") demand(data.evidenceIds?.length, 400, "VALIDATION_ERROR", "Verification evidence is required.");
  }
  if (data.applicabilityReview !== undefined) demand(manager && to === "approved", 403, "FORBIDDEN", "Applicability review belongs to manager approval.");
  if (data.verificationNote !== undefined) demand(manager && action.status === "completed" && !!to, 403, "FORBIDDEN", "Verification note belongs to manager review.");
  if (data.completionNote !== undefined) demand(to === "completed", 400, "VALIDATION_ERROR", "Completion note requires a completion transition.");
  if (data.evidenceIds !== undefined) demand(action.status === "draft" || to === "completed" || to === "verified", 409, "INVALID_TRANSITION", "Evidence can change only in draft, completion or verification.");
  const next = { ...action, ...data };
  reference(item, next.referenceId, next.evidenceIds); assignee(item, next.assigneeId);
  if (to === "in_progress") demand(next.assigneeId, 400, "VALIDATION_ERROR", "Assign an engineer before starting work.");
  const { expectedCaseVersion, ...patch } = data;
  Object.assign(action, patch, { updatedAt: new Date().toISOString() });
  record(item, user, "action", `Action ${action.id} updated: ${keys.join(", ")}`);
}
