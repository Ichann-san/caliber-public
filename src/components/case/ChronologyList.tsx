import type { ChronologyItemView } from "@/components/view-models";
import { EvidenceList } from "./EvidenceList";
import styles from "./ChronologyList.module.css";

export interface ChronologyListProps {
  items: ChronologyItemView[];
  /** Opens the evidence drawer; when omitted evidence renders as plain text. */
  onOpenEvidence?: (id: string) => void;
  /** Shown when there are no items. */
  emptyText?: string;
}

const UNDATED_TEXT = "Date not recorded";

/** Case chronology. Dates appear exactly as provided; none are invented. */
export function ChronologyList({ items, onOpenEvidence, emptyText = "No chronology recorded." }: ChronologyListProps) {
  if (items.length === 0) return <p className={styles.empty}>{emptyText}</p>;

  return (
    <ol className={styles.list}>
      {items.map((item) => {
        const undated = item.dateKind === "undated" || !item.dateText;
        return (
          <li key={item.id} className={styles.item}>
            <div className={styles.when}>
              {undated ? (
                <span className={styles.undated}>{UNDATED_TEXT}</span>
              ) : (
                <span className={styles.date}>{item.dateText}</span>
              )}
            </div>
            <div className={styles.content}>
              <p className={styles.title}>{item.title}</p>
              {item.body ? <p className={styles.body}>{item.body}</p> : null}
              {item.evidence && item.evidence.length > 0 ? (
                <EvidenceList items={item.evidence} onOpen={onOpenEvidence} />
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
