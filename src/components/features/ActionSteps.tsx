"use client";

import { useState } from "react";
import type { Action, ActionStatus, ApiError, CaseDetail, UpdateActionRequest } from "@contracts/v1";
import { EvidenceList } from "@/components/case";
import { Button, SelectField, StatusLabel, TextAreaField } from "@/components/ui";
import { isApiError } from "@/lib/client/dataSource";
import { actionAssigneeName, actionStatusView, evidenceRefs } from "@/lib/client/mappers";
import { useDataSource } from "./DataSourceProvider";
import { usePersona } from "./PersonaProvider";
import { ApiErrorNotice, SaveNotice, fieldError } from "./notices";
import layout from "./layout.module.css";
import styles from "./detail.module.css";

type StepKey = "approve" | "start" | "complete" | "verify" | "return";

interface StepDef {
  key: StepKey;
  label: string;
  to: ActionStatus;
  noteField?: "applicabilityReview" | "completionNote" | "verificationNote";
  noteLabel?: string;
  noteHint?: string;
  needsEvidence?: boolean;
}

const STEPS: Record<StepKey, StepDef> = {
  approve: {
    key: "approve",
    label: "Approve action",
    to: "approved",
    noteField: "applicabilityReview",
    noteLabel: "Applicability review",
    noteHint: "Required. Judge whether this action applies to this asset, not only whether a reference exists.",
  },
  start: { key: "start", label: "Start work", to: "in_progress" },
  complete: {
    key: "complete",
    label: "Mark completed",
    to: "completed",
    noteField: "completionNote",
    noteLabel: "Completion note",
    noteHint: "Required. Describe the completed work; this note does not establish new source evidence.",
    needsEvidence: true,
  },
  verify: {
    key: "verify",
    label: "Verify action",
    to: "verified",
    noteField: "verificationNote",
    noteLabel: "Verification note",
    noteHint: "Required. Reviewers judge relevance of the evidence, not merely its presence.",
    needsEvidence: true,
  },
  return: {
    key: "return",
    label: "Return to in progress",
    to: "in_progress",
    noteField: "verificationNote",
    noteLabel: "Review note",
    noteHint: "Required. Explain what must be corrected.",
  },
};

/** Steps the persona may attempt (display hint only; the adapter enforces). */
function availableSteps(detail: CaseDetail, action: Action, personaId: string, isManager: boolean): StepDef[] {
  const p = detail.permissions;
  const assigned = !isManager && detail.people.assignees.some((a) => a.id === personaId);
  const steps: StepDef[] = [];
  if (action.status === "draft" && p.canReviewAction) steps.push(STEPS.approve);
  if (action.status === "approved" && p.canDraftAction && (isManager || assigned)) steps.push(STEPS.start);
  if (action.status === "in_progress" && (isManager || assigned) && (p.canDraftAction || p.canReviewAction))
    steps.push(STEPS.complete);
  if (action.status === "completed" && p.canReviewAction) steps.push(STEPS.verify, STEPS.return);
  return steps;
}

function ActionItem({
  detail,
  action,
  onUpdated,
  onReload,
  onOpenEvidence,
}: {
  detail: CaseDetail;
  action: Action;
  onUpdated: (d: CaseDetail) => void;
  onReload: () => void;
  onOpenEvidence: (id: string) => void;
}) {
  const { source } = useDataSource();
  const { personaId, persona } = usePersona();
  const [step, setStep] = useState<StepKey | null>(null);
  const [note, setNote] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const steps = availableSteps(detail, action, personaId, persona?.role === "management");
  const current = step ? STEPS[step] : null;
  const reference = action.referenceId ? detail.actionReferences.find((r) => r.id === action.referenceId) : null;
  const evidenceOptions = [
    { value: "", label: "Choose an evidence record" },
    ...evidenceRefs(detail, detail.evidence.map((e) => e.id)).map((r) => ({ value: r.id, label: r.label })),
  ];

  async function run(def: StepDef) {
    const body: UpdateActionRequest = { expectedCaseVersion: detail.version, status: def.to };
    if (def.noteField) body[def.noteField] = note;
    if (def.needsEvidence) body.evidenceIds = evidenceId ? [evidenceId] : [];
    setBusy(true);
    setError(null);
    setSaved(null);
    const res = await source.updateAction(personaId, detail.id, action.id, body);
    setBusy(false);
    if (isApiError(res)) {
      setError(res);
      return;
    }
    setSaved(`${def.label}: done`);
    setStep(null);
    setNote("");
    setEvidenceId("");
    onUpdated(res.data);
  }

  return (
    <li className={styles.actionItem}>
      <div className={layout.rowBetween}>
        <p className={styles.actionTitle}>{action.title}</p>
        <div className={layout.row}>
          <StatusLabel status={actionStatusView(action.status)} />
        </div>
      </div>
      <p className={styles.bodyText}>{action.description}</p>
      <dl className={styles.facts}>
        <div>
          <dt>Assignee</dt>
          <dd>{actionAssigneeName(detail, action)}</dd>
        </div>
        <div>
          <dt>Due date</dt>
          <dd>{action.dueDate ?? "No due date"}</dd>
        </div>
        <div>
          <dt>Reference</dt>
          <dd>{reference ? reference.text : action.referenceId ? action.referenceId : "None"}</dd>
        </div>
        {action.applicabilityReview ? (
          <div>
            <dt>Applicability review</dt>
            <dd>{action.applicabilityReview}</dd>
          </div>
        ) : null}
        {action.completionNote ? (
          <div>
            <dt>Completion note</dt>
            <dd>{action.completionNote}</dd>
          </div>
        ) : null}
        {action.verificationNote ? (
          <div>
            <dt>Verification note</dt>
            <dd>{action.verificationNote}</dd>
          </div>
        ) : null}
      </dl>
      {action.evidenceIds.length > 0 ? (
        <EvidenceList items={evidenceRefs(detail, action.evidenceIds)} onOpen={onOpenEvidence} />
      ) : null}

      {saved ? <SaveNotice title={saved} /> : null}
      {error ? <ApiErrorNotice error={error} onReload={onReload} /> : null}

      {steps.length > 0 && !current ? (
        <div className={layout.actions}>
          {steps.map((s) => (
            <Button key={s.key} size="sm" variant={s.key === "return" ? "secondary" : "primary"} onClick={() => (s.noteField || s.needsEvidence ? setStep(s.key) : void run(s))} loading={busy && !s.noteField}>
              {s.label}
            </Button>
          ))}
        </div>
      ) : null}

      {current ? (
        <form
          className={layout.form}
          onSubmit={(e) => {
            e.preventDefault();
            void run(current);
          }}
        >
          {current.noteField ? (
            <TextAreaField
              id={`action-${action.id}-${current.key}`}
              label={current.noteLabel ?? "Note"}
              hint={current.noteHint}
              value={note}
              onChange={setNote}
              maxLength={4000}
              rows={3}
              required
              error={fieldError(error, current.noteField)}
            />
          ) : null}
          {current.needsEvidence ? (
            detail.evidence.length > 0 ? (
              <SelectField label="Supporting evidence (required)" value={evidenceId} options={evidenceOptions} onChange={setEvidenceId} />
            ) : (
              <p className={layout.secondaryText}>
                This case has no evidence records, and v1 has no uploads, so this step cannot be completed.
              </p>
            )
          ) : null}
          <div className={layout.actions}>
            <Button type="submit" variant="primary" size="sm" loading={busy} loadingText="Saving">
              {current.label}
            </Button>
            <Button size="sm" variant="quiet" onClick={() => setStep(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </li>
  );
}

interface Props {
  detail: CaseDetail;
  onUpdated: (d: CaseDetail) => void;
  onReload: () => void;
  onOpenEvidence: (id: string) => void;
}

/** Demo actions with their status and the steps the active persona may attempt. */
export function ActionSteps({ detail, onUpdated, onReload, onOpenEvidence }: Props) {
  if (detail.actions.length === 0) {
    return <p className={layout.secondaryText}>No actions drafted yet.</p>;
  }
  return (
    <ul className={layout.list}>
      {detail.actions.map((a) => (
        <ActionItem key={a.id} detail={detail} action={a} onUpdated={onUpdated} onReload={onReload} onOpenEvidence={onOpenEvidence} />
      ))}
    </ul>
  );
}
