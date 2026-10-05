import type { StatusView } from "@/components/view-models";
import styles from "./StatusLabel.module.css";

export interface StatusLabelProps {
  status: StatusView;
  className?: string;
}

/** Workflow status as text on a soft tone tint. Never colour alone. */
export function StatusLabel({ status, className }: StatusLabelProps) {
  const cls = [styles.label, styles[status.tone], className].filter(Boolean).join(" ");
  return <span className={cls}>{status.label}</span>;
}
