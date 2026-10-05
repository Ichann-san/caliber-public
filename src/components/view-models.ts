/**
 * Frozen view models and shared component props for the Gate 5 FE.
 *
 * Owner: FE coordinator. Both FE agents read this file; neither edits it.
 * Change requests go to the coordinator, who announces them to both agents.
 *
 * These are display-ready shapes, not API DTOs. Domain enums (workflow
 * status, transitions, access categories) belong to the shared backend
 * contract; mappers in src/lib/client translate DTOs into these shapes.
 * Copy is English (PM decision, 1 October 2026).
 */

import type { ReactNode } from "react";

/* ---------- Primitives ---------- */

/** Visual tone of a status or label. Always paired with visible text. */
export type Tone = "neutral" | "info" | "progress" | "attention" | "success" | "warning";

/** Where a piece of information comes from. Rendered as a text label, never colour alone. */
export type ProvenanceKind =
  | "source" // historical source record (incident register, RCA deck)
  | "demo" // simulated prototype state: assignment, note, date, draft
  | "rules" // Gate 4 rules output (variant A default)
  | "ml" // offline ML O3 ranking
  | "assumed" // ASSUMED target or organisation
  | "unavailable"; // data not available; never shown as healthy

export interface ProvenanceLabelView {
  kind: ProvenanceKind;
  text: string; // e.g. "Source", "Demo", "Rules (Gate 4)", "ML ranking", "Assumed", "Not available"
  title?: string; // optional longer explanation for tooltip / sr text
}

export interface StatusView {
  label: string; // e.g. "Investigating" (wording from the contract)
  tone: Tone;
}

export interface ReviewView {
  reviewed: boolean;
  label: string; // "Not yet reviewed" when reviewed === false
}

export interface MetricView {
  label: string; // e.g. "Actual loss"
  value: string | null; // pre-formatted, e.g. "226.44"; null when unavailable
  unit?: string; // e.g. "kUSD", "h"
  unavailableText?: string; // shown when value is null, e.g. "Not recorded"
  note?: string; // e.g. "Not a savings figure"
  provenance?: ProvenanceLabelView;
}

export interface EvidenceRefView {
  id: string;
  label: string; // short human label, e.g. "RCA deck PU-2101B, slide 6"
}

export interface EvidenceRecordView {
  id: string;
  title: string;
  provenance: ProvenanceLabelView;
  locator: string; // e.g. "Incident Database.xlsx; Serial No=1"
  body: string; // excerpt, shown as quoted source text
  classLabel?: string; // e.g. "VERIFIED", "DERIVED"
}

export interface SelectOption {
  value: string;
  label: string;
}

/* ---------- People ---------- */

export type PersonRole = "proposer" | "accountable_owner" | "assignee" | "historical_rca_pic";

export interface PersonView {
  role: PersonRole;
  roleLabel: string; // "Proposer", "Accountable owner", "Assignee", "Historical RCA PIC"
  name: string | null;
  jobTitle: string | null; // specific title, e.g. "Piping Engineer"
  division: string | null;
  avatarSrc?: string;
  initials?: string;
  provenance: ProvenanceLabelView; // demo vs source
  missingText?: string; // shown when name is null, e.g. "Not assigned"
}

export interface PersonaView {
  id: string;
  name: string;
  jobTitle: string;
  accessLabel: string; // "Management", "Engineer", "Unassigned staff" (from contract)
  division: string | null;
}

/* ---------- Case card (board) ---------- */

export interface CaseIdentityView {
  tag: string;
  component: string;
  mechanism: string; // problem type
  plant: string;
  division: string | null;
}

export interface CaseCardView {
  id: string;
  href: string;
  displayId: string; // short id shown on the card
  title: string;
  dateText: string; // relative occurrence age, or source text when not parseable
  dateDetailText: string; // occurrence date exactly as provided by source
  identity: CaseIdentityView;
  status: StatusView;
  review: ReviewView;
  impact: MetricView[]; // downtime, actual loss, potential loss (separate items)
  proposer: PersonView;
  owner: PersonView; // accountable owner
  insight: ProvenanceLabelView; // e.g. ML ranked / abstain / analysis not available
}

export interface CaseCardProps {
  card: CaseCardView;
}

/* ---------- Case detail ---------- */

export interface SectionLinkView {
  id: string; // anchor id on the page
  label: string;
}

export interface ChronologyItemView {
  id: string;
  dateText: string | null; // exactly as in source, or demo date
  dateKind: "source" | "demo" | "undated";
  title: string;
  body?: string;
  evidence?: EvidenceRefView[];
}

export type InsightGroupKind = "historical_rca" | "rules" | "ml";

export interface InsightItemView {
  id: string;
  rank?: number; // ML only
  text: string;
  category?: string; // e.g. "PARAMETER"
  scoreText?: string; // "Ranking score 0.94" (never a percentage)
  statusLabel?: string; // e.g. "Verified NG", "Checked, not NG", "Candidate to verify"
  evidence: EvidenceRefView[];
}

export interface InsightGroupView {
  kind: InsightGroupKind;
  title: string; // "Historical RCA findings", "Rules context (Gate 4)", "ML candidate ranking"
  provenance: ProvenanceLabelView;
  state: "available" | "abstain" | "unavailable";
  reason?: string; // abstain / unavailable reason
  caveat?: string; // e.g. "Abstain does not mean the asset is healthy."
  items: InsightItemView[];
  hiddenCount?: number; // ML candidates the ranker does not show (collapsed, not deleted)
}

export interface QuestionView {
  id: string;
  toDivision: string;
  question: string;
  why: string;
  evidence: EvidenceRefView[];
}

export interface ActionRefView {
  id: string;
  text: string;
  categoryLabel: string; // "Corrective", "Preventive", "Pro-active"
  ownerDivision: string | null;
  applicabilityLabel: string; // "Needs applicability review"
  evidence: EvidenceRefView[];
}

export interface WithheldActionView {
  id: string;
  text: string;
  reason: string; // e.g. "Pump-only interlock; equipment type is not PU or unknown."
  ruleId: string;
}

export interface ActivityItemView {
  id: string;
  whenText: string;
  whenKind: "source" | "demo";
  actor: string;
  text: string;
}

export interface CaseDetailHeaderView {
  card: CaseCardView;
  sourceStatusText: string | null; // historical status from the register
  eqTypeText: string; // "PU" or "Unknown" (never guessed from tag)
}

/* ---------- Summary ---------- */

export interface BreakdownRowView {
  label: string;
  count: number;
  valueText?: string;
}

export interface SummaryView {
  scopeText: string; // e.g. "Cases in Rotating Maintenance scope, active only"
  metrics: MetricView[]; // actual loss, potential loss, case counts, downtime (selected cases)
  byStatus: BreakdownRowView[];
  byProblemType: BreakdownRowView[];
  insightCoverage: BreakdownRowView[]; // ranked / abstain / not available
  footnotes: string[];
}

/* ---------- Timeline ---------- */

export interface TimelineEventView {
  id: string;
  caseId: string;
  caseTitle: string;
  href: string;
  dateISO: string; // for positioning; only for dates that exist
  dateText: string; // as displayed
  kind: "source" | "demo";
  label: string; // e.g. "Occurred", "RCA due", "Demo: submitted"
}

export interface TimelineLaneView {
  id: string;
  title: string; // case title
  href: string;
  events: TimelineEventView[];
  undatedCount?: number; // events with no source date; reported, never placed on the axis
}

/* ---------- Board controls ---------- */

export interface PaginationView {
  page: number; // 1-based
  pageSize: number;
  total: number;
  pageSizeOptions: number[]; // [5, 10, 20]
}

export interface PaginationProps {
  pagination: PaginationView;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export interface SearchFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

/* ---------- Shell ---------- */

export interface NavItemView {
  href: string;
  label: string;
  icon?: ReactNode; // supplied by the feature layer; no hand-drawn SVG
  active: boolean;
}

export interface AppShellProps {
  nav: NavItemView[];
  personas: PersonaView[];
  activePersonaId: string;
  onPersonaChange: (id: string) => void;
  children: ReactNode;
}

/* ---------- Generic states ---------- */

export type HeadingLevel = 2 | 3 | 4;

export interface EmptyStateProps {
  title: string;
  body?: string;
  action?: ReactNode;
  headingLevel?: HeadingLevel; // default 2
}

export interface ErrorStateProps {
  title: string;
  body?: string; // names the problem and the recovery
  retry?: () => void;
  headingLevel?: HeadingLevel; // default 2
}

/* ---------- Forms and notices (batch 2, frozen 1 October 2026) ---------- */

interface FieldBase {
  id: string;
  label: string;
  hint?: string; // helper text below the label
  error?: string; // shown below the field; field gets aria-invalid
  required?: boolean;
  disabled?: boolean;
}

export interface TextFieldProps extends FieldBase {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string; // never a substitute for the label
}

export interface TextAreaFieldProps extends FieldBase {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number; // shows "n / max" counter when set
  rows?: number;
  placeholder?: string;
}

export interface DateFieldProps extends FieldBase {
  value: string; // "" or YYYY-MM-DD
  onChange: (value: string) => void;
}

export interface CheckboxGroupProps {
  id: string;
  legend: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

export interface InlineNoticeProps {
  tone: Tone;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}

export interface PageHeaderProps {
  title: string; // the page h1
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode; // e.g. labels under the title
}
