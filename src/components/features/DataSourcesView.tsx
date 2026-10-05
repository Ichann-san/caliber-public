"use client";

import { useState } from "react";
import { ErrorState, PageHeader, SelectField } from "@/components/ui";
import { useDataSource } from "./DataSourceProvider";
import { usePersona } from "./PersonaProvider";
import { useResult } from "./useResult";
import { ProductionTrend } from "./ProductionTrend";
import styles from "./performance.module.css";

const DOMAINS = [
  { title: "Production", status: "Selected assets", need: "Hourly PLANT_RATE in five separate observation windows; daily rate means are available." },
  { title: "Energy", status: "Simulated in Summary", need: "Illustrative UI total only. Measured energy still requires meters, consistent units and a reporting boundary." },
  { title: "Emissions", status: "Simulated in Summary", need: "Illustrative UI total only. A real value requires activity data, emission factors and a defined boundary." },
  { title: "Downtime", status: "Recorded incidents", need: "Source incident hours are summed only for filtered cases; they are not total plant downtime." },
  { title: "Operations", status: "Selected assets", need: "Observed equipment uptime and reference availability have different periods and definitions." },
] as const;

export function DataSourcesView() {
  const { source } = useDataSource();
  const { personaId } = usePersona();
  const [tag, setTag] = useState("");
  const { state, reload } = useResult(() => source.getPerformance(personaId, { status: "all" }), personaId);
  const snapshot = state.data;
  const asset = snapshot?.assets.find(item => item.tag === tag) ?? snapshot?.assets[0];
  return <div className={styles.stack}>
    <PageHeader title="Data sources" description="A governed map of the supplied historical inputs, metric definitions and coverage limits." />
    {state.status === "error" ? <ErrorState title="Source map unavailable" body={state.error.error.message} retry={reload} /> : !snapshot ? <p className={styles.muted}>Loading source coverage…</p> : <>
      <p className={styles.muted}>{snapshot.definition} This view lists only source windows tied to cases visible to your selected role.</p>
      <div className={styles.coverage}>
        {snapshot.sourceGroups.map(group => <section className={styles.panel} key={group.id}>
          <h2>{group.title}</h2>
          <p className={styles.muted}>{group.supports}</p>
          <p className={styles.muted}>{group.sourceIds.length} source file{group.sourceIds.length === 1 ? "" : "s"} in this role&apos;s case scope</p>
          {group.sourceIds.length ? <ul className={styles.sourceList}>{group.sourceIds.map(id => <li key={id} title={id}>{id.split("/").at(-1)}</li>)}</ul> : <p className={styles.muted}>No linked file in this role&apos;s case scope.</p>}
        </section>)}
      </div>
      <section className={styles.panel}>
        <h2>Domain coverage</h2>
        <div className={styles.kpiList}>{DOMAINS.map(domain => <div className={styles.kpiCard} key={domain.title}>
          <h3>{domain.title}</h3><strong>{!asset && ["Production", "Energy", "Emissions", "Operations"].includes(domain.title) ? "No linked window" : domain.status}</strong><p>{domain.need}</p>
        </div>)}</div>
        <p className={styles.muted}>Energy forecasting is unavailable. A future integration needs a metered time series, forecast horizon and out-of-time evaluation.</p>
      </section>
      <section className={styles.panel}>
        <h2>Selected asset definitions</h2>
        {asset ? <>
          <div className={styles.selector}><SelectField label="Asset window" value={asset.tag} options={snapshot.assets.map(item => ({ value: item.tag, label: `${item.tag} · ${item.plantUnit}` }))} onChange={setTag} />
            <p className={styles.muted}>{asset.windowStart.slice(0, 10)} to {asset.windowEnd.slice(0, 10)}</p></div>
          <div className={styles.detailGrid}>
            <div className={styles.panel}><h3>Production rate</h3><ProductionTrend asset={asset} />
              <p className={styles.muted}>{asset.production.definition}</p><p className={styles.muted}>Source: {asset.production.sourceId.split("/").at(-1)}</p></div>
            <div className={styles.panel}><h3>Operational indicators</h3><div className={styles.kpiList}>
              {asset.kpis.map(kpi => <div className={styles.kpiCard} key={kpi.name}>
                <h3>{kpi.name.replaceAll("_", " ")}</h3>
                <strong>{kpi.value == null ? "Unavailable" : `${Number(kpi.value.toFixed(2))} ${kpi.unit}`}</strong>
                <small>{kpi.periodStart && kpi.periodEnd ? `${kpi.periodStart.slice(0, 10)} to ${kpi.periodEnd.slice(0, 10)}` : kpi.periodHours ? `Reference period: ${kpi.periodHours} h; calendar dates unavailable` : "Reference period unavailable"}</small>
                <p>{kpi.reason ?? kpi.definition}</p>
                <small>Source: {kpi.sourceIds.map(id => id.split("/").at(-1)).join(", ")}</small>
              </div>)}</div></div>
          </div>
        </> : <p className={styles.muted}>No selected asset window is linked to the cases visible to this role.</p>}
      </section>
    </>}
  </div>;
}
