import Link from "next/link";
import type { CaseCardProps } from "@/components/view-models";
import { Metric } from "@/components/ui/Metric";
import { PersonChip } from "@/components/ui/PersonChip";
import { ProvenanceLabel } from "@/components/ui/ProvenanceLabel";
import { ReviewLabel } from "@/components/ui/ReviewLabel";
import { StatusLabel } from "@/components/ui/StatusLabel";
import styles from "./CaseCard.module.css";

export type { CaseCardProps };

/**
 * Board card. Left: identity. Right top: impact (each metric separate, never
 * summed). Right bottom: proposer and accountable owner. The title link
 * stretches over the whole card, so the card is one link and nothing inside
 * is separately interactive.
 */
export function CaseCard({ card }: CaseCardProps) {
  const { identity } = card;

  return (
    <article className={styles.card}>
      <div className={styles.identity}>
        <h2 className={styles.title}>
          <Link href={card.href} className={styles.link}>
            {card.title}
          </Link>
        </h2>

        <p className={styles.date} title={`Occurred ${card.dateDetailText}`}>
          <span className={styles.dateLabel}>Occurred</span> {card.dateText}
        </p>

        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Tag</dt>
            <dd className={styles.tag}>{identity.tag}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Component</dt>
            <dd>{identity.component}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Problem type</dt>
            <dd>{identity.mechanism}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Plant</dt>
            <dd>{identity.plant}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Division</dt>
            <dd>{identity.division ?? "Not recorded"}</dd>
          </div>
        </dl>
      </div>

      <div className={styles.right}>
        <div className={styles.impact}>
          <h3 className={styles.blockTitle}>Impact</h3>
          <div className={styles.metrics}>
            {card.impact.map((metric) => (
              <Metric key={metric.label} metric={metric} size="sm" />
            ))}
          </div>
          <div className={styles.labels} aria-label="Case status and insight">
            <span className={styles.displayId}>{card.displayId}</span>
            <StatusLabel status={card.status} />
            <ReviewLabel review={card.review} />
            <ProvenanceLabel label={card.insight} />
          </div>
        </div>

        <div className={styles.people}>
          <h3 className="sr-only">People</h3>
          <PersonChip person={card.proposer} />
          <PersonChip person={card.owner} />
        </div>
      </div>
    </article>
  );
}
