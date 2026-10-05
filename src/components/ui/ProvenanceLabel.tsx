import type { ProvenanceLabelView } from "@/components/view-models";
import styles from "./ProvenanceLabel.module.css";

export interface ProvenanceLabelProps {
  label: ProvenanceLabelView;
  className?: string;
}

/**
 * Where information comes from (Source, Demo, Rules, ML, Assumed, Not available).
 * Outlined chip so it never reads as a workflow status. The optional `title`
 * is exposed as a tooltip and as screen-reader text.
 */
export function ProvenanceLabel({ label, className }: ProvenanceLabelProps) {
  if (label.kind === "demo") return null;
  const cls = [styles.label, styles[label.kind], className].filter(Boolean).join(" ");
  return (
    <span className={cls} title={label.title}>
      {label.text}
      {label.title ? <span className="sr-only">: {label.title}</span> : null}
    </span>
  );
}
