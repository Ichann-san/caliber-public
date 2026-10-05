import { CheckCircle, Info, Warning, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { InlineNoticeProps, Tone } from "@/components/view-models";
import styles from "./InlineNotice.module.css";

export type { InlineNoticeProps };

const ALERT_TONES: Tone[] = ["attention", "warning"];

function ToneIcon({ tone }: { tone: Tone }) {
  const common = { size: 20, weight: "regular" as const, "aria-hidden": true, className: styles.icon };
  if (tone === "success") return <CheckCircle {...common} />;
  if (tone === "attention") return <WarningCircle {...common} />;
  if (tone === "warning") return <Warning {...common} />;
  return <Info {...common} />;
}

/**
 * Inline message on a soft tone tint. Text always names the state; the
 * icon only supports it. Attention and warning are announced as alerts.
 */
export function InlineNotice({ tone, title, body, action }: InlineNoticeProps) {
  const role = ALERT_TONES.includes(tone) ? "alert" : "status";

  return (
    <div className={`${styles.notice} ${styles[tone]}`} role={role}>
      <ToneIcon tone={tone} />
      <div className={styles.content}>
        <p className={styles.title}>{title}</p>
        {body ? <div className={styles.body}>{body}</div> : null}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
