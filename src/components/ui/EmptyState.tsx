import type { EmptyStateProps } from "@/components/view-models";
import styles from "./EmptyState.module.css";

export type { EmptyStateProps };

/** Nothing to show yet, with an optional next step. */
export function EmptyState({ title, body, action, headingLevel = 2 }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <div className={styles.empty}>
      <Heading className={styles.title}>{title}</Heading>
      {body ? <p className={styles.body}>{body}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
