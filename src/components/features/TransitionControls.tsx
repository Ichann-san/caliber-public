"use client";

import { useState } from "react";
import type { ApiError, CaseDetail, CaseStatus, User } from "@contracts/v1";
import { Button, SelectField, TextAreaField } from "@/components/ui";
import { isApiError } from "@/lib/client/dataSource";
import { statusView } from "@/lib/client/mappers";
import { useDataSource } from "./DataSourceProvider";
import { usePersona } from "./PersonaProvider";
import { ApiErrorNotice, SaveNotice, fieldError } from "./notices";
import styles from "./layout.module.css";

export function transitionVerb(from: CaseStatus, to: CaseStatus): string {
  if (to === "submitted") return from === "needs_revision" ? "Resubmit for review" : "Submit for review";
  if (to === "needs_revision") return "Return for revision";
  if (to === "investigating") return "Accept for investigation";
  if (to === "action_in_progress") return from === "awaiting_verification" ? "Return to action in progress" : "Start action phase";
  if (to === "awaiting_verification") return "Request verification";
  if (to === "closed") return "Close case";
  return `Move to ${statusView(to).label}`;
}

function noteLabel(from: CaseStatus, to: CaseStatus): { label: string; hint: string } {
  if (to === "closed") return { label: "Manager review note", hint: "Required to close. Summarise the verification you reviewed." };
  if (from === "awaiting_verification" && to === "action_in_progress")
    return { label: "Correction note", hint: "Required. Explain what must be corrected." };
  return { label: "Note", hint: "Required. Recorded in the case activity." };
}

/** Why no step is offered, from known preconditions. Information only; the adapter decides. */
function blockedHints(detail: CaseDetail, user: User | null): string[] {
  const hints: string[] = [];
  if (!user) return hints;
  const s = detail.status;
  if (s === "closed") hints.push("Closed cases cannot be reopened.");
  if (user.role === "management") {
    if (s === "submitted" && detail.people.assignees.length === 0)
      hints.push("Accepting for investigation needs at least one assigned engineer. Assign one in People.");
    if (s === "awaiting_verification" && detail.conflicts.length > 0)
      hints.push("This case has an unresolved source conflict, so it cannot close in v1.");
    if (s === "awaiting_verification" && detail.actions.some((a) => a.status !== "verified"))
      hints.push("Closing needs every action verified.");
  }
  if (s === "investigating" && !detail.actions.some((a) => a.status === "approved" || a.status === "in_progress"))
    hints.push("Starting the action phase needs at least one approved action.");
  if (s === "action_in_progress" && !(detail.actions.length > 0 && detail.actions.every((a) => a.status === "completed" || a.status === "verified")))
    hints.push("Requesting verification needs every action completed or verified.");
  return hints;
}

interface Props {
  detail: CaseDetail;
  onUpdated: (detail: CaseDetail) => void;
  onReload: () => void;
}

/** Workflow step controls driven by permissions.allowedTransitions; a note is always required. */
export function TransitionControls({ detail, onUpdated, onReload }: Props) {
  const { source } = useDataSource();
  const { personaId, persona } = usePersona();
  const allowed = detail.permissions.allowedTransitions;
  const [to, setTo] = useState<CaseStatus | "">(allowed[0] ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const target = to && allowed.includes(to) ? to : (allowed[0] ?? "");
  const hints = blockedHints(detail, persona);

  async function submit() {
    if (!target) return;
    setBusy(true);
    setError(null);
    setSaved(null);
    const res = await source.transitionCase(personaId, detail.id, { expectedVersion: detail.version, to: target, note });
    setBusy(false);
    if (isApiError(res)) {
      setError(res);
      return;
    }
    setNote("");
    setSaved(`Status changed to ${statusView(target).label}`);
    setTo("");
    onUpdated(res.data);
  }

  const labels = target ? noteLabel(detail.status, target) : null;

  return (
    <div className={styles.stackTight}>
      {saved ? <SaveNotice title={saved} /> : null}
      {error ? <ApiErrorNotice error={error} onReload={onReload} /> : null}
      {allowed.length === 0 ? (
        <>
          <p className={styles.secondaryText}>No workflow step is available to your persona at this stage.</p>
          {hints.length > 0 ? (
            <ul className={styles.plainList}>
              {hints.map((h) => (
                <li key={h} className={styles.secondaryText}>
                  {h}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {allowed.length > 1 ? (
            <SelectField
              label="Next step"
              value={target}
              options={allowed.map((s) => ({ value: s, label: transitionVerb(detail.status, s) }))}
              onChange={(v) => setTo(v as CaseStatus)}
            />
          ) : null}
          {labels ? (
            <TextAreaField
              id={`transition-note-${detail.id}`}
              label={labels.label}
              hint={labels.hint}
              value={note}
              onChange={setNote}
              maxLength={4000}
              rows={3}
              required
              error={fieldError(error, "note")}
            />
          ) : null}
          <div className={styles.actions}>
            <Button type="submit" variant="primary" loading={busy} loadingText="Saving" disabled={!note.trim()}>
              {target ? transitionVerb(detail.status, target) : "Move"}
            </Button>
          </div>
          {hints.length > 0 ? (
            <ul className={styles.plainList}>
              {hints.map((h) => (
                <li key={h} className={styles.secondaryText}>
                  {h}
                </li>
              ))}
            </ul>
          ) : null}
        </form>
      )}
    </div>
  );
}
