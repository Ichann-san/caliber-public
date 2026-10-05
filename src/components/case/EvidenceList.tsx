"use client";

import type { EvidenceRefView } from "@/components/view-models";
import styles from "./EvidenceList.module.css";

export interface EvidenceListProps {
  items: EvidenceRefView[];
  /**
   * Opens the evidence drawer for a record id. When omitted the references
   * render as plain text (used by lists that are shown without a drawer).
   */
  onOpen?: (id: string) => void;
  /** Visible label before the list. Defaults to "Evidence". Pass "" to hide. */
  label?: string;
}

/** Evidence references. Each one is a button that opens the evidence drawer. */
export function EvidenceList({ items, onOpen, label = "Evidence" }: EvidenceListProps) {
  if (items.length === 0) return null;

  return (
    <div className={styles.evidence}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            {onOpen ? (
              <button
                type="button"
                className={styles.button}
                onClick={() => onOpen(item.id)}
                aria-haspopup="dialog"
              >
                {item.label}
              </button>
            ) : (
              <span className={styles.text}>{item.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
