"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createApiDataSource } from "@/lib/client/apiDataSource";
import { DATA_MODE, MOCK_SAVE_NOTICE, type DataMode } from "@/lib/client/config";
import type { DataSource } from "@/lib/client/dataSource";
import { createMockDataSource } from "@/lib/client/mockDataSource";

interface DataSourceContextValue {
  source: DataSource;
  mode: DataMode;
  /** Text for the notice shown after a successful mutation. */
  saveNotice: string;
}

const DataSourceContext = createContext<DataSourceContextValue | null>(null);

let singleton: DataSource | null = null;
function getDataSource(): DataSource {
  // One adapter per browser tab so the mock session survives client navigation.
  if (!singleton) singleton = DATA_MODE === "api" ? createApiDataSource() : createMockDataSource();
  return singleton;
}

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const value = useMemo<DataSourceContextValue>(
    () => ({
      source: getDataSource(),
      mode: DATA_MODE,
      saveNotice: DATA_MODE === "mock" ? MOCK_SAVE_NOTICE : "Changes saved.",
    }),
    [],
  );
  return <DataSourceContext.Provider value={value}>{children}</DataSourceContext.Provider>;
}

export function useDataSource(): DataSourceContextValue {
  const value = useContext(DataSourceContext);
  if (!value) throw new Error("useDataSource must be used inside DataSourceProvider");
  return value;
}
