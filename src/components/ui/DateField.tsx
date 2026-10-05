"use client";

import { WarningCircle } from "@phosphor-icons/react";
import type { DateFieldProps } from "@/components/view-models";
import styles from "./DateField.module.css";

export type { DateFieldProps };

/** Controlled native date input. Value is "" or YYYY-MM-DD. */
export function DateField({
  id,
  label,
  hint,
  error,
  required = false,
  disabled = false,
  value,
  onChange,
}: DateFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required ? <span className={styles.required}> (required)</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        type="date"
        className={[styles.control, error ? styles.invalid : undefined].filter(Boolean).join(" ")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {error ? (
        <p id={errorId} className={styles.error}>
          <WarningCircle className={styles.errorIcon} size={16} weight="regular" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
