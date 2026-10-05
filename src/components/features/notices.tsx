"use client";

import { useState } from "react";
import type { ApiError, ErrorCode } from "@contracts/v1";
import { Button, InlineNotice } from "@/components/ui";
import { useDataSource } from "./DataSourceProvider";
import { usePersona } from "./PersonaProvider";
import styles from "./notices.module.css";

const ERROR_TITLE: Record<ErrorCode, string> = {
  VALIDATION_ERROR: "Check the highlighted fields",
  PERSONA_REQUIRED: "Select a role",
  FORBIDDEN: "Not permitted for this persona",
  NOT_FOUND: "Not found or not visible",
  INVALID_TRANSITION: "This step is not allowed now",
  VERSION_CONFLICT: "The case changed since you loaded it",
  REFERENCE_SUPPRESSED: "Reference withheld by a safety rule",
  SERVICE_UNAVAILABLE: "Service unavailable",
  INTERNAL_ERROR: "Unexpected error",
};

export function errorTitle(error: ApiError): string {
  return ERROR_TITLE[error.error.code] ?? "Request failed";
}

/** Error body text for ErrorState: message plus the contract code. */
export function errorBody(error: ApiError): string {
  return error.error.message;
}

const FIELD_LABEL: Record<string, string> = {
  title: "Title",
  description: "Description",
  occurredAt: "Occurred date",
  tag: "Tag",
  component: "Component",
  mechanism: "Problem type",
  plant: "Plant",
  relatedDivisionIds: "Related divisions",
  note: "Note",
  text: "Note",
  assigneeIds: "Assignees",
  assigneeId: "Assignee",
  priority: "Priority",
  dueDate: "Due date",
  evidenceIds: "Evidence",
  referenceId: "Reference",
  applicabilityReview: "Applicability review",
  completionNote: "Completion note",
  verificationNote: "Note",
};

/** Renders any adapter error clearly, including VALIDATION_ERROR field errors. */
export function ApiErrorNotice({ error, onReload }: { error: ApiError; onReload?: () => void }) {
  const fields = error.error.fieldErrors ? Object.entries(error.error.fieldErrors) : [];
  return (
    <InlineNotice
      tone="attention"
      title={errorTitle(error)}
      body={
        <>
          <p>
            {error.error.message}
          </p>
          {fields.length > 0 ? (
            <ul className={styles.fieldList}>
              {fields.map(([field, messages]) => (
                <li key={field}>
                  {FIELD_LABEL[field] ?? field}: {messages.join(" ")}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      }
      action={
        error.error.code === "VERSION_CONFLICT" && onReload ? (
          <Button size="sm" onClick={onReload}>
            Reload case
          </Button>
        ) : undefined
      }
    />
  );
}

/** Success notice after a mutation; in mock mode it states nothing reached a server. */
export function SaveNotice({ title }: { title: string }) {
  const { saveNotice } = useDataSource();
  return <InlineNotice tone="success" title={title} body={saveNotice} />;
}

/** First field error for a form field. */
export function fieldError(error: ApiError | null, field: string): string | undefined {
  return error?.error.fieldErrors?.[field]?.[0];
}

/** Mock only: restores the fixture. Rendered nowhere in api mode. */
export function ResetMockButton() {
  const { resetMock } = usePersona();
  const [busy, setBusy] = useState(false);
  if (!resetMock) return null;
  return (
    <Button
      variant="quiet"
      size="sm"
      loading={busy}
      loadingText="Resetting mock data"
      onClick={async () => {
        setBusy(true);
        await resetMock();
      }}
    >
      Reset mock data
    </Button>
  );
}
