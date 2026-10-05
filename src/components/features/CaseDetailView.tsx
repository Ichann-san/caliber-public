"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import type { CaseDetail, Json } from "@contracts/v1";
import {
  ActionRefList,
  ActivityList,
  ChronologyList,
  EvidenceList,
  EvidenceRecord,
  InsightPanel,
  QuestionList,
} from "@/components/case";
import {
  Button,
  Drawer,
  ErrorState,
  InlineNotice,
  Metric,
  PageHeader,
  PersonChip,
  ProvenanceLabel,
  ReviewLabel,
  SectionHeader,
  StatusLabel,
} from "@/components/ui";
import type { MetricView } from "@/components/view-models";
import { formatKusd, formatSourceDate, NOT_RECORDED } from "@/lib/client/format";
import {
  DEMO_LABEL,
  ML_LABEL,
  actionRefViews,
  activityItems,
  chronologyItems,
  detailHeader,
  divisionName,
  evidenceRecordView,
  evidenceRefs,
  historicalPicView,
  impactMetrics,
  insightGroups,
  personView,
  questionViews,
  reviewView,
  statusView,
} from "@/lib/client/mappers";
import { ActionDraftForm } from "./ActionDraftForm";
import { ActionSteps } from "./ActionSteps";
import { AssignControls } from "./AssignControls";
import { EditDraftForm } from "./CreateCaseForm";
import { useDataSource } from "./DataSourceProvider";
import { PerformanceContext } from "./PerformanceContext";
import { NoteForm } from "./NoteForm";
import { usePersona } from "./PersonaProvider";
import { errorBody, errorTitle } from "./notices";
import { PageSkeleton } from "./skeletons";
import { TransitionControls } from "./TransitionControls";
import { useResult } from "./useResult";
import layout from "./layout.module.css";
import styles from "./detail.module.css";

function GroupSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={styles.group} aria-labelledby={`${id}-title`}>
      <SectionHeader id={`${id}-title`} title={title} className={styles.groupHeader} />
      {children}
    </section>
  );
}

function BentoSection({
  id,
  title,
  description,
  className,
  scrollable = false,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  className?: string;
  scrollable?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={[styles.bentoSection, className].filter(Boolean).join(" ")}
      aria-labelledby={`${id}-title`}
    >
      <header className={styles.bentoHeader}>
        <h3 id={`${id}-title`} className={styles.bentoTitle}>
          {title}
        </h3>
        {description ? <p className={styles.bentoDescription}>{description}</p> : null}
      </header>
      <div
        className={[styles.bentoBody, scrollable ? styles.scrollArea : undefined].filter(Boolean).join(" ")}
        role={scrollable ? "region" : undefined}
        aria-label={scrollable ? `${title} content` : undefined}
        tabIndex={scrollable ? 0 : undefined}
      >
        {children}
      </div>
    </section>
  );
}

interface Kpi {
  name?: Json;
  value?: Json;
  unit?: Json;
  target?: Json;
  target_class?: Json;
  status?: Json;
}

function MonitoringBlock({ detail }: { detail: CaseDetail }) {
  const m = detail.monitoring;
  if (m.state !== "available") {
    return (
      <div className={layout.stackTight}>
        <div className={layout.row}>
          <p className={styles.factTitle}>Monitoring</p>
          <ProvenanceLabel label={{ kind: "unavailable", text: "Not available" }} />
        </div>
        <p className={styles.bodyText}>Monitoring context is not available. This does not mean the asset is healthy.</p>
        {m.reason ? <p className={layout.secondaryText}>{m.reason}</p> : null}
      </div>
    );
  }
  const ctx = m.context && typeof m.context === "object" && !Array.isArray(m.context) ? m.context : null;
  const kpis = ctx && Array.isArray(ctx.kpis) ? (ctx.kpis as Kpi[]) : [];
  const str = (v: Json | undefined) => (v === null || v === undefined ? NOT_RECORDED : String(v));
  return (
    <div className={layout.stackTight}>
      <div className={layout.row}>
        <p className={styles.factTitle}>Monitoring</p>
        <ProvenanceLabel label={{ kind: "source", text: "Derived from source data" }} />
      </div>
      {ctx && (ctx.window_start || ctx.window_end) ? (
        <p className={layout.secondaryText}>
          Window {str(ctx.window_start)} to {str(ctx.window_end)}, as supplied.
        </p>
      ) : null}
      {kpis.length > 0 ? (
        <ul className={layout.plainList}>
          {kpis.map((k, i) => (
            <li key={`${str(k.name)}-${i}`} className={styles.bodyText}>
              {str(k.name).replace(/_/g, " ")}: {str(k.value)}
              {k.unit ? ` ${str(k.unit)}` : ""}; target {str(k.target)}
              {k.unit ? ` ${str(k.unit)}` : ""} ({str(k.target_class)}); status {str(k.status).replace(/_/g, " ")}
            </li>
          ))}
        </ul>
      ) : (
        <p className={layout.secondaryText}>No KPI values supplied.</p>
      )}
      <p className={layout.secondaryText}>ASSUMED targets have not been verified against plant standards.</p>
    </div>
  );
}

export function CaseDetailView({ caseId }: { caseId: string }) {
  const { source } = useDataSource();
  const { personaId, ctx, referenceData } = usePersona();
  const { state, reload, setData } = useResult(() => source.getCase(personaId, caseId), `${personaId}:${caseId}`);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const detail = state.data;

  const views = useMemo(() => {
    if (!detail) return null;
    return {
      header: detailHeader(ctx, detail),
      chronology: chronologyItems(detail),
      insight: insightGroups(detail),
      questions: questionViews(ctx, detail),
      refs: actionRefViews(ctx, detail),
      activity: activityItems(detail),
      evidence: evidenceRefs(detail, detail.evidence.map((e) => e.id)),
    };
  }, [detail, ctx]);

  const back = (
    <Button as="a" href="/cases" variant="quiet" size="sm" icon={<ArrowLeft size={20} weight="regular" />}>
      Back to cases
    </Button>
  );

  if (state.status === "error" && !detail) {
    const notFound = state.error.error.code === "NOT_FOUND";
    return (
      <div className={layout.stack}>
        <PageHeader title={notFound ? "Case not available" : "Case could not be loaded"} actions={back} />
        <ErrorState
          title={errorTitle(state.error)}
          body={
            notFound
              ? `${errorBody(state.error)} The selected role may not have access to this case.`
              : errorBody(state.error)
          }
          retry={notFound ? undefined : reload}
        />
      </div>
    );
  }
  if (!detail || !views) return <PageSkeleton label="Loading case" />;

  const p = detail.permissions;
  const evidenceRecord = evidenceId ? detail.evidence.find((e) => e.id === evidenceId) : null;
  const openEvidence = (id: string) => setEvidenceId(id);
  const metrics: MetricView[] = [
    ...impactMetrics(detail.impact),
    {
      label: "Total exposure",
      value: formatKusd(detail.impact.totalExposureKusd),
      unavailableText: NOT_RECORDED,
      note: "Recorded exposure; not actual loss",
    },
  ];
  const sourceLabel = detail.sourceIncidentId ? { kind: "source" as const, text: "Source" } : DEMO_LABEL;
  const divisions = detail.divisionIds.map((id) => divisionName(ctx, id)).join(", ");
  const engineers = detail.people.assignees;
  const historicalPic = historicalPicView(detail.people.historicalRcaPic);

  return (
    <div className={layout.stack}>
      <PageHeader
        title={detail.title}
        actions={back}
        meta={
          <div className={layout.row}>
            <span className={styles.displayId}>{views.header.card.displayId}</span>
            <StatusLabel status={statusView(detail.status)} />
            <ReviewLabel review={reviewView(detail)} />
            <ProvenanceLabel label={ML_LABEL[detail.mlState]} />
          </div>
        }
      />
      {state.status === "error" ? (
        <ErrorState title={errorTitle(state.error)} body={errorBody(state.error)} retry={reload} headingLevel={2} />
      ) : null}

      <div className={styles.layout}>
        <div className={styles.groups}>
          <GroupSection id="overview" title="Overview">
            <div className={`${styles.bentoGrid} ${styles.overviewGrid}`}>
              <BentoSection id="case-information" title="Case information">
            {detail.conflicts.map((c) => (
              <InlineNotice
                key={c.id}
                tone="warning"
                title={`Source conflict ${c.id} (unresolved)`}
                body={
                  <div className={layout.stackTight}>
                    <p>{c.description}</p>
                    {c.disposition ? <p>Disposition: {c.disposition}</p> : null}
                    {c.evidenceIds.length > 0 ? (
                      <EvidenceList items={evidenceRefs(detail, c.evidenceIds)} onOpen={openEvidence} />
                    ) : null}
                  </div>
                }
              />
            ))}

            <div className={layout.panel}>
              <dl className={styles.facts}>
                <div>
                  <dt>Occurred</dt>
                  <dd>
                    {formatSourceDate(detail.occurredAt)}{" "}
                    <ProvenanceLabel label={detail.occurredAt.provenance === "demo" ? DEMO_LABEL : { kind: "source", text: "Source" }} />
                  </dd>
                </div>
                <div>
                  <dt>Tag</dt>
                  <dd>{detail.tag ?? NOT_RECORDED}</dd>
                </div>
                <div>
                  <dt>Equipment type</dt>
                  <dd>{views.header.eqTypeText}</dd>
                </div>
                <div>
                  <dt>Component</dt>
                  <dd>{detail.component ?? NOT_RECORDED}</dd>
                </div>
                <div>
                  <dt>Problem type</dt>
                  <dd>{detail.mechanism ?? NOT_RECORDED}</dd>
                </div>
                <div>
                  <dt>Plant</dt>
                  <dd>{detail.plant ?? NOT_RECORDED}</dd>
                </div>
                <div>
                  <dt>Source status</dt>
                  <dd>
                    {views.header.sourceStatusText ?? NOT_RECORDED}{" "}
                    {views.header.sourceStatusText ? <ProvenanceLabel label={sourceLabel} /> : null}
                  </dd>
                </div>
                <div>
                  <dt>Divisions involved</dt>
                  <dd>{divisions}</dd>
                </div>
              </dl>
              <p className={styles.bodyText}>{detail.description.replace("Source-backed demonstration case.", "Source-linked case.")}</p>
            </div>

            <div className={layout.panel}>
              <div className={layout.rowBetween}>
                <p className={styles.factTitle}>Recorded impact</p>
                <ProvenanceLabel label={sourceLabel} />
              </div>
              <div className={styles.metrics}>
                {metrics.map((m) => (
                  <Metric key={m.label} metric={m} />
                ))}
              </div>
              <p className={layout.secondaryText}>
                Each value is shown separately and never summed here. Recorded values are not savings.
              </p>
            </div>

            <div className={layout.panel}>
              <MonitoringBlock detail={detail} />
            </div>

            <div className={layout.panel}>
              <div className={layout.rowBetween}>
                <p className={styles.factTitle}>Workflow</p>
                {p.canEdit && !editing ? (
                  <Button size="sm" onClick={() => setEditing(true)}>
                    Edit draft
                  </Button>
                ) : null}
              </div>
              {editing && p.canEdit ? (
                <EditDraftForm detail={detail} onUpdated={setData} onReload={reload} onDone={() => setEditing(false)} />
              ) : null}
              <TransitionControls detail={detail} onUpdated={setData} onReload={reload} />
            </div>
              </BentoSection>

              <BentoSection id="people" title="People" description="Assignments are illustrative.">
            <div className={styles.people}>
              <div className={styles.peopleRole}>
                <h4 className={styles.peopleRoleTitle}>Proposer</h4>
                <PersonChip person={personView(ctx, detail.people.proposer, "proposer")} showRole={false} />
              </div>
              <div className={styles.peopleRole}>
                <h4 className={styles.peopleRoleTitle}>Accountable owner</h4>
                <PersonChip person={personView(ctx, detail.people.accountableOwner, "accountable_owner")} showRole={false} />
              </div>
              <div className={styles.peopleRole}>
                <h4 className={styles.peopleRoleTitle}>Assignee{engineers.length > 1 ? ` (${engineers.length})` : ""}</h4>
                <div className={styles.assignees}>
                  {engineers.length > 0 ? (
                    engineers.map((u) => <PersonChip key={u.id} person={personView(ctx, u, "assignee")} showRole={false} />)
                  ) : (
                    <PersonChip person={personView(ctx, null, "assignee")} showRole={false} />
                  )}
                </div>
              </div>
            </div>
            <p className={layout.secondaryText}>
              Proposing division: {divisionName(ctx, detail.people.proposingDivisionId)}.
            </p>
            {p.canAssign ? (
              <div className={layout.panel}>
                <p className={styles.factTitle}>Assignment and priority review</p>
                {referenceData ? <AssignControls detail={detail} onUpdated={setData} onReload={reload} /> : null}
              </div>
            ) : null}
              </BentoSection>
            </div>
          </GroupSection>

          <GroupSection id="analysis" title="Analysis">
            <div className={`${styles.bentoGrid} ${styles.analysisGrid}`}>
              <BentoSection id="performance-context" title="Performance context" description="Selected asset source window and occurrence-day production rate; association requires investigation." className={styles.fullWidth}>
                <PerformanceContext detail={detail} />
              </BentoSection>
              <BentoSection id="chronology" title="Chronology" description="Dates are shown exactly as recorded; none are invented." scrollable={views.chronology.length > 0}>
            <ChronologyList items={views.chronology} onOpenEvidence={openEvidence} />
              </BentoSection>

              <BentoSection
            id="evidence"
            title="Evidence"
            description={`${detail.evidence.length} records. Open one to read the source excerpt.`}
            scrollable={views.evidence.length > 0}
          >
            {views.evidence.length > 0 ? (
              <EvidenceList items={views.evidence} onOpen={openEvidence} label="" />
            ) : (
              <p className={layout.secondaryText}>No evidence records. New requests have no uploads in v1.</p>
            )}
              </BentoSection>

              <BentoSection
                id="insight"
                title="RCA and insight"
                description="Historical findings, rules output and ML ranking are kept separate."
                className={styles.fullWidth}
                scrollable
              >
            <p className={styles.historicalPic}>
              <span className={styles.factTitle}>Historical RCA PIC (source code):</span>{" "}
              {historicalPic.name ?? NOT_RECORDED}{" "}
              {historicalPic.name ? <ProvenanceLabel label={historicalPic.provenance} /> : null}
            </p>
            <InsightPanel groups={views.insight} onOpenEvidence={openEvidence} />
              </BentoSection>
            </div>
          </GroupSection>

          <GroupSection id="action" title="Action">
            <div className={`${styles.bentoGrid} ${styles.actionGrid}`}>
              <BentoSection id="questions" title="Investigation questions">
            <QuestionList items={views.questions} onOpenEvidence={openEvidence} />
              </BentoSection>

              <BentoSection
            id="follow-up"
            title="Follow-up"
            description="References need an applicability review. Drafting an action does not authorise execution."
          >
            <div
              className={styles.scrollArea}
              role="region"
              aria-label="Follow-up references"
              tabIndex={views.refs.items.length + views.refs.withheld.length > 0 ? 0 : undefined}
            >
              <ActionRefList items={views.refs.items} withheld={views.refs.withheld} onOpenEvidence={openEvidence} />
            </div>
            <div className={layout.panel}>
              <div className={layout.rowBetween}>
                <p className={styles.factTitle}>Actions</p>
              </div>
              <ActionSteps detail={detail} onUpdated={setData} onReload={reload} onOpenEvidence={openEvidence} />
            </div>
            {p.canDraftAction ? (
              <div className={layout.panel}>
                <p className={styles.factTitle}>Draft an action</p>
                <ActionDraftForm detail={detail} onUpdated={setData} />
              </div>
            ) : null}
              </BentoSection>

              <BentoSection id="activity" title="Activity" className={styles.fullWidth}>
            {p.canAddNote ? <NoteForm detail={detail} onUpdated={setData} /> : null}
            <ActivityList items={views.activity} emptyText="No activity yet." />
              </BentoSection>
            </div>
          </GroupSection>
        </div>
      </div>

      <Drawer
        open={Boolean(evidenceRecord)}
        title={evidenceRecord ? "Evidence record" : "Evidence"}
        onClose={() => setEvidenceId(null)}
      >
        {evidenceRecord ? <EvidenceRecord record={evidenceRecordView(evidenceRecord)} /> : null}
      </Drawer>
    </div>
  );
}
