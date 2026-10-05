import type { ReviewView } from "@/components/view-models";
import styles from "./ReviewLabel.module.css";

export interface ReviewLabelProps {
  review: ReviewView;
  className?: string;
}

const UNREVIEWED_TEXT = "Not yet reviewed";

/** Priority review state. Unreviewed always reads "Not yet reviewed". */
export function ReviewLabel({ review, className }: ReviewLabelProps) {
  const text = review.reviewed ? review.label : UNREVIEWED_TEXT;
  const cls = [styles.label, review.reviewed ? styles.reviewed : styles.unreviewed, className]
    .filter(Boolean)
    .join(" ");
  return <span className={cls}>{text}</span>;
}
