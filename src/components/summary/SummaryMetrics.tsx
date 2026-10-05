import type { MetricView } from "@/components/view-models";
import { Metric } from "@/components/ui/Metric";
import styles from "./SummaryMetrics.module.css";

export interface SummaryMetricsProps {
  metrics: MetricView[];
  /** Optional scope line shown above the metrics, e.g. "Rotating Maintenance, active cases". */
  scopeText?: string;
}

/**
 * Summary figures in a plain, evenly weighted grid. Every metric is its own
 * labelled item: actual loss and potential loss are never combined.
 */
export function SummaryMetrics({ metrics, scopeText }: SummaryMetricsProps) {
  return (
    <div className={styles.summary}>
      {scopeText ? <p className={styles.scope}>{scopeText}</p> : null}
      {metrics.length === 0 ? (
        <p className={styles.empty}>No figures for this scope.</p>
      ) : (
        <ul className={styles.grid}>
          {metrics.map((metric) => (
            <li key={metric.label} className={styles.cell}>
              <Metric metric={metric} className={styles.overviewMetric} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
