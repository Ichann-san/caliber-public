import type { MetricView } from "@/components/view-models";
import { ProvenanceLabel } from "./ProvenanceLabel";
import styles from "./Metric.module.css";

export interface MetricProps {
  metric: MetricView;
  /** "sm" for dense contexts such as the case card. Defaults to "md". */
  size?: "sm" | "md";
  className?: string;
}

const DEFAULT_UNAVAILABLE = "Not recorded";

/**
 * One labelled value. A null value shows the unavailable text, never a zero.
 * Values are never summed or combined here.
 */
export function Metric({ metric, size = "md", className }: MetricProps) {
  const hasValue = metric.value !== null && metric.value !== "";
  const cls = [styles.metric, size === "sm" ? styles.sm : styles.md, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls}>
      <span className={styles.label}>{metric.label}</span>
      {hasValue ? (
        <span className={styles.value}>
          <span className={styles.number}>{metric.value}</span>
          {metric.unit ? <span className={styles.unit}>{metric.unit}</span> : null}
        </span>
      ) : (
        <span className={styles.unavailable}>{metric.unavailableText ?? DEFAULT_UNAVAILABLE}</span>
      )}
      {metric.note || metric.provenance ? (
        <span className={styles.meta}>
          {metric.provenance ? <ProvenanceLabel label={metric.provenance} /> : null}
          {metric.note ? <span className={styles.note}>{metric.note}</span> : null}
        </span>
      ) : null}
    </div>
  );
}
