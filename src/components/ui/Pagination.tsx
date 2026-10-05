"use client";

import { useId } from "react";
import type { PaginationProps } from "@/components/view-models";
import { Button } from "./Button";
import { SelectControl } from "./SelectControl";
import styles from "./Pagination.module.css";

export type { PaginationProps };

const DEFAULT_PAGE_SIZES = [5, 10, 20];

/** Controlled pagination: page size select, range text and previous/next. */
export function Pagination({ pagination, onPageChange, onPageSizeChange }: PaginationProps) {
  const sizeId = useId();
  const { page, pageSize, total } = pagination;
  const sizes = pagination.pageSizeOptions.length > 0 ? pagination.pageSizeOptions : DEFAULT_PAGE_SIZES;

  const safeSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / safeSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (current - 1) * safeSize + 1;
  const end = Math.min(total, current * safeSize);
  const rangeText = total === 0 ? "0 of 0" : `${start}-${end} of ${total}`;

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <div className={styles.size}>
        <label htmlFor={sizeId} className={styles.sizeLabel}>
          Rows per page
        </label>
        <SelectControl
          id={sizeId}
          className={styles.select}
          value={String(pageSize)}
          options={sizes.map(size => ({ value: String(size), label: String(size) }))}
          onChange={value => onPageSizeChange(Number(value))}
        />
      </div>

      <p className={styles.range} aria-live="polite">
        {rangeText}
        <span className="sr-only">
          {`, page ${current} of ${totalPages}`}
        </span>
      </p>

      <div className={styles.steps}>
        <Button
          variant="secondary"
          size="sm"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={current >= totalPages}
          onClick={() => onPageChange(current + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
