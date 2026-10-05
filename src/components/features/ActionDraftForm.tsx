"use client";

import { useMemo, useState } from "react";
import type { ApiError, CaseDetail } from "@contracts/v1";
import { Button, DateField, SelectField, TextAreaField, TextField } from "@/components/ui";
import { isApiError } from "@/lib/client/dataSource";
import { displayPersonName } from "@/lib/client/mappers";
import { offerableReferences } from "@/lib/client/suppression";
import { useDataSource } from "./DataSourceProvider";
import { usePersona } from "./PersonaProvider";
import { ApiErrorNotice, SaveNotice, fieldError } from "./notices";
import styles from "./layout.module.css";

interface Props {
  detail: CaseDetail;
  onUpdated: (detail: CaseDetail) => void;
}

function short(text: string, max = 90) {
  return text.length > max ? `${text.slice(0, max - 3).trimEnd()}...` : text;
}

/**
 * Drafts a demo action. The reference picker only offers references that
 * pass the HR-PU-2101B-002 guard; drafting never authorises execution.
 */
export function ActionDraftForm({ detail, onUpdated }: Props) {
  const { source } = useDataSource();
  const { personaId } = usePersona();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);

  const refs = useMemo(() => offerableReferences(detail), [detail]);
  const refOptions = [
    { value: "", label: "No reference (new action)" },
    ...refs.map((r) => ({ value: r.id, label: short(r.text) })),
  ];
  const assigneeOptions = [
    { value: "", label: "Not assigned" },
    ...detail.people.assignees
      .filter((a) => a.role === "engineer")
      .map((a) => ({ value: a.id, label: `${displayPersonName(a.displayName)}, ${a.jobTitle}` })),
  ];

  async function submit() {
    const ref = refs.find((r) => r.id === referenceId) ?? null;
    const evidenceSet = new Set(detail.evidence.map((e) => e.id));
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await source.createAction(personaId, detail.id, {
      title,
      description,
      referenceId: ref ? ref.id : null,
      evidenceIds: ref ? ref.evidenceIds.filter((id) => evidenceSet.has(id)) : [],
      assigneeId: assigneeId || null,
      dueDate: dueDate || null,
    });
    setBusy(false);
    if (isApiError(res)) {
      setError(res);
      return;
    }
    setTitle("");
    setDescription("");
    setReferenceId("");
    setAssigneeId("");
    setDueDate("");
    setSaved(true);
    onUpdated(res.data);
  }

  return (
    <form
      className={styles.formWide}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {saved ? <SaveNotice title="Action drafted. It needs manager approval before work starts." /> : null}
      {error ? <ApiErrorNotice error={error} /> : null}
      <div className={styles.formGrid}>
        <TextField
          id={`action-title-${detail.id}`}
          label="Action title"
          value={title}
          onChange={setTitle}
          maxLength={160}
          required
          error={fieldError(error, "title")}
        />
        <SelectField label="Based on reference" value={referenceId} options={refOptions} onChange={setReferenceId} />
      </div>
      <TextAreaField
        id={`action-description-${detail.id}`}
        label="Description"
        hint="What should be done and why. A reference still needs an applicability review."
        value={description}
        onChange={setDescription}
        maxLength={4000}
        rows={3}
        required
        error={fieldError(error, "description")}
      />
      <div className={styles.formGrid}>
        <SelectField label="Action assignee" value={assigneeId} options={assigneeOptions} onChange={setAssigneeId} />
        <DateField
          id={`action-due-${detail.id}`}
          label="Due date"
          hint="Set the target date for this action."
          value={dueDate}
          onChange={setDueDate}
          error={fieldError(error, "dueDate")}
        />
      </div>
      <div className={styles.actions}>
        <Button type="submit" variant="primary" loading={busy} loadingText="Saving" disabled={!title.trim() || !description.trim()}>
          Draft action
        </Button>
      </div>
    </form>
  );
}
