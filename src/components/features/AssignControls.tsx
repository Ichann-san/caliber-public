"use client";

import { useMemo, useState } from "react";
import type { ApiError, CaseDetail, Priority, UpdateCaseRequest } from "@contracts/v1";
import { Button, CheckboxGroup, SelectField } from "@/components/ui";
import { isApiError } from "@/lib/client/dataSource";
import { displayPersonName, divisionName } from "@/lib/client/mappers";
import { useDataSource } from "./DataSourceProvider";
import { usePersona } from "./PersonaProvider";
import { ApiErrorNotice, SaveNotice, fieldError } from "./notices";
import styles from "./layout.module.css";

interface Props {
  detail: CaseDetail;
  onUpdated: (detail: CaseDetail) => void;
  onReload: () => void;
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Manager controls: assign engineers from involved divisions and set reviewed priority. */
export function AssignControls({ detail, onUpdated, onReload }: Props) {
  const { source } = useDataSource();
  const { personaId, referenceData, ctx } = usePersona();
  const current = detail.people.assignees.map((a) => a.id);
  const [assignees, setAssignees] = useState<string[]>(current);
  const [priority, setPriority] = useState<string>(detail.priorityReview === "reviewed" && detail.priority ? detail.priority : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);

  const options = useMemo(
    () =>
      (referenceData?.users ?? [])
        .filter((u) => u.role === "engineer" && u.divisionId && detail.divisionIds.includes(u.divisionId))
        .map((u) => ({ value: u.id, label: `${displayPersonName(u.displayName)}, ${u.jobTitle} (${divisionName(ctx, u.divisionId)})` })),
    [referenceData, detail.divisionIds, ctx],
  );

  const priorityOptions = [
    ...(detail.priorityReview === "reviewed" ? [] : [{ value: "", label: "Not yet reviewed" }]),
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ];

  const assigneesChanged = !sameSet(assignees, current);
  const priorityChanged = priority !== "" && priority !== (detail.priority ?? "");
  const dirty = assigneesChanged || priorityChanged;

  async function save() {
    const body: UpdateCaseRequest = { expectedVersion: detail.version };
    if (assigneesChanged) body.assigneeIds = assignees;
    if (priorityChanged) body.priority = priority as Priority;
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await source.updateCase(personaId, detail.id, body);
    setBusy(false);
    if (isApiError(res)) {
      setError(res);
      return;
    }
    setSaved(true);
    onUpdated(res.data);
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {saved ? <SaveNotice title="Assignment and priority saved" /> : null}
      {error ? <ApiErrorNotice error={error} onReload={onReload} /> : null}
      {options.length === 0 ? (
        <p className={styles.secondaryText}>Loading the engineer directory.</p>
      ) : (
        <CheckboxGroup
          id={`assignees-${detail.id}`}
          legend="Assigned engineers"
          hint="Choose engineers from the divisions involved in this case."
          options={options}
          values={assignees}
          onChange={setAssignees}
          error={fieldError(error, "assigneeIds")}
        />
      )}
      <SelectField label="Reviewed priority" value={priority} options={priorityOptions} onChange={setPriority} />
      <div className={styles.actions}>
        <Button type="submit" variant="primary" loading={busy} loadingText="Saving" disabled={!dirty}>
          Save assignment
        </Button>
      </div>
    </form>
  );
}
