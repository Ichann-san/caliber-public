"use client";

import { useState } from "react";
import type { ApiError, CaseDetail } from "@contracts/v1";
import { Button, TextAreaField } from "@/components/ui";
import { isApiError } from "@/lib/client/dataSource";
import { useDataSource } from "./DataSourceProvider";
import { usePersona } from "./PersonaProvider";
import { ApiErrorNotice, SaveNotice, fieldError } from "./notices";
import styles from "./layout.module.css";

interface Props {
  detail: CaseDetail;
  onUpdated: (detail: CaseDetail) => void;
}

/** Adds an operational note (assigned engineer or manager, live case). */
export function NoteForm({ detail, onUpdated }: Props) {
  const { source } = useDataSource();
  const { personaId } = usePersona();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await source.addNote(personaId, detail.id, { text });
    setBusy(false);
    if (isApiError(res)) {
      setError(res);
      return;
    }
    setText("");
    setSaved(true);
    onUpdated(res.data);
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {saved ? <SaveNotice title="Note added" /> : null}
      {error ? <ApiErrorNotice error={error} /> : null}
      <TextAreaField
        id={`note-${detail.id}`}
        label="Add a note"
        hint="A note is an assertion by the author, not new source evidence."
        value={text}
        onChange={setText}
        maxLength={4000}
        rows={3}
        required
        error={fieldError(error, "text")}
      />
      <div className={styles.actions}>
        <Button type="submit" variant="primary" loading={busy} loadingText="Saving" disabled={!text.trim()}>
          Add note
        </Button>
      </div>
    </form>
  );
}
