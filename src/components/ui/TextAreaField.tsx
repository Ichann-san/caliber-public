"use client";

import { WarningCircle } from "@phosphor-icons/react";
import type { TextAreaFieldProps } from "@/components/view-models";
import styles from "./TextAreaField.module.css";

export type { TextAreaFieldProps };

/** Controlled multi-line text input with an "n / max" counter when maxLength is set. */
export function TextAreaField({
  id,
  label,
  hint,
  error,
  required = false,
  disabled = false,
  value,
  onChange,
  maxLength,
  rows = 4,
  placeholder,
}: TextAreaFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const counterId = typeof maxLength === "number" ? `${id}-counter` : undefined;
  const describedBy = [hintId, errorId, counterId].filter(Boolean).join(" ") || undefined;
  const nearLimit = typeof maxLength === "number" && value.length >= maxLength;

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
      <textarea
        id={id}
        className={[styles.control, error ? styles.invalid : undefined].filter(Boolean).join(" ")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        rows={rows}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {error || counterId ? (
        <div className={styles.footer}>
          {error ? (
            <p id={errorId} className={styles.error}>
              <WarningCircle className={styles.errorIcon} size={16} weight="regular" aria-hidden="true" />
              <span>{error}</span>
            </p>
          ) : null}
          {counterId ? (
            <p
              id={counterId}
              className={[styles.counter, nearLimit ? styles.counterLimit : undefined].filter(Boolean).join(" ")}
            >
              {value.length} / {maxLength}
              <span className="sr-only"> characters</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
