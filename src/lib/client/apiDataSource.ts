/**
 * API adapter: fetches /api/v1 with the demo persona header. Errors are
 * returned as ApiError and surfaced by the UI. It NEVER falls back to mock.
 */

import type { ApiError, ErrorCode, ID } from "@contracts/v1";
import { API_BASE } from "./config";
import { apiError, toSearchParams, type DataSource, type Result } from "./dataSource";

const ERROR_CODES: ErrorCode[] = [
  "VALIDATION_ERROR",
  "PERSONA_REQUIRED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_TRANSITION",
  "VERSION_CONFLICT",
  "REFERENCE_SUPPRESSED",
  "SERVICE_UNAVAILABLE",
  "INTERNAL_ERROR",
];

function isApiErrorBody(value: unknown): value is ApiError {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const err = (value as { error: unknown }).error;
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as { code?: unknown }).code === "string" &&
    ERROR_CODES.includes((err as { code: ErrorCode }).code) &&
    typeof (err as { message?: unknown }).message === "string"
  );
}

function codeForStatus(status: number): ErrorCode {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "PERSONA_REQUIRED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "VERSION_CONFLICT";
  if (status === 503) return "SERVICE_UNAVAILABLE";
  return "INTERNAL_ERROR";
}

const seg = (id: ID) => encodeURIComponent(id);

async function request<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  userId: ID | null,
  body?: unknown,
): Promise<Result<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (userId) headers["X-Demo-User-Id"] = userId;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      cache: "no-store",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return apiError(
      "SERVICE_UNAVAILABLE",
      `The API at ${API_BASE} could not be reached. No mock data is shown in api mode.`,
    );
  }

  let parsed: unknown = undefined;
  const text = await response.text().catch(() => "");
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
  }

  if (!response.ok) {
    if (isApiErrorBody(parsed)) return parsed;
    return apiError(
      codeForStatus(response.status),
      `The API returned HTTP ${response.status} for ${method} ${API_BASE}${path} without a contract error body. No mock data is shown in api mode.`,
    );
  }

  if (typeof parsed === "object" && parsed !== null && "data" in parsed && "meta" in parsed) {
    return parsed as Result<T>;
  }
  return apiError(
    "INTERNAL_ERROR",
    `The API response for ${method} ${API_BASE}${path} is not the contract JSON shape.`,
  );
}

export function createApiDataSource(): DataSource {
  return {
    mode: "api",
    listPersonas: () => request("GET", "/personas", null),
    getMe: (userId) => request("GET", "/me", userId),
    getReferenceData: (userId) => request("GET", "/reference-data", userId),
    listCases: (userId, query) => {
      const qs = toSearchParams(query).toString();
      return request("GET", `/cases${qs ? `?${qs}` : ""}`, userId);
    },
    getCase: (userId, caseId) => request("GET", `/cases/${seg(caseId)}`, userId),
    createCase: (userId, body) => request("POST", "/cases", userId, body),
    updateCase: (userId, caseId, body) => request("PATCH", `/cases/${seg(caseId)}`, userId, body),
    transitionCase: (userId, caseId, body) =>
      request("POST", `/cases/${seg(caseId)}/transitions`, userId, body),
    addNote: (userId, caseId, body) => request("POST", `/cases/${seg(caseId)}/notes`, userId, body),
    createAction: (userId, caseId, body) => request("POST", `/cases/${seg(caseId)}/actions`, userId, body),
    updateAction: (userId, caseId, actionId, body) =>
      request("PATCH", `/cases/${seg(caseId)}/actions/${seg(actionId)}`, userId, body),
    getSummary: (userId, filters) => {
      const qs = toSearchParams(filters).toString();
      return request("GET", `/summary${qs ? `?${qs}` : ""}`, userId);
    },
    getPerformance: (userId, filters) => {
      const qs = toSearchParams(filters).toString();
      return request("GET", `/performance${qs ? `?${qs}` : ""}`, userId);
    },
    getTimeline: (userId, filters) => {
      const qs = toSearchParams(filters).toString();
      return request("GET", `/timeline${qs ? `?${qs}` : ""}`, userId);
    },
  };
}
