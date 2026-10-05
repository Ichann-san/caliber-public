"use client";

import { useId } from "react";
import type { SelectFieldProps } from "@/components/view-models";
import { SelectControl } from "./SelectControl";
import styles from "./SelectField.module.css";

export type { SelectFieldProps };

/** Controlled native select with a visible label. */
export function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <SelectControl
        id={id}
        value={value}
        options={options}
        onChange={onChange}
      />
    </div>
  );
}
