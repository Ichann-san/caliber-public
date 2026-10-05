import type { InsightGroupKind, InsightGroupView, InsightItemView } from "@/components/view-models";
import { ProvenanceLabel } from "@/components/ui/ProvenanceLabel";
import { EvidenceList } from "./EvidenceList";
import styles from "./InsightPanel.module.css";

export interface InsightPanelProps {
  groups: InsightGroupView[];
  /** Opens the evidence drawer; when omitted evidence renders as plain text. */
  onOpenEvidence?: (id: string) => void;
}

/** Fixed display order: historical RCA, then rules, then ML. */
const ORDER: InsightGroupKind[] = ["historical_rca", "rules", "ml"];

const GROUP_CLASS: Record<InsightGroupKind, string> = {
  historical_rca: styles.historical,
  rules: styles.rules,
  ml: styles.ml,
};

const DEFAULT_ABSTAIN_CAVEAT = "Abstain does not mean the asset is healthy.";
const UNAVAILABLE_TEXT = "Analysis not available";

function hiddenNote(count: number): string {
  return count === 1
    ? "1 other transferred candidate not shown by the ranker"
    : `${count} other transferred candidates not shown by the ranker`;
}

function InsightItem({
  item,
  isMl,
  onOpenEvidence,
}: {
  item: InsightItemView;
  isMl: boolean;
  onOpenEvidence?: (id: string) => void;
}) {
  return (
    <li className={styles.item}>
      {isMl && typeof item.rank === "number" ? (
        <span className={styles.rank}>Rank {item.rank}</span>
      ) : null}
      <div className={styles.itemBody}>
        <p className={styles.itemText}>{item.text}</p>
        {item.category || item.statusLabel || (isMl && item.scoreText) ? (
          <p className={styles.itemMeta}>
            {item.category ? <span className={styles.category}>{item.category}</span> : null}
            {item.statusLabel ? <span className={styles.statusText}>{item.statusLabel}</span> : null}
            {isMl && item.scoreText ? <span className={styles.score}>{item.scoreText}</span> : null}
          </p>
        ) : null}
        {item.evidence.length > 0 ? <EvidenceList items={item.evidence} onOpen={onOpenEvidence} /> : null}
      </div>
    </li>
  );
}

function InsightGroup({
  group,
  onOpenEvidence,
}: {
  group: InsightGroupView;
  onOpenEvidence?: (id: string) => void;
}) {
  const isMl = group.kind === "ml";
  const ListTag = isMl ? "ol" : "ul";

  return (
    <section className={`${styles.group} ${GROUP_CLASS[group.kind]}`} aria-label={group.title}>
      <header className={styles.groupHeader}>
        <h3 className={styles.groupTitle}>{group.title}</h3>
        <ProvenanceLabel label={group.provenance} />
      </header>

      {group.state === "available" ? (
        group.items.length > 0 ? (
          <ListTag className={styles.items}>
            {group.items.map((item) => (
              <InsightItem key={item.id} item={item} isMl={isMl} onOpenEvidence={onOpenEvidence} />
            ))}
          </ListTag>
        ) : (
          <p className={styles.stateText}>No findings recorded.</p>
        )
      ) : null}

      {group.state === "abstain" ? (
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No ranking shown (abstain)</p>
          {group.reason ? <p className={styles.stateText}>{group.reason}</p> : null}
          <p className={styles.caveat}>{group.caveat ?? DEFAULT_ABSTAIN_CAVEAT}</p>
        </div>
      ) : null}

      {group.state === "unavailable" ? (
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>{UNAVAILABLE_TEXT}</p>
          {group.reason ? <p className={styles.stateText}>{group.reason}</p> : null}
          {group.caveat ? <p className={styles.caveat}>{group.caveat}</p> : null}
        </div>
      ) : null}

      {isMl && group.hiddenCount && group.hiddenCount > 0 ? (
        <p className={styles.hidden}>{hiddenNote(group.hiddenCount)}</p>
      ) : null}
    </section>
  );
}

/**
 * RCA and AI insight. Three visually distinct groups, always in this order:
 * historical RCA findings, rules output, ML candidate ranking. ML shows rank
 * and a ranking score as text, never a percentage or bar.
 */
export function InsightPanel({ groups, onOpenEvidence }: InsightPanelProps) {
  const ordered = ORDER.map((kind) => groups.find((g) => g.kind === kind)).filter(
    (g): g is InsightGroupView => Boolean(g),
  );

  if (ordered.length === 0) {
    return <p className={styles.stateText}>{UNAVAILABLE_TEXT}</p>;
  }

  return (
    <div className={styles.panel}>
      {ordered.map((group) => (
        <InsightGroup key={group.kind} group={group} onOpenEvidence={onOpenEvidence} />
      ))}
    </div>
  );
}
