/**
 * DataSource: one method per endpoint in contracts/README.md "Endpoint map".
 * Every method resolves to the wire shape ApiSuccess<T> | ApiError; adapters
 * never throw for expected failures. `userId` is the active demo persona,
 * sent as X-Demo-User-Id in api mode (except listPersonas).
 */

import type {
  AddNoteRequest,
  ApiError,
  ApiSuccess,
  CaseDetail,
  CaseFilters,
  CaseListItem,
  CaseQuery,
  CreateActionRequest,
  CreateCaseRequest,
  ErrorCode,
  ID,
  Page,
  PerformanceSnapshot,
  ReferenceData,
  Summary,
  Timeline,
  TransitionRequest,
  UpdateActionRequest,
  UpdateCaseRequest,
  User,
} from "@contracts/v1";
import type { DataMode } from "./config";

export type Result<T> = ApiSuccess<T> | ApiError;

export interface DataSource {
  readonly mode: DataMode;
  /** GET /personas */
  listPersonas(): Promise<Result<User[]>>;
  /** GET /me */
  getMe(userId: ID): Promise<Result<User>>;
  /** GET /reference-data */
  getReferenceData(userId: ID): Promise<Result<ReferenceData>>;
  /** GET /cases */
  listCases(userId: ID, query: CaseQuery): Promise<Result<Page<CaseListItem>>>;
  /** GET /cases/:id */
  getCase(userId: ID, caseId: ID): Promise<Result<CaseDetail>>;
  /** POST /cases */
  createCase(userId: ID, body: CreateCaseRequest): Promise<Result<CaseDetail>>;
  /** PATCH /cases/:id */
  updateCase(userId: ID, caseId: ID, body: UpdateCaseRequest): Promise<Result<CaseDetail>>;
  /** POST /cases/:id/transitions */
  transitionCase(userId: ID, caseId: ID, body: TransitionRequest): Promise<Result<CaseDetail>>;
  /** POST /cases/:id/notes */
  addNote(userId: ID, caseId: ID, body: AddNoteRequest): Promise<Result<CaseDetail>>;
  /** POST /cases/:id/actions */
  createAction(userId: ID, caseId: ID, body: CreateActionRequest): Promise<Result<CaseDetail>>;
  /** PATCH /cases/:id/actions/:actionId */
  updateAction(userId: ID, caseId: ID, actionId: ID, body: UpdateActionRequest): Promise<Result<CaseDetail>>;
  /** GET /summary */
  getSummary(userId: ID, filters: CaseFilters): Promise<Result<Summary>>;
  /** GET /performance — source-linked historical asset windows, scoped to readable cases. */
  getPerformance(userId: ID, filters: CaseFilters): Promise<Result<PerformanceSnapshot>>;
  /** GET /timeline */
  getTimeline(userId: ID, filters: CaseFilters): Promise<Result<Timeline>>;
  /** Mock only: restore the fixture. Undefined in api mode. */
  reset?: () => Promise<void>;
}

export function isApiError<T>(result: Result<T>): result is ApiError {
  return typeof result === "object" && result !== null && "error" in result;
}

export function apiError(code: ErrorCode, message: string, fieldErrors?: Record<string, string[]>): ApiError {
  return fieldErrors ? { error: { code, message, fieldErrors } } : { error: { code, message } };
}

/** Serialises CaseQuery / CaseFilters to URL query parameters, skipping empty values. */
export function toSearchParams(query: CaseQuery | CaseFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  return params;
}
