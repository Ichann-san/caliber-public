import type { CaseDetail, ReferenceData } from "@contracts/v1";
import { database } from "./db";
import { ApiFault } from "./errors";

export async function referenceData(): Promise<ReferenceData> {
  const result = await database().query("SELECT document FROM caliber_reference WHERE id = 'B1'");
  if (!result.rowCount) throw new ApiFault(503, "SERVICE_UNAVAILABLE", "Database seed is not installed.");
  return result.rows[0].document;
}
export async function allCases(): Promise<CaseDetail[]> {
  const result = await database().query("SELECT document FROM caliber_case ORDER BY id");
  return result.rows.map(row => row.document);
}
export async function insertCase(item: CaseDetail): Promise<void> {
  await database().query("INSERT INTO caliber_case(id, document) VALUES ($1, $2::jsonb)", [item.id, JSON.stringify(item)]);
}
/** Serialize each case mutation; its workflow and embedded audit log commit together. */
export async function mutateCase(id: string, change: (item: CaseDetail) => void): Promise<CaseDetail> {
  const client = await database().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("SELECT document FROM caliber_case WHERE id=$1 FOR UPDATE", [id]);
    if (!result.rowCount) throw new ApiFault(404, "NOT_FOUND", "Case not found.");
    const item: CaseDetail = result.rows[0].document;
    change(item);
    await client.query("UPDATE caliber_case SET document=$2::jsonb WHERE id=$1", [id, JSON.stringify(item)]);
    await client.query("COMMIT");
    return item;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
