import { Skeleton } from "@/components/ui";
import styles from "./layout.module.css";

/** Loading placeholders; the region is marked busy with a text status. */
export function BoardSkeleton() {
  return (
    <div className={styles.stack} aria-busy="true">
      <p className="sr-only" role="status">
        Loading cases
      </p>
      <Skeleton variant="line" width="12rem" />
      <Skeleton variant="block" height="4.5rem" />
      <div className={styles.list}>
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    </div>
  );
}

export function PageSkeleton({ label }: { label: string }) {
  return (
    <div className={styles.stack} aria-busy="true">
      <p className="sr-only" role="status">
        {label}
      </p>
      <Skeleton variant="line" width="16rem" />
      <Skeleton variant="line" lines={2} />
      <Skeleton variant="block" height="10rem" />
      <Skeleton variant="block" height="14rem" />
    </div>
  );
}
