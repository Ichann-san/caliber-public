"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlusCircle } from "@phosphor-icons/react";
import { CaseCard } from "@/components/case";
import { Button, EmptyState, ErrorState, PageHeader, Pagination, SelectField } from "@/components/ui";
import type { CaseQuery } from "@contracts/v1";
import { toCaseCard } from "@/lib/client/mappers";
import { plural } from "@/lib/client/format";
import { CaseFilterBar } from "./CaseFilterBar";
import { filtersFromParams, toCaseFilters, type FilterState, type SortValue } from "./boardFilters";
import { useDataSource } from "./DataSourceProvider";
import { usePersona } from "./PersonaProvider";
import { ResetMockButton, errorBody, errorTitle } from "./notices";
import { BoardSkeleton } from "./skeletons";
import { useResult } from "./useResult";
import styles from "./layout.module.css";

const PAGE_SIZES = [5, 10, 20] as const;

function intParam(v: string | null, fallback: number): number {
  const n = v === null ? NaN : Number(v);
  return Number.isInteger(n) && n >= 1 ? n : fallback;
}

export function CaseBoardView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { source, mode } = useDataSource();
  const { personaId, persona, personasError, referenceData, ctx } = usePersona();

  const [filters, setFilters] = useState<FilterState>(() => filtersFromParams(new URLSearchParams(params.toString())));
  const [search, setSearch] = useState(filters.search); // debounced into filters
  const [sort, setSort] = useState<SortValue>(() => {
    const s = params.get("sort");
    return s === "updated_desc" || s === "occurred_desc" ? s : "priority";
  });
  const [page, setPage] = useState(() => intParam(params.get("page"), 1));
  const [pageSize, setPageSize] = useState<5 | 10 | 20>(() => {
    const n = intParam(params.get("pageSize"), 10);
    return (PAGE_SIZES as readonly number[]).includes(n) ? (n as 5 | 10 | 20) : 10;
  });

  useEffect(() => {
    if (search === filters.search) return;
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search }));
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search, filters.search]);

  const query: CaseQuery = useMemo(
    () => ({ ...toCaseFilters(filters), sort, page, pageSize }),
    [filters, sort, page, pageSize],
  );
  const queryKey = JSON.stringify(query);

  // Optional URL sync (replace, no scroll) so a board view can be shared or reloaded.
  useEffect(() => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === "") continue;
      if ((k === "page" && v === 1) || (k === "pageSize" && v === 10) || (k === "sort" && v === "priority")) continue;
      qs.set(k, String(v));
    }
    const next = qs.toString();
    if (next !== params.toString()) router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const isUnassigned = persona?.role === "unassigned";
  const { state, reload } = useResult(() => source.listCases(personaId, query), `${personaId}:${queryKey}`);

  const canCreate = persona?.role === "engineer";
  const header = (
    <PageHeader
      title="Case board"
      description="One card per case. Default view shows active cases, sorted by reviewed priority."
      actions={
        <div className={styles.actions}>
          {mode === "mock" ? <ResetMockButton /> : null}
          {canCreate ? (
            <Button as="a" href="/cases/new" variant="primary" icon={<PlusCircle size={20} weight="regular" />}>
              New case
            </Button>
          ) : null}
        </div>
      }
    />
  );

  if (!persona && !personasError) {
    return (
      <div className={styles.stack}>
        {header}
        <BoardSkeleton />
      </div>
    );
  }

  if (isUnassigned) {
    return (
      <div className={styles.stack}>
        {header}
        <EmptyState
          title="No assignment yet"
          body="This role has no assigned cases and cannot create case requests. Select another role to explore cases."
        />
      </div>
    );
  }

  const updateFilters = (next: FilterState) => {
    if (next.search !== filters.search) {
      setSearch(next.search);
      return;
    }
    setFilters(next);
    setPage(1);
  };

  const data = state.data;
  const cards = data ? data.items.map((item) => toCaseCard(ctx, item)) : [];

  return (
    <div className={styles.stack}>
      {header}

      <CaseFilterBar value={{ ...filters, search }} onChange={updateFilters} referenceData={referenceData}
        sort={sort} onSortChange={(next) => { setSort(next); setPage(1); }} />

      {state.status === "error" ? (
        <ErrorState title={errorTitle(state.error)} body={errorBody(state.error)} retry={reload} />
      ) : state.status === "loading" && !data ? (
        <BoardSkeleton />
      ) : data ? (
        <div className={styles.stackTight} aria-busy={state.status === "loading"}>
          <p className={styles.secondaryText} role="status">
            {plural(data.total, "case")} match. Showing page {data.page}.
          </p>
          {cards.length === 0 ? (
            data.total > 0 ? (
              <EmptyState
                title="This page is empty"
                body={`There are ${plural(data.total, "matching case")}, but page ${data.page} is past the end.`}
                action={<Button onClick={() => setPage(1)}>Go to page 1</Button>}
              />
            ) : (
              <EmptyState
                title="No cases match"
                body="No visible case matches these filters. Clear the search or choose another status."
                action={
                  <Button
                    onClick={() => {
                      setSearch("");
                      setFilters({ search: "", status: "active", divisionId: "", mechanism: "", plant: "", mlState: "", priorityReview: "" });
                      setPage(1);
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            )
          ) : (
            <ul className={styles.list}>
              {cards.map((card) => (
                <li key={card.id}>
                  <CaseCard card={card} />
                </li>
              ))}
            </ul>
          )}
          <Pagination
            pagination={{ page: data.page, pageSize: data.pageSize, total: data.total, pageSizeOptions: [...PAGE_SIZES] }}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize((PAGE_SIZES as readonly number[]).includes(size) ? (size as 5 | 10 | 20) : 10);
              setPage(1);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
