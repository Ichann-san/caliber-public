import type { CaseFilters, CaseQuery, CaseStatus, MlState, ReferenceData } from "@contracts/v1";
import type { SelectOption } from "@/components/view-models";
import { STATUS_ORDER, statusView } from "@/lib/client/mappers";

/** Filter values as strings for controlled selects; "" means no filter. */
export interface FilterState {
  search: string;
  status: string; // "active" | "all" | CaseStatus
  divisionId: string;
  mechanism: string;
  plant: string;
  mlState: string;
  priorityReview: string;
}

export const EMPTY_FILTERS: FilterState = {
  search: "",
  status: "active",
  divisionId: "",
  mechanism: "",
  plant: "",
  mlState: "",
  priorityReview: "",
};

export const STATUS_OPTIONS: SelectOption[] = [
  { value: "active", label: "Active (not closed)" },
  { value: "all", label: "All, including closed" },
  ...STATUS_ORDER.map((s) => ({ value: s, label: statusView(s).label })),
];

export const ML_OPTIONS: SelectOption[] = [
  { value: "", label: "Any insight state" },
  { value: "ranked", label: "ML ranked" },
  { value: "abstain", label: "ML abstain" },
  { value: "unavailable", label: "Analysis not available" },
];

export const REVIEW_OPTIONS: SelectOption[] = [
  { value: "", label: "Any review state" },
  { value: "not_reviewed", label: "Not yet reviewed" },
  { value: "reviewed", label: "Priority reviewed" },
];

export const SORT_OPTIONS: SelectOption[] = [
  { value: "priority", label: "Priority" },
  { value: "updated_desc", label: "Recently updated" },
  { value: "occurred_desc", label: "Occurrence date, newest first" },
];

export function referenceOptions(ref: ReferenceData | null) {
  return {
    divisions: [{ value: "", label: "All divisions" }, ...(ref?.divisions ?? []).map((d) => ({ value: d.id, label: d.name }))],
    mechanisms: [{ value: "", label: "All problem types" }, ...(ref?.mechanisms ?? []).map((m) => ({ value: m, label: m }))],
    plants: [{ value: "", label: "All plants" }, ...(ref?.plants ?? []).map((p) => ({ value: p, label: p }))],
  };
}

export function toCaseFilters(f: FilterState): CaseFilters {
  const out: CaseFilters = {};
  const search = f.search.trim();
  if (search) out.search = search;
  if (f.status && f.status !== "active") out.status = f.status as CaseStatus | "all";
  if (f.divisionId) out.divisionId = f.divisionId;
  if (f.mechanism) out.mechanism = f.mechanism;
  if (f.plant) out.plant = f.plant;
  if (f.mlState) out.mlState = f.mlState as MlState;
  if (f.priorityReview) out.priorityReview = f.priorityReview as "reviewed" | "not_reviewed";
  return out;
}

export function filtersFromParams(params: URLSearchParams): FilterState {
  return {
    search: params.get("search") ?? "",
    status: params.get("status") ?? "active",
    divisionId: params.get("divisionId") ?? "",
    mechanism: params.get("mechanism") ?? "",
    plant: params.get("plant") ?? "",
    mlState: params.get("mlState") ?? "",
    priorityReview: params.get("priorityReview") ?? "",
  };
}

/** Human scope text for Summary/Timeline headers. */
export function scopeText(personaLabel: string, f: FilterState, ref: ReferenceData | null): string {
  const parts: string[] = [];
  const status = STATUS_OPTIONS.find((o) => o.value === f.status)?.label ?? f.status;
  parts.push(status.toLowerCase().startsWith("active") ? "active cases" : f.status === "all" ? "all cases including closed" : `${status} cases`);
  if (f.divisionId) parts.push(`division ${ref?.divisions.find((d) => d.id === f.divisionId)?.name ?? f.divisionId}`);
  if (f.mechanism) parts.push(`problem type ${f.mechanism}`);
  if (f.plant) parts.push(`plant ${f.plant}`);
  if (f.mlState) parts.push(ML_OPTIONS.find((o) => o.value === f.mlState)?.label ?? f.mlState);
  if (f.priorityReview) parts.push(REVIEW_OPTIONS.find((o) => o.value === f.priorityReview)?.label ?? f.priorityReview);
  if (f.search.trim()) parts.push(`matching "${f.search.trim()}"`);
  return `Cases visible to ${personaLabel}: ${parts.join(", ")}.`;
}

export type SortValue = NonNullable<CaseQuery["sort"]>;
