"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { SearchField, SelectField } from "@/components/ui";
import type { ReferenceData } from "@contracts/v1";
import { EMPTY_FILTERS, ML_OPTIONS, REVIEW_OPTIONS, STATUS_OPTIONS, SORT_OPTIONS, referenceOptions, type FilterState, type SortValue } from "./boardFilters";
import styles from "./CaseFilterBar.module.css";

interface Props {
  value: FilterState;
  onChange: (next: FilterState) => void;
  referenceData: ReferenceData | null;
  showSearch?: boolean;
  sort?: SortValue;
  onSortChange?: (value: SortValue) => void;
}

/** One shared three-control layout; selected filters persist across categories. */
export function CaseFilterBar({ value, onChange, referenceData, showSearch = true, sort, onSortChange }: Props) {
  const [selected, setSelected] = useState("status");
  const opts = referenceOptions(referenceData);
  const groups = [
    { key: "status", label: "Status", options: STATUS_OPTIONS },
    { key: "divisionId", label: "Division", options: opts.divisions },
    { key: "mechanism", label: "Problem type", options: opts.mechanisms },
    { key: "plant", label: "Plant", options: opts.plants },
    { key: "mlState", label: "ML insight", options: ML_OPTIONS },
    { key: "priorityReview", label: "Priority review", options: REVIEW_OPTIONS },
    ...(onSortChange ? [{ key: "sort", label: "Sort by", options: SORT_OPTIONS }] : []),
  ];
  const current = groups.find(g => g.key === selected) ?? groups[0];
  const active = groups.filter(g => g.key !== "sort" && value[g.key as keyof FilterState] !== EMPTY_FILTERS[g.key as keyof FilterState]);
  const setValue = (next: string) => {
    if (current.key === "sort") onSortChange?.(next as SortValue);
    else onChange({ ...value, [current.key]: next });
  };
  return (
    <section className={styles.root} aria-label="Search and filters">
      <div className={styles.controls}>
        {showSearch && <div className={styles.search}>
          <SearchField label="Search cases" value={value.search} onChange={search => onChange({ ...value, search })} placeholder="Title, tag, component or plant" />
        </div>}
        <div className={styles.filter}>
          <div className={styles.filterHeading}><SelectField label={onSortChange ? "Filter or sort by" : "Filter by"} value={current.key} options={groups.map(g => ({ value: g.key, label: g.label }))} onChange={setSelected} /><span className={styles.valueHeading}>Value</span></div>
          <SelectField label={current.key === "sort" ? "Order" : `${current.label} value`} value={current.key === "sort" ? sort ?? "priority" : value[current.key as keyof FilterState]} options={current.options} onChange={setValue} />
        </div>
      </div>
      {(active.length > 0 || (sort && sort !== "priority")) && <div className={styles.applied} aria-label="Applied filters">
        {active.map(g => <button type="button" className={styles.chip} key={g.key} onClick={() => onChange({ ...value, [g.key]: EMPTY_FILTERS[g.key as keyof FilterState] })} aria-label={`Remove ${g.label} filter`}>
          {g.label}: {g.options.find(o => o.value === value[g.key as keyof FilterState])?.label ?? value[g.key as keyof FilterState]} <X size={14} aria-hidden="true" />
        </button>)}
        {sort && sort !== "priority" && <button type="button" className={styles.chip} onClick={() => onSortChange?.("priority")} aria-label="Reset sort to priority">Sort: {SORT_OPTIONS.find(o => o.value === sort)?.label} <X size={14} aria-hidden="true" /></button>}
      </div>}
    </section>
  );
}
