import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

export type SkeletonVariant = "line" | "block" | "card";

export interface SkeletonProps {
  /** "line": text line(s); "block": a panel area; "card": matches CaseCard layout. */
  variant?: SkeletonVariant;
  /** Number of lines for the "line" variant. Defaults to 1. */
  lines?: number;
  /** CSS width for "line" and "block". */
  width?: string;
  /** CSS height for "block". Defaults to 8rem. */
  height?: string;
  className?: string;
}

/**
 * Shape-matching loading placeholder. Decorative (aria-hidden); the caller
 * marks the loading region with aria-busy and a text status.
 */
export function Skeleton({ variant = "line", lines = 1, width, height, className }: SkeletonProps) {
  if (variant === "card") {
    return (
      <div className={[styles.card, className].filter(Boolean).join(" ")} aria-hidden="true">
        <div className={styles.cardIdentity}>
          <span className={`${styles.bone} ${styles.chipRow}`} />
          <span className={`${styles.bone} ${styles.title}`} />
          <span className={`${styles.bone} ${styles.titleShort}`} />
          <span className={`${styles.bone} ${styles.text}`} />
          <span className={`${styles.bone} ${styles.text}`} />
          <span className={`${styles.bone} ${styles.textShort}`} />
        </div>
        <div className={styles.cardRight}>
          <div className={styles.cardImpact}>
            <span className={`${styles.bone} ${styles.metric}`} />
            <span className={`${styles.bone} ${styles.metric}`} />
            <span className={`${styles.bone} ${styles.metric}`} />
          </div>
          <div className={styles.cardPeople}>
            <span className={`${styles.bone} ${styles.person}`} />
            <span className={`${styles.bone} ${styles.person}`} />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "block") {
    const style: CSSProperties = { width: width ?? "100%", height: height ?? "8rem" };
    return (
      <span
        className={[styles.bone, styles.block, className].filter(Boolean).join(" ")}
        style={style}
        aria-hidden="true"
      />
    );
  }

  const count = Math.max(1, lines);
  return (
    <span className={[styles.lines, className].filter(Boolean).join(" ")} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`${styles.bone} ${styles.line}`}
          style={{ width: i === count - 1 && count > 1 ? "60%" : (width ?? "100%") }}
        />
      ))}
    </span>
  );
}
