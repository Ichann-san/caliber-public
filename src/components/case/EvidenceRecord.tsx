import type { EvidenceRecordView } from "@/components/view-models";
import { ProvenanceLabel } from "@/components/ui/ProvenanceLabel";
import styles from "./EvidenceRecord.module.css";

export interface EvidenceRecordProps {
  record: EvidenceRecordView;
}

/** Drawer body for one evidence record: provenance, locator and the quoted source excerpt. */
export function EvidenceRecord({ record }: EvidenceRecordProps) {
  return (
    <article className={styles.record}>
      <div className={styles.labels}>
        <ProvenanceLabel label={record.provenance} />
        {record.classLabel ? <span className={styles.classLabel}>{record.classLabel}</span> : null}
      </div>

      <h3 className={styles.title}>{record.title}</h3>

      <dl className={styles.meta}>
        <div className={styles.row}>
          <dt>Location in source</dt>
          <dd className={styles.locator}>{record.locator}</dd>
        </div>
        <div className={styles.row}>
          <dt>Evidence ID</dt>
          <dd className={styles.id}>{record.id}</dd>
        </div>
      </dl>

      <figure className={styles.excerpt}>
        <figcaption className={styles.caption}>Source excerpt</figcaption>
        <blockquote className={styles.quote}>{record.body}</blockquote>
      </figure>
    </article>
  );
}
