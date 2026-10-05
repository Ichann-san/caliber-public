"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TimelineTrack } from "@/components/case";
import { EmptyState, ErrorState, PageHeader, ProvenanceLabel, SectionHeader, SelectField } from "@/components/ui";
import { plural } from "@/lib/client/format";
import { displayPersonName, timelineView } from "@/lib/client/mappers";
import { CaseFilterBar } from "./CaseFilterBar";
import { scopeText, toCaseFilters } from "./boardFilters";
import { useDataSource } from "./DataSourceProvider";
import { usePersona } from "./PersonaProvider";
import { errorBody, errorTitle } from "./notices";
import { PageSkeleton } from "./skeletons";
import { useFilters } from "./useFilters";
import { useResult } from "./useResult";
import layout from "./layout.module.css";

export function TimelineView() {
  const { source } = useDataSource();
  const { personaId, persona, personasError, referenceData } = usePersona();
  const { filters, input, onChange } = useFilters();
  const [timelineSort, setTimelineSort] = useState("date-asc");
  const key = `${personaId}:${JSON.stringify(filters)}`;
  const { state, reload } = useResult(() => source.getTimeline(personaId, toCaseFilters(filters)), key);
  const view = useMemo(() => (state.data ? timelineView(state.data) : null), [state.data]);
  const sortedLanes = useMemo(() => {
    if (!view) return [];
    const firstDate = (lane: typeof view.lanes[number]) => Math.min(...lane.events.map(event => Date.parse(event.dateISO)));
    return [...view.lanes].sort((a, b) => {
      if (timelineSort === "case-asc") return a.title.localeCompare(b.title);
      if (timelineSort === "case-desc") return b.title.localeCompare(a.title);
      return timelineSort === "date-desc" ? firstDate(b) - firstDate(a) : firstDate(a) - firstDate(b);
    });
  }, [view, timelineSort]);

  const header = (
    <PageHeader
      title="Timeline"
      description="Source incident dates, recorded chronology and action due dates."
    />
  );

  if (!persona && !personasError) return <PageSkeleton label="Loading timeline" />;
  if (persona?.role === "unassigned") {
    return (
      <div className={layout.stack}>
        {header}
        <EmptyState
          title="No assignment yet"
          body="This role has no assigned cases to show on the timeline."
        />
      </div>
    );
  }

  return (
    <div className={layout.stack}>
      {header}
      <CaseFilterBar value={input} onChange={onChange} referenceData={referenceData} />

      {state.status === "error" ? (
        <ErrorState title={errorTitle(state.error)} body={errorBody(state.error)} retry={reload} />
      ) : !view ? (
        <PageSkeleton label="Loading timeline" />
      ) : (
        <div className={layout.stack} aria-busy={state.status === "loading"}>
          <p className={layout.secondaryText}>
            {scopeText(persona ? displayPersonName(persona.displayName) : personaId, filters, referenceData)} {plural(view.lanes.length, "case")} with a
            dated event.
          </p>
          <div className={layout.timelineSort}>
            <SelectField label="Arrange timeline" value={timelineSort} onChange={setTimelineSort} options={[
              { value: "date-asc", label: "Incident date: oldest first" },
              { value: "date-desc", label: "Incident date: newest first" },
              { value: "case-asc", label: "Case name: A–Z" },
              { value: "case-desc", label: "Case name: Z–A" },
            ]} />
          </div>
          <TimelineTrack lanes={sortedLanes} emptyText="No dated events for these filters." />

          <section className={layout.stackTight} aria-labelledby="undated-title">
            <SectionHeader
              id="undated-title"
              title={`Undated and source-text entries (${view.undatedCount})`}
              description="These dates are kept as written in the source and are not placed on the axis."
            />
            {view.undated.length === 0 ? (
              <p className={layout.secondaryText}>No undated or source-text entries for these filters.</p>
            ) : (
              <ul className={layout.plainList}>
                {view.undated.map((u) => (
                  <li key={u.id}>
                    <span className={layout.row}>
                      <span>{u.dateText}</span>
                      {!u.isDemo ? <ProvenanceLabel label={{ kind: "source", text: "Source text" }} /> : null}
                    </span>
                    <span>
                      {u.label} (<Link href={u.href}>{u.caseTitle}</Link>)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
