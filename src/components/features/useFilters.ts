"use client";

import { useEffect, useState } from "react";
import { EMPTY_FILTERS, type FilterState } from "./boardFilters";

/**
 * Filter state with a debounced search: `input` drives the controls and
 * `filters` (search committed after 250 ms) drives data loading.
 */
export function useFilters(initial: FilterState = EMPTY_FILTERS) {
  const [filters, setFilters] = useState<FilterState>(initial);
  const [search, setSearch] = useState(initial.search);

  useEffect(() => {
    if (search === filters.search) return;
    const t = setTimeout(() => setFilters((f) => ({ ...f, search })), 250);
    return () => clearTimeout(t);
  }, [search, filters.search]);

  const input: FilterState = { ...filters, search };
  const onChange = (next: FilterState) => {
    if (next.search !== search) setSearch(next.search);
    else setFilters({ ...next, search: filters.search });
  };

  return { filters, input, onChange };
}
