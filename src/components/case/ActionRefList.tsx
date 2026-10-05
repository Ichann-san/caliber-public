import type { ActionRefView, WithheldActionView } from "@/components/view-models";
import { EvidenceList } from "./EvidenceList";
import styles from "./ActionRefList.module.css";

export interface ActionRefListProps {
  items: ActionRefView[];
  withheld: WithheldActionView[];
  /** Opens the evidence drawer; when omitted evidence renders as plain text. */
  onOpenEvidence?: (id: string) => void;
  /** Shown when there are no action references. */
  emptyText?: string;
}

/**
 * Follow-up action references from historical records. Each needs an
 * applicability review. Actions withheld by a safety rule are listed
 * separately, with the reason and rule id, and are never offered as applicable.
 */
export function ActionRefList({
  items,
  withheld,
  onOpenEvidence,
  emptyText = "No action references from the source records.",
}: ActionRefListProps) {
  return (
    <div className={styles.wrapper}>
      {items.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id} className={styles.item}>
              <p className={styles.labels}>
                <span className={styles.category}>{item.categoryLabel}</span>
                <span className={styles.applicability}>{item.applicabilityLabel}</span>
              </p>
              <p className={styles.text}>{item.text}</p>
              <p className={styles.owner}>
                <span className={styles.ownerLabel}>Owner division: </span>
                {item.ownerDivision ?? "Not recorded"}
              </p>
              {item.evidence.length > 0 ? <EvidenceList items={item.evidence} onOpen={onOpenEvidence} /> : null}
            </li>
          ))}
        </ul>
      )}

      {withheld.length > 0 ? (
        <section className={styles.withheld} aria-label="Withheld by safety rule">
          <h3 className={styles.withheldTitle}>
            Withheld by safety rule
          </h3>
          <p className={styles.withheldIntro}>
            These references do not apply to this case and are not offered as actions.
          </p>
          <ul className={styles.withheldList}>
            {withheld.map((item) => (
              <li key={item.id} className={styles.withheldItem}>
                <p className={styles.withheldText}>{item.text}</p>
                <p className={styles.reason}>
                  <span className={styles.ownerLabel}>Reason: </span>
                  {item.reason}
                </p>
                <p className={styles.rule}>
                  <span className={styles.ownerLabel}>Rule: </span>
                  <span className={styles.ruleId}>{item.ruleId}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
