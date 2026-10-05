import type { ActivityItemView } from "@/components/view-models";
import styles from "./ActivityList.module.css";

export interface ActivityListProps {
  items: ActivityItemView[];
  /** Shown when there is no activity. */
  emptyText?: string;
}

/** Case activity in the order supplied. */
export function ActivityList({ items, emptyText = "No activity yet." }: ActivityListProps) {
  if (items.length === 0) return <p className={styles.empty}>{emptyText}</p>;

  return (
    <ol className={styles.list}>
      {items.map((item) => (
        <li key={item.id} className={styles.item}>
          <p className={styles.when}>
            <span className={styles.whenText}>{item.whenText}</span>
          </p>
          <p className={styles.text}>
            <span className={styles.actor}>{item.actor}</span> {item.text}
          </p>
        </li>
      ))}
    </ol>
  );
}
