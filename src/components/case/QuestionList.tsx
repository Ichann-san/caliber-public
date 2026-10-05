import type { QuestionView } from "@/components/view-models";
import { EvidenceList } from "./EvidenceList";
import styles from "./QuestionList.module.css";

export interface QuestionListProps {
  items: QuestionView[];
  /** Opens the evidence drawer; when omitted evidence renders as plain text. */
  onOpenEvidence?: (id: string) => void;
  /** Shown when there are no questions. */
  emptyText?: string;
}

/** Investigation questions addressed to a division, each with its reason and evidence. */
export function QuestionList({
  items,
  onOpenEvidence,
  emptyText = "No investigation questions for this case.",
}: QuestionListProps) {
  if (items.length === 0) return <p className={styles.empty}>{emptyText}</p>;

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.id} className={styles.item}>
          <p className={styles.to}>
            <span className={styles.toLabel}>To</span> {item.toDivision}
          </p>
          <p className={styles.question}>{item.question}</p>
          <p className={styles.why}>
            <span className={styles.whyLabel}>Why: </span>
            {item.why}
          </p>
          {item.evidence.length > 0 ? <EvidenceList items={item.evidence} onOpen={onOpenEvidence} /> : null}
        </li>
      ))}
    </ul>
  );
}
