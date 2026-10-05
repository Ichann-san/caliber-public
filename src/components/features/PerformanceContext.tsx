"use client";

import Link from "next/link";
import type { CaseDetail } from "@contracts/v1";
import { assetForCase } from "@/lib/performance";
import { useDataSource } from "./DataSourceProvider";
import { usePersona } from "./PersonaProvider";
import { useResult } from "./useResult";
import { ProductionTrend } from "./ProductionTrend";
import styles from "./performance.module.css";

export function PerformanceContext({ detail }: { detail: CaseDetail }) {
  const { source } = useDataSource();
  const { personaId } = usePersona();
  const { state, reload } = useResult(() => source.getPerformance(personaId, { status: "all" }), personaId);
  if (state.status === "error") return <p className={styles.muted}>Performance context unavailable. <button type="button" onClick={reload}>Retry</button></p>;
  if (!state.data) return <p className={styles.muted}>Loading source window…</p>;
  const asset = assetForCase(state.data.assets, detail);
  if (!asset) return <p className={styles.muted}>No matching source asset window for this case and occurrence date. No performance relationship is inferred.</p>;
  const day = detail.occurredAt.value?.slice(0, 10);
  const observation = asset.production.daily.find(point => point.date === day);
  const uptime = asset.kpis.find(kpi => kpi.name === "observed_uptime" && kpi.state === "available");
  return <div className={styles.stack}>
    <p className={styles.muted}>{asset.tag} · {asset.plantUnit} · {asset.windowStart.slice(0, 10)} to {asset.windowEnd.slice(0, 10)}</p>
    <dl className={styles.facts}>
      <div><dt>Occurrence-day mean plant rate</dt><dd>{observation ? `${observation.meanRate.toFixed(2)} ${asset.production.unit}` : "Not recorded"}</dd></div>
      <div><dt>Rate samples on that day</dt><dd>{observation ? `${observation.observedHours} h` : "Not recorded"}</dd></div>
      <div><dt>Observed equipment uptime</dt><dd>{uptime?.value == null ? "Unavailable" : `${uptime.value.toFixed(2)} ${uptime.unit}`}</dd></div>
      <div><dt>Monitoring coverage</dt><dd>{Object.entries(asset.monitoringCoverage).map(([label, count]) => `${label.toLowerCase()} ${count} h`).join(" · ")}</dd></div>
    </dl>
    <ProductionTrend asset={asset} />
    <p className={styles.muted}>Same asset and observation window support contextual investigation only. Rate movement does not establish a root cause or lost production volume. Source: {asset.production.sourceId.split("/").at(-1)}.</p>
    <Link href="/data-sources">Definitions and source coverage</Link>
  </div>;
}
