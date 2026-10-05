import Image from "next/image";
import type { PersonView } from "@/components/view-models";
import styles from "./PersonChip.module.css";

export interface PersonChipProps {
  person: PersonView;
  className?: string;
  showRole?: boolean;
}

const DEFAULT_MISSING = "Not assigned";

/** A person whose role can be shown here or by a surrounding group heading. */
export function PersonChip({ person, className, showRole = true }: PersonChipProps) {
  const isMissing = !person.name;

  return (
    <div className={[styles.person, className].filter(Boolean).join(" ")}>
      {showRole ? <span className={styles.role}>{person.roleLabel}</span> : null}
      <div className={styles.body}>
        {person.avatarSrc && !isMissing ? (
          <Image className={styles.avatar} src={person.avatarSrc} alt="" width={32} height={32} />
        ) : person.initials && !isMissing ? (
          <span className={styles.initials} aria-hidden="true">
            {person.initials}
          </span>
        ) : null}
        <div className={styles.text}>
          <span className={styles.nameLine}>
            <span className={isMissing ? styles.missing : styles.name}>
              {isMissing ? (person.missingText ?? DEFAULT_MISSING) : person.name}
            </span>
          </span>
          {person.division ? <span className={styles.detail}>{person.division}</span> : null}
        </div>
      </div>
    </div>
  );
}
