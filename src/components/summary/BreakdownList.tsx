import type { BreakdownRowView } from "@/components/view-models";
import styles from "./BreakdownList.module.css";

export interface BreakdownListProps {
  title: string;
  rows: BreakdownRowView[];
  /** Number of visible cases after current access and filters. */
  totalCases: number;
  /** Shown when there are no rows. */
  emptyText?: string;
}

/** Compact label + count breakdown, e.g. cases by status or by problem type. */
const COLORS = Array.from({ length: 12 }, (_, index) => `var(--color-chart-${index + 1})`);
const UNRECORDED_COLOR = "var(--color-chart-unrecorded)";

const CIRCUMFERENCE = 2 * Math.PI * 36;

/** All charts use the same total case count, including a blank sector when data is missing. */
export function BreakdownList({ title, rows, totalCases, emptyText = "No cases in this scope." }: BreakdownListProps) {
  let cursor = 0;
  const slices = rows.filter(row => row.count > 0).map((row, index) => {
    const start = cursor;
    cursor += row.count;
    return { ...row, color: COLORS[index % COLORS.length], start };
  });
  const remaining = Math.max(0, totalCases - cursor);
  const segments = remaining > 0
    ? [...slices, { label: "Not recorded", count: remaining, color: UNRECORDED_COLOR, start: cursor }]
    : slices;
  const gap = segments.length > 1 ? 1.5 : 0;

  return (
    <section className={styles.breakdown} aria-label={title}>
      <h3 className={styles.title}>{title}</h3>
      {totalCases === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <>
        <div className={styles.content}>
          <div className={styles.chart}>
            <svg className={styles.pie} viewBox="0 0 100 100" role="img" aria-label={`${title}: ${totalCases} cases; ${segments.map(row => `${row.label} ${row.count}`).join(", ")}`}>
              {segments.map(row => {
                const length = row.count / totalCases * CIRCUMFERENCE;
                return <circle
                  key={row.label}
                  tabIndex={0}
                  role="img"
                  aria-label={`${row.label}: ${Math.round(row.count / totalCases * 100)}%, ${row.count} cases`}
                  cx="50" cy="50" r="36" fill="none" stroke={row.color} strokeWidth="18"
                  strokeDasharray={`${Math.max(0, length - gap)} ${CIRCUMFERENCE}`}
                  strokeDashoffset={-row.start / totalCases * CIRCUMFERENCE}
                  transform="rotate(-90 50 50)"
                ><title>{`${row.label}: ${Math.round(row.count / totalCases * 100)}% (${row.count} cases)`}</title></circle>;
              })}
            </svg>
            <div className={styles.total} aria-hidden="true"><strong>{totalCases}</strong><span>cases</span></div>
          </div>
          <ul className={styles.list} aria-label={`${title} details`} tabIndex={0}>
          {rows.map((row, index) => (
            <li key={row.label} className={styles.row}>
              <span className={styles.label}><i className={styles.marker} style={{ backgroundColor: COLORS[index % COLORS.length] }} aria-hidden="true" />{row.label}</span>
              <span className={styles.count}>{row.count}</span>
            </li>
          ))}
          {remaining > 0 && <li className={styles.row}><span className={styles.label}><i className={styles.marker} style={{ backgroundColor: UNRECORDED_COLOR }} aria-hidden="true" />Not recorded</span><span className={styles.count}>{remaining}</span></li>}
          </ul>
        </div>
        </>
      )}
    </section>
  );
}
