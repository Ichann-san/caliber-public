"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import controlStyles from "@/components/ui/SelectControl.module.css";
import styles from "./RelatedDivisionPicker.module.css";

interface Option { value: string; label: string }

export function RelatedDivisionPicker({ id, options, values, onChange, hint, error }: {
  id: string;
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
  hint: string;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = options.filter(option => option.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className={styles.field}>
      <span className={styles.label}>Related divisions</span>
      <details className={[styles.dropdown, controlStyles.wrapper].join(" ")}>
        <summary className={controlStyles.trigger} aria-describedby={`${id}-hint`}>{values.length ? `${values.length} selected` : "Select divisions"}</summary>
        <CaretDown className={controlStyles.icon} size={16} weight="bold" aria-hidden="true" />
        <div className={[controlStyles.menu, styles.menu].join(" ")}>
          <label className={styles.searchLabel} htmlFor={`${id}-search`}>Find division</label>
          <input id={`${id}-search`} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search divisions" className={styles.search} />
          <div className={styles.options}>
            {filtered.length ? filtered.map(option => (
              <label key={option.value} className={styles.option}>
                <input type="checkbox" checked={values.includes(option.value)} onChange={event => onChange(event.target.checked ? [...values, option.value] : values.filter(id => id !== option.value))} />
                <span>{option.label}</span>
              </label>
            )) : <p className={styles.empty}>No matching divisions</p>}
          </div>
        </div>
      </details>
      <p id={`${id}-hint`} className={styles.hint}>{hint}</p>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    </div>
  );
}
