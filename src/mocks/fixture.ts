/**
 * Fixture loader for contracts/fixtures/demo-v1.json.
 *
 * The JSON (about 2 MB) is loaded with a dynamic import so it is a separate
 * chunk, fetched only when the mock adapter first needs data. Callers must
 * deep-clone before mutating; the loaded module object is shared.
 */

import type { ApiMeta, CaseDetail, ID, ReferenceData } from "@contracts/v1";

export interface DemoFixture {
  meta: ApiMeta;
  fixtureNotes: string[];
  sourceSha256: Record<string, string>;
  recommendedPersonaIds: ID[];
  referenceData: ReferenceData;
  cases: CaseDetail[];
}

let pending: Promise<DemoFixture> | null = null;

export function loadFixture(): Promise<DemoFixture> {
  if (!pending) {
    pending = import("@contracts/fixtures/demo-v1.json").then(
      (mod) => ((mod as { default?: unknown }).default ?? mod) as unknown as DemoFixture,
    );
    pending.catch(() => {
      pending = null;
    });
  }
  return pending;
}
