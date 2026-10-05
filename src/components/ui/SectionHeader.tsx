import type { ReactNode } from "react";
import styles from "./SectionHeader.module.css";

export interface SectionHeaderProps {
  title: string;
  /** Heading id, for aria-labelledby on the enclosing section. */
  id?: string;
  /** Optional one-line description under the heading. */
  description?: string;
  /** Optional actions slot (buttons, links). */
  actions?: ReactNode;
  className?: string;
}

/** Section heading (h2) with an optional actions slot. No eyebrow, no numbering. */
export function SectionHeader({ title, id, description, actions, className }: SectionHeaderProps) {
  return (
    <header className={[styles.header, className].filter(Boolean).join(" ")}>
      <div className={styles.text}>
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
