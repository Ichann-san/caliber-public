"use client";

import { useState } from "react";
import Link from "next/link";
import type { ApiError, CaseDetail, CreateCaseRequest } from "@contracts/v1";
import {
  Button,
  DateField,
  EmptyState,
  InlineNotice,
  PageHeader,
  SectionHeader,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui";
import { isApiError } from "@/lib/client/dataSource";
import { caseHref, divisionName } from "@/lib/client/mappers";
import { useDataSource } from "./DataSourceProvider";
import { usePersona } from "./PersonaProvider";
import { ApiErrorNotice, SaveNotice, fieldError } from "./notices";
import { PageSkeleton } from "./skeletons";
import { TransitionControls } from "./TransitionControls";
import styles from "./layout.module.css";
import { RelatedDivisionPicker } from "./RelatedDivisionPicker";

interface FormValues {
  title: string;
  description: string;
  occurredAt: string;
  tag: string;
  component: string;
  mechanism: string;
  plant: string;
  relatedDivisionIds: string[];
}

const EMPTY: FormValues = {
  title: "",
  description: "",
  occurredAt: "",
  tag: "",
  component: "",
  mechanism: "",
  plant: "",
  relatedDivisionIds: [],
};

function fromDetail(d: CaseDetail): FormValues {
  return {
    title: d.title,
    description: d.description,
    occurredAt: d.occurredAt.precision === "date" && d.occurredAt.value ? d.occurredAt.value : "",
    tag: d.tag ?? "",
    component: d.component ?? "",
    mechanism: d.mechanism ?? "",
    plant: d.plant ?? "",
    relatedDivisionIds: d.divisionIds.filter((id) => id !== d.people.proposingDivisionId),
  };
}

function toRequest(v: FormValues): CreateCaseRequest {
  const opt = (s: string) => (s.trim() === "" ? null : s);
  return {
    title: v.title,
    description: v.description,
    occurredAt: opt(v.occurredAt),
    tag: opt(v.tag),
    component: opt(v.component),
    mechanism: opt(v.mechanism),
    plant: opt(v.plant),
    relatedDivisionIds: v.relatedDivisionIds,
  };
}

interface FieldsProps {
  values: FormValues;
  onChange: (v: FormValues) => void;
  error: ApiError | null;
  proposingDivisionId: string | null;
  idPrefix: string;
}

function CaseFields({ values, onChange, error, proposingDivisionId, idPrefix }: FieldsProps) {
  const { referenceData, ctx } = usePersona();
  const set = <K extends keyof FormValues>(key: K) => (v: FormValues[K]) => onChange({ ...values, [key]: v });
  const mechanisms = [{ value: "", label: "Not specified" }, ...(referenceData?.mechanisms ?? []).map((m) => ({ value: m, label: m }))];
  const plants = [{ value: "", label: "Not specified" }, ...(referenceData?.plants ?? []).map((p) => ({ value: p, label: p }))];
  const divisions = (referenceData?.divisions ?? [])
    .filter((d) => d.id !== proposingDivisionId)
    .map((d) => ({ value: d.id, label: d.name }));

  return (
    <>
      <TextField
        id={`${idPrefix}-title`}
        label="Title"
        placeholder="e.g. KO-3201 bearing vibration trip"
        hint="Short description of the problem, e.g. tag, component and symptom."
        value={values.title}
        onChange={set("title")}
        maxLength={160}
        required
        error={fieldError(error, "title")}
      />
      <TextAreaField
        id={`${idPrefix}-description`}
        label="Description"
        placeholder="Describe the observed symptoms, when they began, and the affected operation"
        hint="What happened, what you observed and what is affected."
        value={values.description}
        onChange={set("description")}
        maxLength={4000}
        rows={5}
        required
        error={fieldError(error, "description")}
      />
      <div className={styles.formGrid}>
        <DateField
          id={`${idPrefix}-occurred`}
          label="Occurred date"
          hint="Leave empty if unknown. No date is assumed."
          value={values.occurredAt}
          onChange={set("occurredAt")}
          error={fieldError(error, "occurredAt")}
        />
        <TextField
          id={`${idPrefix}-tag`}
          label="Equipment tag"
          placeholder="e.g. KO-3201"
          hint="As written on the asset. Equipment type is not guessed from it."
          value={values.tag}
          onChange={set("tag")}
          maxLength={120}
          error={fieldError(error, "tag")}
        />
        <TextField
          id={`${idPrefix}-component`}
          label="Component"
          hint="Affected equipment part, as written in the maintenance record."
          placeholder="e.g. Drive-end bearing"
          value={values.component}
          onChange={set("component")}
          maxLength={120}
          error={fieldError(error, "component")}
        />
        <SelectField label="Problem type" value={values.mechanism} options={mechanisms} onChange={set("mechanism")} />
        <SelectField label="Plant" value={values.plant} options={plants} onChange={set("plant")} />
        <RelatedDivisionPicker
          id={`${idPrefix}-divisions`}
          options={divisions}
          values={values.relatedDivisionIds}
          onChange={set("relatedDivisionIds")}
          hint={`Your division${proposingDivisionId ? ` (${divisionName(ctx, proposingDivisionId)})` : ""} is always included.`}
          error={fieldError(error, "relatedDivisionIds")}
        />
      </div>
    </>
  );
}

/** /cases/new: engineers create a draft, then submit it for review as a separate step. */
export function CreateCaseForm() {
  const { source } = useDataSource();
  const { personaId, persona, personasError } = usePersona();
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [created, setCreated] = useState<CaseDetail | null>(null);

  const header = (
    <PageHeader
      title="New case request"
      description="Report a problem for review. New requests start as drafts and have no AI analysis."
    />
  );

  if (!persona && !personasError) return <PageSkeleton label="Loading persona" />;

  if (persona && persona.role !== "engineer") {
    return (
      <div className={styles.stack}>
        {header}
        {persona.role === "unassigned" ? (
          <EmptyState
            title="No assignment yet"
            body="This role cannot create case requests. Select an engineer role."
          />
        ) : (
          <InlineNotice
            tone="info"
            title="Only engineers create case requests"
            body="Managers review, assign and approve. Select an engineer role to create a request."
          />
        )}
      </div>
    );
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await source.createCase(personaId, toRequest(values));
    setBusy(false);
    if (isApiError(res)) {
      setError(res);
      return;
    }
    setCreated(res.data);
    setValues(EMPTY);
  }

  if (created) {
    return (
      <div className={styles.stack}>
        {header}
        <SaveNotice title={`Draft created: ${created.title}`} />
        <section className={styles.panel} aria-labelledby="submit-step">
          <SectionHeader id="submit-step" title="Step 2: Submit for review" />
          <p className={styles.secondaryText}>
            The draft is visible only to you until you submit it. Submission is a separate step and needs a note.
            Analysis not available for this request.
          </p>
          <TransitionControls detail={created} onUpdated={setCreated} onReload={() => undefined} />
        </section>
        <div className={styles.actions}>
          <Button as="a" href={caseHref(created.id)} variant="secondary">
            Open case
          </Button>
          <Button variant="quiet" onClick={() => setCreated(null)}>
            Create another request
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      {header}
      {personasError ? <ApiErrorNotice error={personasError} /> : null}
      <form
        className={styles.form}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {error ? <ApiErrorNotice error={error} /> : null}
        <CaseFields
          values={values}
          onChange={setValues}
          error={error}
          proposingDivisionId={persona?.divisionId ?? null}
          idPrefix="new-case"
        />
        <InlineNotice
          tone="info"
          title="Who is involved"
          body="You are the proposer. The accountable owner is your division head. Managers assign engineers after you submit."
        />
        <div className={styles.actions}>
          <Button type="submit" variant="primary" loading={busy} loadingText="Creating draft">
            Create draft
          </Button>
          <Link href="/cases">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

/** Proposer edits a draft or needs-revision case (PATCH with expected version). */
export function EditDraftForm({
  detail,
  onUpdated,
  onReload,
  onDone,
}: {
  detail: CaseDetail;
  onUpdated: (d: CaseDetail) => void;
  onReload: () => void;
  onDone: () => void;
}) {
  const { source } = useDataSource();
  const { personaId } = usePersona();
  const [values, setValues] = useState<FormValues>(() => fromDetail(detail));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await source.updateCase(personaId, detail.id, { expectedVersion: detail.version, ...toRequest(values) });
    setBusy(false);
    if (isApiError(res)) {
      setError(res);
      return;
    }
    onUpdated(res.data);
    onDone();
  }

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {error ? <ApiErrorNotice error={error} onReload={onReload} /> : null}
      <CaseFields
        values={values}
        onChange={setValues}
        error={error}
        proposingDivisionId={detail.people.proposingDivisionId}
        idPrefix={`edit-${detail.id}`}
      />
      <div className={styles.actions}>
        <Button type="submit" variant="primary" loading={busy} loadingText="Saving">
          Save draft
        </Button>
        <Button variant="quiet" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
