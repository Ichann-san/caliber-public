import type { PageHeaderProps } from "@/components/view-models";
import styles from "./PageHeader.module.css";

export type { PageHeaderProps };

/** Page title (the only h1), optional labels, description and actions. No eyebrow. */
export function PageHeader({ title, description, actions, meta }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {meta ? <div className={styles.meta}>{meta}</div> : null}
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
