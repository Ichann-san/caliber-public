"use client";

import { useState } from "react";
import Link from "next/link";
import type { CaseListItem, PerformanceAsset, PerformanceSnapshot, Summary } from "@contracts/v1";
import type { MetricView } from "@/components/view-models";
import { SummaryMetrics } from "@/components/summary";
import { SelectField, ErrorState } from "@/components/ui";
import { assetForCase } from "@/lib/performance";
import { toCaseFilters, type FilterState } from "./boardFilters";
import { useDataSource } from "./DataSourceProvider";
import { usePersona } from "./PersonaProvider";
import { useResult } from "./useResult";
import { ProductionTrend } from "./ProductionTrend";
import styles from "./performance.module.css";

function selectedAsset(snapshot: PerformanceSnapshot, tag: string): PerformanceAsset | null {
  return snapshot.assets.find(asset => asset.tag === tag) ?? snapshot.assets[0] ?? null;
}

// Illustrative UI figures only. They are independent of the source publication,
// cannot be interpreted as measured energy/emissions, and never enter RCA or loss calculations.
const SIMULATED_30_DAY_TOTALS: Record<string, { energyMWh: number; emissionsTco2e: number }> = {
  "PU-2101B": { energyMWh: 420.0, emissionsTco2e: 96.6 },
  "KO-3201": { energyMWh: 510.0, emissionsTco2e: 117.3 },
  "HE-3301": { energyMWh: 290.0, emissionsTco2e: 66.7 },
  "BL-5702": { energyMWh: 365.0, emissionsTco2e: 83.9 },
  "PM-4405B": { energyMWh: 245.0, emissionsTco2e: 56.4 },
};

export function PerformanceDashboard({ filters, summary, items }: { filters: FilterState; summary: Summary; items: CaseListItem[] }) {
  const { source } = useDataSource();
  const { personaId } = usePersona();
  const [tag, setTag] = useState("");
  const key = `${personaId}:${JSON.stringify(filters)}`;
  const { state, reload } = useResult(() => source.getPerformance(personaId, toCaseFilters(filters)), key);
  if (state.status === "error") return <ErrorState title="Performance data unavailable" body={state.error?.error.message ?? "Please retry."} retry={reload} />;
  if (!state.data) return <p className={styles.muted}>Loading performance coverage…</p>;
  const snapshot = state.data;
  const asset = selectedAsset(snapshot, tag);
  const uptime = asset?.kpis.find(k => k.name === "observed_uptime" && k.state === "available");
  const related = asset ? items.filter(item => assetForCase([asset], item)) : [];
  const hours = asset?.production.daily.reduce((sum, point) => sum + point.observedHours, 0) ?? 0;
  const simulated = asset ? SIMULATED_30_DAY_TOTALS[asset.tag] : undefined;
  const metrics: MetricView[] = [
    { label: "Production rate", value: asset?.production.daily.at(-1)?.meanRate.toFixed(2) ?? null, unit: asset?.production.unit, unavailableText: "No asset in scope" },
    { label: "Energy", value: simulated?.energyMWh.toFixed(1) ?? null, unit: "MWh", unavailableText: "No asset in scope" },
    { label: "Emissions", value: simulated?.emissionsTco2e.toFixed(1) ?? null, unit: "tCO₂e", unavailableText: "No asset in scope" },
    { label: "Equipment uptime", value: uptime?.value?.toFixed(2) ?? null, unit: uptime?.unit, unavailableText: "No asset in scope" },
    { label: "Summed incident downtime", value: summary.knownDowntimeCount ? summary.summedIncidentDowntimeHours.toFixed(1) : null, unit: "h", unavailableText: "Not recorded" },
  ];

  return <div className={styles.stack}>
    <SummaryMetrics metrics={metrics} />
        <div className={styles.selector}>
      <SelectField label="Observed asset" value={asset?.tag ?? ""}
        options={snapshot.assets.length ? snapshot.assets.map(item => ({ value: item.tag, label: `${item.tag} · ${item.plantUnit}` })) : [{ value: "", label: "No source window in this case scope" }]}
        onChange={setTag} />
      <p className={styles.muted}>{asset ? `${asset.windowStart.slice(0, 10)} to ${asset.windowEnd.slice(0, 10)} · ${hours} rate observations` : "Change the case filters to inspect a source-linked asset."}</p>
    </div>
    <div className={styles.lowerGrid}>
      <section className={styles.panel}>
        <h2>Production rate · {asset?.tag ?? "no asset selected"}</h2>
        {asset ? <><ProductionTrend asset={asset} /><p className={styles.muted}>Source: {asset.production.sourceId.split("/").at(-1)}. Rate observations are not production volume; equipment OFF does not mean plant shutdown.</p></> : <p className={styles.muted}>Production data cover five selected asset windows. None matches the cases in this scope.</p>}
      </section>
      <section className={styles.panel}>
        <h2>Coverage and linked cases</h2>
        {asset ? <>
          <dl className={styles.facts}>
            <div><dt>Observed uptime</dt><dd>{uptime?.value ?? "Unavailable"}{uptime?.value != null ? ` ${uptime.unit}` : ""}</dd></div>
            <div><dt>Monitoring</dt><dd>{Object.entries(asset.monitoringCoverage).map(([state, count]) => `${state.toLowerCase()} ${count} h`).join(" · ")}</dd></div>
            <div><dt>Linked source cases</dt><dd>{related.length}</dd></div>
          </dl>
          {related.length ? <ul className={styles.links}>{related.map(item => <li key={item.id}><Link href={`/cases/${encodeURIComponent(item.id)}`}>{item.title}</Link></li>)}</ul> : <p className={styles.muted}>No source case matches this asset and observation period.</p>}
          <p className={styles.muted}>Links use the same asset and occurrence window. They do not establish that a rate change caused the incident.</p>
        </> : <p className={styles.muted}>Energy, emissions and forecasting require additional measured inputs before a numeric result can be shown.</p>}
      </section>
    </div>
  </div>;
}
