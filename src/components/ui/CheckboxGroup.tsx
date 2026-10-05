"use client";

import { WarningCircle } from "@phosphor-icons/react";
import type { CheckboxGroupProps } from "@/components/view-models";
import styles from "./CheckboxGroup.module.css";

export type { CheckboxGroupProps };

/** Controlled group of checkboxes in a fieldset with a visible legend. */
export function CheckboxGroup({
  id,
  legend,
  hint,
  error,
  options,
  values,
  onChange,
  disabled = false,
}: CheckboxGroupProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const selected = new Set(values);

  function toggle(value: string, checked: boolean) {
    if (checked) {
      onChange(options.map((o) => o.value).filter((v) => v === value || selected.has(v)));
    } else {
      onChange(values.filter((v) => v !== value));
    }
  }

  return (
    <fieldset id={id} className={styles.fieldset} disabled={disabled} aria-describedby={describedBy}>
      <legend className={styles.legend}>{legend}</legend>
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      <ul className={styles.options}>
        {options.map((option, index) => {
          const optionId = `${id}-option-${index}`;
          return (
            <li key={option.value} className={styles.option}>
              <input
                id={optionId}
                type="checkbox"
                className={styles.checkbox}
                checked={selected.has(option.value)}
                onChange={(event) => toggle(option.value, event.target.checked)}
                aria-invalid={error ? true : undefined}
              />
              <label htmlFor={optionId} className={styles.optionLabel}>
                {option.label}
              </label>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p id={errorId} className={styles.error}>
          <WarningCircle className={styles.errorIcon} size={16} weight="regular" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </fieldset>
  );
}
