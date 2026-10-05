/**
 * Mock adapter (labelled "mock" everywhere it is shown).
 *
 * - Deep-clones contracts/fixtures/demo-v1.json into an in-memory session.
 *   Mutations live only in this browser tab's memory; reset restores the
 *   fixture. Nothing is persisted and nothing is sent to a server.
 * - Applies canReadCase, then filters, then sorting, then pagination, as
 *   contracts/README.md describes.
 * - Recomputes permissions with permissionsFor for the active persona on
 *   every response (fixture permissions are placeholders).
 * - Enforces README validation and preconditions, appends activity, bumps
 *   version and updatedAt for every mutation.
 */

import { canReadCase, permissionsFor } from "@contracts/access";
import {
  CONTRACT_VERSION,
  TRANSITIONS,
  type Action,
  type ActionStatus,
  type Activity,
  type ApiError,
  type ApiSuccess,
  type CaseDetail,
  type CaseFilters,
  type CaseListItem,
  type CaseQuery,
  type CaseStatus,
  type ID,
  type MlState,
  type Page,
  type Priority,
  type ReferenceData,
  type SourceDate,
  type Summary,
  type Timeline,
  type TimelineEvent,
  type User,
} from "@contracts/v1";
import { loadFixture, type DemoFixture } from "@/mocks/fixture";
import { apiError, type DataSource, type Result } from "./dataSource";
import { isSuppressedReference } from "./suppression";
import { performanceForCases } from "@/lib/performance";

/* ---------- Session ---------- */

interface MockSession {
  fixture: DemoFixture;
  cases: CaseDetail[];
  referenceData: ReferenceData;
  counter: number;
}

let session: MockSession | null = null;

async function getSession(): Promise<MockSession> {
  if (!session) {
    const fixture = await loadFixture();
    session = {
      fixture,
      cases: structuredClone(fixture.cases),
      referenceData: structuredClone(fixture.referenceData),
      counter: 0,
    };
  }
  return session;
}

function nextId(s: MockSession, prefix: string): string {
  s.counter += 1;
  return `mock-${prefix}-${Date.now().toString(36)}-${s.counter}`;
}

const clone = <T,>(value: T): T => structuredClone(value);

function ok<T>(data: T): ApiSuccess<T> {
  return { data: clone(data), meta: { contractVersion: CONTRACT_VERSION, baselineId: "B1", dataMode: "mock" } };
}

/** Simulates network latency so loading states are visible and realistic. */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 120));

/* ---------- Validation helpers ---------- */

const ALL_STATUSES: CaseStatus[] = [
  "draft",
  "submitted",
  "needs_revision",
  "investigating",
  "action_in_progress",
  "awaiting_verification",
  "closed",
];
const ML_STATES: MlState[] = ["ranked", "abstain", "unavailable"];
const SORTS = ["priority", "updated_desc", "occurred_desc"] as const;
const PAGE_SIZES = [5, 10, 20] as const;
const PRIORITIES: Priority[] = ["high", "medium", "low"];

type FieldErrors = Record<string, string[]>;

function addError(errors: FieldErrors, field: string, message: string) {
  (errors[field] ??= []).push(message);
}

function validationError(errors: FieldErrors): ApiError {
  return apiError("VALIDATION_ERROR", "Review the highlighted fields.", errors);
}

function hasErrors(errors: FieldErrors) {
  return Object.keys(errors).length > 0;
}

/** Trimmed required text with length bounds; returns trimmed value or records an error. */
function requiredText(errors: FieldErrors, field: string, label: string, raw: unknown, max: number): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length === 0) addError(errors, field, `${label} is required.`);
  else if (value.length > max) addError(errors, field, `${label} must be at most ${max} characters.`);
  return value;
}

/** Optional text: empty normalises to null; at most `max` characters. */
function optionalText(errors: FieldErrors, field: string, label: string, raw: unknown, max = 120): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") {
    addError(errors, field, `${label} must be text.`);
    return null;
  }
  const value = raw.trim();
  if (value.length === 0) return null;
  if (value.length > max) addError(errors, field, `${label} must be at most ${max} characters.`);
  return value;
}

export function isValidCalendarDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function optionalDate(errors: FieldErrors, field: string, label: string, raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") {
    addError(errors, field, `${label} must be a date in YYYY-MM-DD format.`);
    return null;
  }
  const value = raw.trim();
  if (value === "") return null;
  if (!isValidCalendarDate(value)) {
    addError(errors, field, `${label} must be a valid calendar date in YYYY-MM-DD format.`);
    return null;
  }
  return value;
}

/* ---------- Access helpers ---------- */

function findUser(s: MockSession, userId: ID): User | null {
  return s.referenceData.users.find((u) => u.id === userId) ?? null;
}

function personaRequired(): ApiError {
  return apiError("PERSONA_REQUIRED", "Choose a valid role.");
}

function notFound(): ApiError {
  return apiError("NOT_FOUND", "This case does not exist or is not visible to the active persona.");
}

function forbidden(message: string): ApiError {
  return apiError("FORBIDDEN", message);
}

function withPermissions(user: User, item: CaseDetail): CaseDetail {
  return { ...item, permissions: permissionsFor(user, item) };
}

function toListItem(user: User, item: CaseDetail): CaseListItem {
  return {
    id: item.id,
    sourceIncidentId: item.sourceIncidentId,
    scenarioId: item.scenarioId,
    title: item.title,
    description: item.description,
    occurredAt: item.occurredAt,
    tag: item.tag,
    component: item.component,
    mechanism: item.mechanism,
    plant: item.plant,
    divisionIds: item.divisionIds,
    status: item.status,
    historicalStatus: item.historicalStatus,
    priority: item.priority,
    priorityReview: item.priorityReview,
    impact: item.impact,
    people: item.people,
    mlState: item.mlState,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    version: item.version,
    isDemo: true,
    permissions: permissionsFor(user, item),
  };
}

/** Resolves user + visible case or returns the contract error. */
function resolveCase(s: MockSession, userId: ID, caseId: ID): { user: User; item: CaseDetail } | ApiError {
  const user = findUser(s, userId);
  if (!user) return personaRequired();
  const item = s.cases.find((c) => c.id === caseId);
  if (!item || !canReadCase(user, item)) return notFound();
  return { user, item };
}

function isErr<T extends object>(value: T | ApiError): value is ApiError {
  return "error" in value;
}

function nowIso(): string {
  return new Date().toISOString();
}

function touch(s: MockSession, item: CaseDetail, actor: User, kind: Activity["kind"], text: string) {
  const at = nowIso();
  item.version += 1;
  item.updatedAt = at;
  item.activity.push({
    id: nextId(s, "activity"),
    caseId: item.id,
    actor: clone(actor),
    createdAt: at,
    kind,
    text,
    provenance: "demo",
  });
}

/* ---------- Query handling ---------- */

interface ParsedFilters {
  search: string;
  status: CaseStatus | "active" | "all";
  divisionId?: ID;
  mechanism?: string;
  plant?: string;
  mlState?: MlState;
  priorityReview?: "not_reviewed" | "reviewed";
}

function parseFilters(s: MockSession, filters: CaseFilters, errors: FieldErrors): ParsedFilters {
  const out: ParsedFilters = { search: (filters.search ?? "").trim().toLowerCase(), status: "active" };
  if (filters.status !== undefined) {
    if (filters.status === "active" || filters.status === "all" || ALL_STATUSES.includes(filters.status)) {
      out.status = filters.status;
    } else addError(errors, "status", "Unknown status filter.");
  }
  if (filters.divisionId) {
    if (s.referenceData.divisions.some((d) => d.id === filters.divisionId)) out.divisionId = filters.divisionId;
    else addError(errors, "divisionId", "Unknown division.");
  }
  if (filters.mechanism) {
    if (s.referenceData.mechanisms.includes(filters.mechanism)) out.mechanism = filters.mechanism;
    else addError(errors, "mechanism", "Unknown problem type.");
  }
  if (filters.plant) {
    if (s.referenceData.plants.includes(filters.plant)) out.plant = filters.plant;
    else addError(errors, "plant", "Unknown plant.");
  }
  if (filters.mlState) {
    if (ML_STATES.includes(filters.mlState)) out.mlState = filters.mlState;
    else addError(errors, "mlState", "Unknown ML state.");
  }
  if (filters.priorityReview) {
    if (filters.priorityReview === "reviewed" || filters.priorityReview === "not_reviewed")
      out.priorityReview = filters.priorityReview;
    else addError(errors, "priorityReview", "Unknown review state.");
  }
  return out;
}

function matches(item: CaseDetail, f: ParsedFilters): boolean {
  if (f.status === "active" && item.status === "closed") return false;
  if (f.status !== "active" && f.status !== "all" && item.status !== f.status) return false;
  if (f.divisionId && !item.divisionIds.includes(f.divisionId)) return false;
  if (f.mechanism && item.mechanism !== f.mechanism) return false;
  if (f.plant && item.plant !== f.plant) return false;
  if (f.mlState && item.mlState !== f.mlState) return false;
  if (f.priorityReview && item.priorityReview !== f.priorityReview) return false;
  if (f.search) {
    const hay = [item.title, item.tag, item.component, item.plant];
    if (!hay.some((v) => typeof v === "string" && v.toLowerCase().includes(f.search))) return false;
  }
  return true;
}

/** Visible (access policy) then filtered set. */
function visibleFiltered(s: MockSession, user: User, f: ParsedFilters): CaseDetail[] {
  return s.cases.filter((c) => canReadCase(user, c)).filter((c) => matches(c, f));
}

/** Parseable occurrence time or null (source_text / unavailable never guessed). */
export function parseableTime(date: SourceDate): number | null {
  if (!date.value) return null;
  if (date.precision !== "date" && date.precision !== "timestamp") return null;
  const t = Date.parse(date.precision === "date" ? `${date.value}T00:00:00Z` : date.value);
  return Number.isFinite(t) ? t : null;
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const byIdAsc = (a: CaseDetail, b: CaseDetail) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const byUpdatedDesc = (a: CaseDetail, b: CaseDetail) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt);

function sortCases(items: CaseDetail[], sort: CaseQuery["sort"]): CaseDetail[] {
  const list = [...items];
  if (sort === "updated_desc") {
    list.sort((a, b) => byUpdatedDesc(a, b) || byIdAsc(a, b));
  } else if (sort === "occurred_desc") {
    list.sort((a, b) => {
      const ta = parseableTime(a.occurredAt);
      const tb = parseableTime(b.occurredAt);
      if (ta === null && tb !== null) return 1;
      if (ta !== null && tb === null) return -1;
      if (ta !== null && tb !== null && ta !== tb) return tb - ta;
      return byIdAsc(a, b);
    });
  } else {
    list.sort((a, b) => {
      const pa = a.priority ? PRIORITY_RANK[a.priority] : 3;
      const pb = b.priority ? PRIORITY_RANK[b.priority] : 3;
      return pa - pb || byUpdatedDesc(a, b) || byIdAsc(a, b);
    });
  }
  return list;
}

/** Removes binary floating-point noise from sums (values are recorded to 2 decimals). */
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/* ---------- Status labels for activity text ---------- */

const STATUS_TEXT: Record<CaseStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  needs_revision: "Needs revision",
  investigating: "Investigating",
  action_in_progress: "Action in progress",
  awaiting_verification: "Awaiting verification",
  closed: "Closed",
};

const ACTION_STATUS_TEXT: Record<ActionStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  in_progress: "In progress",
  completed: "Completed",
  verified: "Verified",
};

/* ---------- Adapter ---------- */

export function createMockDataSource(): DataSource {
  return {
    mode: "mock",

    async listPersonas() {
      await tick();
      const s = await getSession();
      return ok(s.referenceData.users);
    },

    async getMe(userId) {
      await tick();
      const s = await getSession();
      const user = findUser(s, userId);
      return user ? ok(user) : personaRequired();
    },

    async getReferenceData(userId) {
      await tick();
      const s = await getSession();
      if (!findUser(s, userId)) return personaRequired();
      return ok(s.referenceData);
    },

    async listCases(userId, query): Promise<Result<Page<CaseListItem>>> {
      await tick();
      const s = await getSession();
      const user = findUser(s, userId);
      if (!user) return personaRequired();

      const errors: FieldErrors = {};
      const f = parseFilters(s, query, errors);
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 10;
      const sort = query.sort ?? "priority";
      if (!Number.isInteger(page) || page < 1) addError(errors, "page", "Page must be an integer of at least 1.");
      if (!PAGE_SIZES.includes(pageSize as 5 | 10 | 20)) addError(errors, "pageSize", "Page size must be 5, 10 or 20.");
      if (!SORTS.includes(sort)) addError(errors, "sort", "Unknown sort.");
      if (hasErrors(errors)) return apiError("VALIDATION_ERROR", "The case query is not valid.", errors);

      const sorted = sortCases(visibleFiltered(s, user, f), sort);
      const start = (page - 1) * pageSize;
      const items = sorted.slice(start, start + pageSize).map((c) => toListItem(user, c));
      return ok({ items, page, pageSize: pageSize as 5 | 10 | 20, total: sorted.length });
    },

    async getCase(userId, caseId) {
      await tick();
      const s = await getSession();
      const r = resolveCase(s, userId, caseId);
      if (isErr(r)) return r;
      return ok(withPermissions(r.user, r.item));
    },

    async createCase(userId, body) {
      await tick();
      const s = await getSession();
      const user = findUser(s, userId);
      if (!user) return personaRequired();
      if (user.role !== "engineer" || !user.divisionId) {
        return forbidden("Only engineer personas can create case requests in this prototype.");
      }

      const errors: FieldErrors = {};
      const title = requiredText(errors, "title", "Title", body.title, 160);
      const description = requiredText(errors, "description", "Description", body.description, 4000);
      const occurredAt = optionalDate(errors, "occurredAt", "Occurred date", body.occurredAt);
      const tag = optionalText(errors, "tag", "Tag", body.tag);
      const component = optionalText(errors, "component", "Component", body.component);
      const mechanism = optionalText(errors, "mechanism", "Problem type", body.mechanism);
      const plant = optionalText(errors, "plant", "Plant", body.plant);
      const related = Array.isArray(body.relatedDivisionIds) ? body.relatedDivisionIds : [];
      if (related.some((id) => !s.referenceData.divisions.some((d) => d.id === id))) {
        addError(errors, "relatedDivisionIds", "One or more related divisions are unknown.");
      }
      if (hasErrors(errors)) return validationError(errors);

      const owner =
        s.referenceData.users.find((u) => u.role === "management" && u.divisionId === user.divisionId) ?? null;
      if (!owner) return apiError("INTERNAL_ERROR", "No division head is configured for your division.");

      const at = nowIso();
      const id = nextId(s, "case");
      const divisionIds = Array.from(new Set([user.divisionId, ...related]));
      const item: CaseDetail = {
        id,
        sourceIncidentId: null,
        scenarioId: null,
        title,
        description,
        occurredAt: occurredAt
          ? { value: occurredAt, precision: "date", provenance: "demo" }
          : { value: null, precision: "unavailable", provenance: "demo" },
        tag,
        component,
        mechanism,
        plant,
        divisionIds,
        status: "draft",
        historicalStatus: null,
        priority: null,
        priorityReview: "not_reviewed",
        impact: {
          actualLossKusd: null,
          potentialLossKusd: null,
          totalExposureKusd: null,
          downtimeHours: null,
          evidenceIds: [],
        },
        people: {
          proposingDivisionId: user.divisionId,
          proposer: clone(user),
          accountableOwner: clone(owner),
          assignees: [],
          historicalRcaPic: null,
          provenance: "demo",
        },
        mlState: "unavailable",
        createdAt: at,
        updatedAt: at,
        version: 1,
        isDemo: true,
        permissions: {
          canEdit: false,
          canAssign: false,
          canAddNote: false,
          canDraftAction: false,
          canReviewAction: false,
          allowedTransitions: [],
        },
        eqType: null,
        monitoring: { state: "unavailable", reason: "No monitoring context is linked to a new report.", context: null },
        chronology: [],
        historicalFindings: [],
        rulesFindings: [],
        insight: {
          state: "unavailable",
          reason: "New reports are not analysed in this prototype.",
          modelVersion: null,
          validationBasis: null,
          scoreMeaning: "relative_ranking_not_probability",
          candidates: [],
        },
        conflicts: [],
        questions: [],
        actionReferences: [],
        suppressedActions: [],
        historicalActions: [],
        evidence: [],
        actions: [],
        activity: [
          {
            id: nextId(s, "activity"),
            caseId: id,
            actor: clone(user),
            createdAt: at,
            kind: "created",
            text: "Created case request as draft.",
            provenance: "demo",
          },
        ],
      };
      s.cases.push(item);
      return ok(withPermissions(user, item));
    },

    async updateCase(userId, caseId, body) {
      await tick();
      const s = await getSession();
      const r = resolveCase(s, userId, caseId);
      if (isErr(r)) return r;
      const { user, item } = r;
      const perms = permissionsFor(user, item);

      if (!Number.isInteger(body.expectedVersion)) {
        return validationError({ expectedVersion: ["Expected version is required."] });
      }
      if (body.expectedVersion !== item.version) {
        return apiError(
          "VERSION_CONFLICT",
          `This case changed since you loaded it (version ${item.version}, you had ${body.expectedVersion}). Reload and try again.`,
        );
      }

      const contentKeys = ["title", "description", "occurredAt", "tag", "component", "mechanism", "plant", "relatedDivisionIds"] as const;
      const touchesContent = contentKeys.some((k) => body[k] !== undefined);
      const touchesManagement = body.assigneeIds !== undefined || body.priority !== undefined;

      if (!touchesContent && !touchesManagement) {
        return validationError({ form: ["Nothing to update."] });
      }
      if (touchesContent) {
        if (item.sourceIncidentId !== null) {
          return forbidden("Source-derived case content is immutable.");
        }
        if (!perms.canEdit) {
          return forbidden("Only the proposer can edit a case while it is a draft or needs revision.");
        }
      }
      if (touchesManagement && !perms.canAssign) {
        return forbidden("Only a manager of an involved division can change assignment or reviewed priority at this stage.");
      }

      const errors: FieldErrors = {};
      const next: Partial<CaseDetail> = {};
      const changes: string[] = [];

      if (body.title !== undefined) {
        next.title = requiredText(errors, "title", "Title", body.title, 160);
        changes.push("title");
      }
      if (body.description !== undefined) {
        next.description = requiredText(errors, "description", "Description", body.description, 4000);
        changes.push("description");
      }
      if (body.occurredAt !== undefined) {
        const d = optionalDate(errors, "occurredAt", "Occurred date", body.occurredAt);
        next.occurredAt = d
          ? { value: d, precision: "date", provenance: "demo" }
          : { value: null, precision: "unavailable", provenance: "demo" };
        changes.push("occurred date");
      }
      if (body.tag !== undefined) {
        next.tag = optionalText(errors, "tag", "Tag", body.tag);
        changes.push("tag");
      }
      if (body.component !== undefined) {
        next.component = optionalText(errors, "component", "Component", body.component);
        changes.push("component");
      }
      if (body.mechanism !== undefined) {
        next.mechanism = optionalText(errors, "mechanism", "Problem type", body.mechanism);
        changes.push("problem type");
      }
      if (body.plant !== undefined) {
        next.plant = optionalText(errors, "plant", "Plant", body.plant);
        changes.push("plant");
      }
      if (body.relatedDivisionIds !== undefined) {
        const related = Array.isArray(body.relatedDivisionIds) ? body.relatedDivisionIds : [];
        if (related.some((id) => !s.referenceData.divisions.some((d) => d.id === id))) {
          addError(errors, "relatedDivisionIds", "One or more related divisions are unknown.");
        }
        next.divisionIds = Array.from(new Set([item.people.proposingDivisionId, ...related]));
        changes.push("related divisions");
      }

      let assignees: User[] | undefined;
      if (body.assigneeIds !== undefined) {
        const ids = Array.isArray(body.assigneeIds) ? Array.from(new Set(body.assigneeIds)) : [];
        assignees = [];
        for (const id of ids) {
          const u = findUser(s, id);
          if (!u || u.role !== "engineer") {
            addError(errors, "assigneeIds", "Assignees must be engineer personas.");
            break;
          }
          if (!u.divisionId || !item.divisionIds.includes(u.divisionId)) {
            addError(errors, "assigneeIds", `${u.displayName.replace(/\s*\(Demo\)$/i, "")} is not in a division involved in this case.`);
            break;
          }
          assignees.push(clone(u));
        }
        changes.push("assignment");
      }
      if (body.priority !== undefined) {
        if (!PRIORITIES.includes(body.priority)) addError(errors, "priority", "Priority must be high, medium or low.");
        changes.push("reviewed priority");
      }
      if (hasErrors(errors)) return validationError(errors);

      Object.assign(item, next);
      if (assignees) item.people.assignees = assignees;
      if (body.priority !== undefined) {
        item.priority = body.priority;
        item.priorityReview = "reviewed";
      }
      touch(s, item, user, "updated", `Updated ${changes.join(", ")}.`);
      return ok(withPermissions(user, item));
    },

    async transitionCase(userId, caseId, body) {
      await tick();
      const s = await getSession();
      const r = resolveCase(s, userId, caseId);
      if (isErr(r)) return r;
      const { user, item } = r;

      if (!Number.isInteger(body.expectedVersion)) {
        return validationError({ expectedVersion: ["Expected version is required."] });
      }
      if (body.expectedVersion !== item.version) {
        return apiError(
          "VERSION_CONFLICT",
          `This case changed since you loaded it (version ${item.version}, you had ${body.expectedVersion}). Reload and try again.`,
        );
      }
      const errors: FieldErrors = {};
      const note = requiredText(errors, "note", "Note", body.note, 4000);
      if (!ALL_STATUSES.includes(body.to)) addError(errors, "to", "Unknown target status.");
      if (hasErrors(errors)) return validationError(errors);

      const from = item.status;
      const anyRoleAllows = Object.values(TRANSITIONS[from]).some((list) => list?.includes(body.to));
      if (!anyRoleAllows) {
        return apiError("INVALID_TRANSITION", `A case cannot move from ${STATUS_TEXT[from]} to ${STATUS_TEXT[body.to]}.`);
      }
      const roleAllows = (TRANSITIONS[from][user.role] ?? []).includes(body.to);
      const allowed = permissionsFor(user, item).allowedTransitions.includes(body.to);
      if (!roleAllows) {
        return forbidden(`Your persona cannot move a case from ${STATUS_TEXT[from]} to ${STATUS_TEXT[body.to]}.`);
      }
      if (!allowed) {
        // Role permits it; either ownership/assignment or a precondition blocks it.
        const isManager = user.role === "management";
        const isProposer = item.people.proposer.id === user.id;
        const isAssigned = item.people.assignees.some((a) => a.id === user.id);
        const ownershipOk = isManager || (from === "draft" || from === "needs_revision" ? isProposer : isAssigned);
        if (!ownershipOk) {
          return forbidden(
            from === "draft" || from === "needs_revision"
              ? "Only the proposer can submit this case."
              : "Only an assigned engineer or a manager can move this case.",
          );
        }
        let reason = "A precondition for this transition is not met.";
        if (body.to === "investigating") reason = "Assign at least one engineer before accepting the case for investigation.";
        else if (body.to === "action_in_progress") reason = "At least one action must be approved or in progress.";
        else if (body.to === "awaiting_verification") reason = "At least one action is required and every action must be completed or verified.";
        else if (body.to === "closed") {
          reason = item.conflicts.length > 0
            ? "This case has an unresolved source conflict and cannot close in v1."
            : "Every action must be verified before closing.";
        }
        return apiError("INVALID_TRANSITION", reason);
      }
      if (body.to === "submitted" && (!item.title.trim() || !item.description.trim())) {
        return validationError({ title: ["Title and description are required before submission."] });
      }

      item.status = body.to;
      touch(s, item, user, "transition", `Status changed from ${STATUS_TEXT[from]} to ${STATUS_TEXT[body.to]}. Note: ${note}`);
      return ok(withPermissions(user, item));
    },

    async addNote(userId, caseId, body) {
      await tick();
      const s = await getSession();
      const r = resolveCase(s, userId, caseId);
      if (isErr(r)) return r;
      const { user, item } = r;
      if (!permissionsFor(user, item).canAddNote) {
        return forbidden("Notes require an assigned engineer or a manager while the case is live.");
      }
      const errors: FieldErrors = {};
      const text = requiredText(errors, "text", "Note", body.text, 4000);
      if (hasErrors(errors)) return validationError(errors);
      touch(s, item, user, "note", text);
      return ok(withPermissions(user, item));
    },

    async createAction(userId, caseId, body) {
      await tick();
      const s = await getSession();
      const r = resolveCase(s, userId, caseId);
      if (isErr(r)) return r;
      const { user, item } = r;
      if (!permissionsFor(user, item).canDraftAction) {
        return forbidden("Drafting actions requires an assigned engineer or a manager while the case is investigating or has actions in progress.");
      }

      const errors: FieldErrors = {};
      const title = requiredText(errors, "title", "Title", body.title, 160);
      const description = requiredText(errors, "description", "Description", body.description, 4000);
      const dueDate = optionalDate(errors, "dueDate", "Due date", body.dueDate);
      const evidenceIds = Array.isArray(body.evidenceIds) ? Array.from(new Set(body.evidenceIds)) : [];
      const evidenceSet = new Set(item.evidence.map((e) => e.id));
      if (evidenceIds.some((id) => !evidenceSet.has(id))) {
        addError(errors, "evidenceIds", "Evidence must belong to this case.");
      }
      if (body.assigneeId !== null && body.assigneeId !== undefined) {
        if (!item.people.assignees.some((a) => a.id === body.assigneeId && a.role === "engineer")) {
          addError(errors, "assigneeId", "The action assignee must be an engineer assigned to this case.");
        }
      }
      let referenceId: ID | null = null;
      if (body.referenceId !== null && body.referenceId !== undefined) {
        const ref = item.actionReferences.find((a) => a.id === body.referenceId);
        if (item.suppressedActions.some((x) => x.id === body.referenceId)) {
          return apiError("REFERENCE_SUPPRESSED", "This reference is withheld by rule HR-PU-2101B-002 and cannot be drafted.");
        }
        if (!ref) addError(errors, "referenceId", "The reference must be one of this case's offered action references.");
        else if (isSuppressedReference(ref, item.eqType)) {
          return apiError(
            "REFERENCE_SUPPRESSED",
            "This pump-specific reference is withheld because the equipment type is not PU or is unknown (rule HR-PU-2101B-002).",
          );
        } else referenceId = ref.id;
      }
      if (hasErrors(errors)) return validationError(errors);

      const at = nowIso();
      const action: Action = {
        id: nextId(s, "action"),
        caseId: item.id,
        title,
        description,
        referenceId,
        evidenceIds,
        assigneeId: body.assigneeId ?? null,
        dueDate,
        status: "draft",
        applicabilityReview: null,
        completionNote: null,
        verificationNote: null,
        createdAt: at,
        updatedAt: at,
        provenance: "demo",
      };
      item.actions.push(action);
      touch(s, item, user, "action", `Drafted action "${title}".`);
      return ok(withPermissions(user, item));
    },

    async updateAction(userId, caseId, actionId, body) {
      await tick();
      const s = await getSession();
      const r = resolveCase(s, userId, caseId);
      if (isErr(r)) return r;
      const { user, item } = r;
      const perms = permissionsFor(user, item);

      if (!Number.isInteger(body.expectedCaseVersion)) {
        return validationError({ expectedCaseVersion: ["Expected case version is required."] });
      }
      if (body.expectedCaseVersion !== item.version) {
        return apiError(
          "VERSION_CONFLICT",
          `This case changed since you loaded it (version ${item.version}, you had ${body.expectedCaseVersion}). Reload and try again.`,
        );
      }
      const action = item.actions.find((a) => a.id === actionId);
      if (!action) return apiError("NOT_FOUND", "This action does not exist on the case.");

      const isManager = user.role === "management";
      const isAssigned = user.role === "engineer" && item.people.assignees.some((a) => a.id === user.id);
      const errors: FieldErrors = {};
      const evidenceSet = new Set(item.evidence.map((e) => e.id));
      const summary: string[] = [];

      // Content edits: draft only.
      if (body.title !== undefined || body.description !== undefined) {
        if (action.status !== "draft") return forbidden("Only draft action content can be edited.");
        if (!perms.canDraftAction) return forbidden("Your persona cannot edit this action.");
      }
      // Assignment / due date: managers before verification, or drafters while draft.
      if (body.assigneeId !== undefined || body.dueDate !== undefined) {
        const managerOk = isManager && perms.canReviewAction && action.status !== "verified";
        const drafterOk = action.status === "draft" && perms.canDraftAction;
        if (!managerOk && !drafterOk) return forbidden("Your persona cannot change this action's assignment or due date.");
      }

      const next: Partial<Action> = {};
      if (body.title !== undefined) next.title = requiredText(errors, "title", "Title", body.title, 160);
      if (body.description !== undefined)
        next.description = requiredText(errors, "description", "Description", body.description, 4000);
      if (body.assigneeId !== undefined) {
        if (body.assigneeId !== null && !item.people.assignees.some((a) => a.id === body.assigneeId && a.role === "engineer")) {
          addError(errors, "assigneeId", "The action assignee must be an engineer assigned to this case.");
        }
        next.assigneeId = body.assigneeId;
      }
      if (body.dueDate !== undefined) next.dueDate = optionalDate(errors, "dueDate", "Due date", body.dueDate);

      let evidenceIds: ID[] | undefined;
      if (body.evidenceIds !== undefined) {
        evidenceIds = Array.isArray(body.evidenceIds) ? Array.from(new Set(body.evidenceIds)) : [];
        if (evidenceIds.some((id) => !evidenceSet.has(id))) addError(errors, "evidenceIds", "Evidence must belong to this case.");
      }

      if (body.status !== undefined && body.status !== action.status) {
        const from = action.status;
        const to = body.status;
        if (from === "draft" && to === "approved") {
          if (!isManager || !perms.canReviewAction) return forbidden("Only a manager of an involved division can approve an action.");
          const review = requiredText(errors, "applicabilityReview", "Applicability review", body.applicabilityReview, 4000);
          if (action.referenceId) {
            const ref = item.actionReferences.find((a) => a.id === action.referenceId);
            if (!ref || isSuppressedReference(ref, item.eqType) || item.suppressedActions.some((x) => x.id === action.referenceId)) {
              return apiError("REFERENCE_SUPPRESSED", "The linked reference is withheld by rule HR-PU-2101B-002; this action cannot be approved.");
            }
          }
          next.applicabilityReview = review;
        } else if (from === "approved" && to === "in_progress") {
          if (!isManager && !isAssigned) return forbidden("Only an assigned engineer or a manager can start this action.");
          if (!perms.canDraftAction) return forbidden("Actions can start only while the case is investigating or has actions in progress.");
        } else if (from === "in_progress" && to === "completed") {
          if (!isManager && !isAssigned) return forbidden("Only an assigned engineer or a manager can complete this action.");
          next.completionNote = requiredText(errors, "completionNote", "Completion note", body.completionNote, 4000);
          if (!evidenceIds || evidenceIds.length === 0) addError(errors, "evidenceIds", "Select at least one evidence record.");
        } else if (from === "completed" && to === "verified") {
          if (!isManager || !perms.canReviewAction) return forbidden("Only a manager of an involved division can verify an action.");
          next.verificationNote = requiredText(errors, "verificationNote", "Verification note", body.verificationNote, 4000);
          if (!evidenceIds || evidenceIds.length === 0) addError(errors, "evidenceIds", "Select at least one evidence record.");
        } else if (from === "completed" && to === "in_progress") {
          if (!isManager || !perms.canReviewAction) return forbidden("Only a manager can return a completed action.");
          const note = requiredText(errors, "verificationNote", "Review note", body.verificationNote, 4000);
          summary.push(`Review note: ${note}`);
        } else {
          return apiError(
            "INVALID_TRANSITION",
            `An action cannot move from ${ACTION_STATUS_TEXT[from]} to ${ACTION_STATUS_TEXT[to] ?? to}.`,
          );
        }
        if (!hasErrors(errors)) {
          next.status = to;
          summary.unshift(`Action "${action.title}" moved from ${ACTION_STATUS_TEXT[from]} to ${ACTION_STATUS_TEXT[to]}.`);
          if (to === "in_progress" && from === "completed") next.completionNote = null;
        }
      } else if (body.applicabilityReview !== undefined || body.completionNote !== undefined || body.verificationNote !== undefined) {
        return validationError({ status: ["Review and completion fields are submitted with a status change."] });
      }

      if (hasErrors(errors)) return validationError(errors);
      if (evidenceIds) next.evidenceIds = Array.from(new Set([...action.evidenceIds, ...evidenceIds]));
      if (summary.length === 0) summary.push(`Updated action "${action.title}".`);

      Object.assign(action, next, { updatedAt: nowIso() });
      touch(s, item, user, "action", summary.join(" "));
      return ok(withPermissions(user, item));
    },

    async getPerformance(userId, filters) {
      await tick();
      const s = await getSession();
      const user = findUser(s, userId);
      if (!user) return personaRequired();
      const errors: FieldErrors = {};
      const f = parseFilters(s, filters, errors);
      if (hasErrors(errors)) return apiError("VALIDATION_ERROR", "The performance filters are not valid.", errors);
      return ok(performanceForCases(visibleFiltered(s, user, f)));
    },

    async getSummary(userId, filters): Promise<Result<Summary>> {
      await tick();
      const s = await getSession();
      const user = findUser(s, userId);
      if (!user) return personaRequired();
      const errors: FieldErrors = {};
      const f = parseFilters(s, filters, errors);
      if (hasErrors(errors)) return apiError("VALIDATION_ERROR", "The summary filters are not valid.", errors);

      const set = visibleFiltered(s, user, f);
      const countsByStatus = Object.fromEntries(ALL_STATUSES.map((st) => [st, 0])) as Record<CaseStatus, number>;
      let actual = 0;
      let potential = 0;
      let downtime = 0;
      let knownActual = 0;
      let knownPotential = 0;
      let knownDowntime = 0;
      for (const c of set) {
        countsByStatus[c.status] += 1;
        if (c.impact.actualLossKusd !== null) {
          actual += c.impact.actualLossKusd;
          knownActual += 1;
        }
        if (c.impact.potentialLossKusd !== null) {
          potential += c.impact.potentialLossKusd;
          knownPotential += 1;
        }
        if (c.impact.downtimeHours !== null) {
          downtime += c.impact.downtimeHours;
          knownDowntime += 1;
        }
      }
      return ok({
        totalCases: set.length,
        countsByStatus,
        awaitingReviewCount: countsByStatus.submitted,
        actualLossKusd: round6(actual),
        potentialLossKusd: round6(potential),
        summedIncidentDowntimeHours: round6(downtime),
        knownActualLossCount: knownActual,
        knownPotentialLossCount: knownPotential,
        knownDowntimeCount: knownDowntime,
        impactScopeLabel: "Recorded impact of filtered cases; downtime is summed incident hours",
      });
    },

    async getTimeline(userId, filters): Promise<Result<Timeline>> {
      await tick();
      const s = await getSession();
      const user = findUser(s, userId);
      if (!user) return personaRequired();
      const errors: FieldErrors = {};
      const f = parseFilters(s, filters, errors);
      if (hasErrors(errors)) return apiError("VALIDATION_ERROR", "The timeline filters are not valid.", errors);

      const events: TimelineEvent[] = [];
      for (const c of visibleFiltered(s, user, f)) {
        if (c.occurredAt.value) {
          events.push({
            id: `${c.id}#incident`,
            caseId: c.id,
            title: c.title,
            kind: "incident",
            date: c.occurredAt,
            evidenceIds: c.sourceIncidentId ? [c.sourceIncidentId] : [],
          });
        }
        for (const entry of c.chronology) {
          if (!entry.date.value) continue;
          events.push({
            id: entry.id,
            caseId: c.id,
            title: entry.text,
            kind: "chronology",
            date: entry.date,
            evidenceIds: entry.evidenceIds,
          });
        }
        for (const a of c.actions) {
          if (!a.dueDate) continue;
          events.push({
            id: `${a.id}#due`,
            caseId: c.id,
            title: a.title,
            kind: "action_due",
            date: { value: a.dueDate, precision: "date", provenance: "demo" },
            evidenceIds: [],
          });
        }
      }
      const dated = events.filter((e) => parseableTime(e.date) !== null);
      const undated = events.filter((e) => parseableTime(e.date) === null);
      dated.sort((a, b) => (parseableTime(a.date) as number) - (parseableTime(b.date) as number) || (a.id < b.id ? -1 : 1));
      undated.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      return ok({ items: [...dated, ...undated], undatedCount: undated.length });
    },

    async reset() {
      const fixture = await loadFixture();
      session = {
        fixture,
        cases: structuredClone(fixture.cases),
        referenceData: structuredClone(fixture.referenceData),
        counter: 0,
      };
    },
  };
}

/** Mock only: the fixture's recommendedPersonaIds, used to check config.ts agrees with the fixture. */
export async function mockRecommendedPersonaIds(): Promise<ID[]> {
  const s = await getSession();
  return [...s.fixture.recommendedPersonaIds];
}
