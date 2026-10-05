import { Pool } from "pg";
import { ApiFault } from "./errors";
const shared = globalThis as unknown as { caliberPool?: Pool };
export function database(): Pool {
  if (!process.env.DATABASE_URL) throw new ApiFault(503, "SERVICE_UNAVAILABLE", "Database has not been configured.");
  if (!shared.caliberPool) {
    shared.caliberPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 3000 });
    shared.caliberPool.on("error", () => console.error("PostgreSQL idle connection failed."));
  }
  return shared.caliberPool;
}
