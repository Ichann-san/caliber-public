/**
 * Client data-mode configuration.
 *
 * NEXT_PUBLIC_DATA_SOURCE selects the adapter: "mock" (in-browser fixture
 * session) or "api" (fetch /api/v1). When unset or unrecognised the app uses
 * mock mode. There is never an automatic
 * fallback from api to mock.
 */

export type DataMode = "mock" | "api";

const RAW_MODE = process.env.NEXT_PUBLIC_DATA_SOURCE;

export const DATA_MODE: DataMode = RAW_MODE === "api" ? "api" : "mock";

export const API_BASE = "/api/v1";

/**
 * The four recommended demo personas. Mirrors fixture
 * `recommendedPersonaIds` (contracts/fixtures/demo-v1.json) so api mode does
 * not need to load the fixture. The mock adapter checks the two agree.
 */
export const RECOMMENDED_PERSONA_IDS = [
  "demo-manager-maintenance-rotating",
  "demo-engineer-maintenance-reliability",
  "demo-engineer-maintenance-static",
  "demo-unassigned",
] as const;

export const DEFAULT_PERSONA_ID: string = RECOMMENDED_PERSONA_IDS[0];

/** Shown after every successful mutation in mock mode. */
export const MOCK_SAVE_NOTICE = "Saved for this session only. Reloading clears these changes.";
