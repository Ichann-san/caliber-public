"use client";

import { useId } from "react";
import type { SearchFieldProps } from "@/components/view-models";
import styles from "./SearchField.module.css";

export type { SearchFieldProps };

/** Controlled search input with a visible label. */
export function SearchField({ label, value, onChange, placeholder }: SearchFieldProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        type="search"
        className={styles.input}
        value={value}
        placeholder={placeholder ?? `Search ${label.toLowerCase()}`}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
