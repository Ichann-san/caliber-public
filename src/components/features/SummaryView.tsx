"use client";

import { useState } from "react";
import Link from "next/link";
import type { CaseListItem, Summary } from "@contracts/v1";
import { BreakdownList, SummaryMetrics } from "@/components/summary";
import { EmptyState, ErrorState, PageHeader } from "@/components/ui";
import type { DataSource, Result } from "@/lib/client/dataSource";
import { isApiError } from "@/lib/client/dataSource";
import { displayPersonName, summaryExtras, summaryView } from "@/lib/client/mappers";
import { CaseFilterBar } from "./CaseFilterBar";
import { scopeText, toCaseFilters, type FilterState } from "./boardFilters";
import { useFilters } from "./useFilters";
import { useDataSource } from "./DataSourceProvider";
import { usePersona } from "./PersonaProvider";
import { errorBody, errorTitle } from "./notices";
import { PageSkeleton } from "./skeletons";
import { PerformanceDashboard } from "./PerformanceDashboard";
import { useResult } from "./useResult";
import layout from "./layout.module.css";
import styles from "./summary.module.css";

interface SummaryData {
  summary: Summary;
  items: CaseListItem[];
}

/**
 * GET /summary for the totals, plus the paged GET /cases list (same filters
 * and access) for the problem-type and insight breakdowns that the Summary
 * DTO does not carry.
 */
async function loadSummary(
  source: DataSource,
  personaId: string,
  filters: FilterState,
): Promise<Result<SummaryData>> {
  const f = toCaseFilters(filters);
  const summary = await source.getSummary(personaId, f);
  if (isApiError(summary)) return summary;
  const items: CaseListItem[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const res = await source.listCases(personaId, { ...f, page, pageSize: 20, sort: "priority" });
    if (isApiError(res)) return res;
    items.push(...res.data.items);
    if (items.length >= res.data.total || res.data.items.length === 0) break;
  }
  return { data: { summary: summary.data, items }, meta: summary.meta };
}

export function SummaryView() {
  const [tab, setTab] = useState<"performance" | "cases">("performance");
  const { source } = useDataSource();
  const { personaId, persona, personasError, referenceData } = usePersona();
  const { filters, input, onChange } = useFilters();
  const key = `${personaId}:${JSON.stringify(filters)}`;
  const { state, reload } = useResult(() => loadSummary(source, personaId, filters), key);

  const header = (
    <PageHeader
      title="Summary"
      description="Figures follow the selected role's visible cases and the filters below."
    />
  );

  if (!persona && !personasError) return <PageSkeleton label="Loading summary" />;
  if (persona?.role === "unassigned") {
    return (
      <div className={layout.stack}>
        {header}
        <EmptyState
          title="No assignment yet"
          body="This role has no assigned cases to summarise."
        />
      </div>
    );
  }

  const personaLabel = persona ? displayPersonName(persona.displayName) : personaId;
  const data = state.data;
  const view = data
    ? summaryView(data.summary, scopeText(personaLabel, filters, referenceData), summaryExtras(data.items))
    : null;
  const totalCases = data?.summary.totalCases ?? 0;

  return (
    <div className={styles.page}>
      {header}
      <CaseFilterBar value={input} onChange={onChange} referenceData={referenceData} />
      <div className={styles.tabs} role="tablist" aria-label="Summary view">
        <button type="button" role="tab" id="performance-tab" aria-controls="performance-panel" aria-selected={tab === "performance"} className={tab === "performance" ? styles.activeTab : undefined} onClick={() => setTab("performance")}>Performance</button>
        <button type="button" role="tab" id="cases-tab" aria-controls="cases-panel" aria-selected={tab === "cases"} className={tab === "cases" ? styles.activeTab : undefined} onClick={() => setTab("cases")}>Cases</button>
      </div>

      {state.status === "error" ? (
        <ErrorState title={errorTitle(state.error)} body={errorBody(state.error)} retry={reload} />
      ) : !view || !data ? (
        <PageSkeleton label="Loading summary" />
      ) : (
        <>
          <div className={styles.scopeRow}>
            <p className={styles.scope}>{view.scopeText}</p>
            <Link href="/data-sources">View data sources and KPI definitions</Link>
          </div>
          {tab === "performance" ? <div id="performance-panel" role="tabpanel" aria-labelledby="performance-tab" aria-busy={state.status === "loading"}>
            <PerformanceDashboard filters={filters} summary={data.summary} items={data.items} />
          </div> : <div id="cases-panel" role="tabpanel" aria-labelledby="cases-tab" className={styles.canvas} aria-busy={state.status === "loading"}>
            <SummaryMetrics metrics={view.metrics} />
            <div className={styles.breakdowns}>
              <BreakdownList title="By status" rows={view.byStatus} totalCases={totalCases} />
              <BreakdownList title="By problem type" rows={view.byProblemType} totalCases={totalCases} />
              <BreakdownList title="Insight coverage" rows={view.insightCoverage} totalCases={totalCases} />
            </div>
          </div>}
        </>
      )}
    </div>
  );
}
