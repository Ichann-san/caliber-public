"use client";

import type { ErrorStateProps } from "@/components/view-models";
import { Button } from "./Button";
import styles from "./ErrorState.module.css";

export type { ErrorStateProps };

/** A failure that names the problem and, when possible, offers a retry. */
export function ErrorState({ title, body, retry, headingLevel = 2 }: ErrorStateProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <div className={styles.error} role="alert">
      <Heading className={styles.title}>{title}</Heading>
      {body ? <p className={styles.body}>{body}</p> : null}
      {retry ? (
        <div className={styles.action}>
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
