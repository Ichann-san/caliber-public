import type { PerformanceAsset } from "@contracts/v1";
import styles from "./performance.module.css";

export function ProductionTrend({ asset }: { asset: PerformanceAsset }) {
  const points = asset.production.daily;
  if (points.length === 0) return <p className={styles.muted}>No rate observations in this window.</p>;
  const values = points.map(point => point.meanRate);
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const coordinates = points.map((point, index) => {
    const x = 12 + index * 276 / Math.max(1, points.length - 1);
    const y = 95 - (point.meanRate - min) / span * 74;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return <div className={styles.trend}>
    <svg viewBox="0 0 300 112" role="img" aria-label={`${asset.tag} daily mean plant rate from ${points[0].date} to ${points.at(-1)?.date}; minimum ${min.toFixed(2)} and maximum ${max.toFixed(2)} ${asset.production.unit}`}>
      <line x1="12" x2="288" y1="95" y2="95" className={styles.axis} />
      <polyline points={coordinates} className={styles.trendLine} />
    </svg>
    <div className={styles.trendLabels}><span>{points[0].date}</span><span>{points.at(-1)?.date}</span></div>
    <p className={styles.muted}>Daily mean PLANT_RATE · {asset.production.unit} · {points.length} days</p>
  </div>;
}
