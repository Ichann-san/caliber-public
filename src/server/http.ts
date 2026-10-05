import type { CaseDetail } from "@contracts/v1";
import { CONTRACT_VERSION } from "@contracts/v1";
import { ApiFault, demand } from "./errors";
import { allCases, insertCase, mutateCase, referenceData } from "./repository";
import { listItem, present, queryParams, summary, timeline, visibleCases } from "./queries";
import { authorize, createAction, createCase, record, transition, updateAction, updateCase } from "./mutations";
import { body, parse, createSchema, updateSchema, transitionSchema, noteSchema, actionSchema, actionUpdateSchema } from "./validation";
import { permissionsFor } from "@contracts/access";
import { performanceForCases } from "@/lib/performance";

const headers = { "Cache-Control": "no-store", "Vary": "X-Demo-User-Id" };
function success(data: unknown, status = 200) {
  return Response.json({ data, meta: { contractVersion: CONTRACT_VERSION, baselineId: "B1", dataMode: "api" } }, { status, headers });
}
export async function handle(request: Request, path: string[]): Promise<Response> {
  try {
    const refs = await referenceData();
    const method = request.method, name = path[0];
    if (name === "personas" && path.length === 1 && method === "GET") return success(refs.users);
    const user = refs.users.find(u => u.id === request.headers.get("X-Demo-User-Id"));
    demand(user, 401, "PERSONA_REQUIRED", "Select a valid role.");
    if (name === "me" && path.length === 1 && method === "GET") return success(user);
    if (name === "reference-data" && path.length === 1 && method === "GET") {
      // New demo reports can introduce new plant/mechanism names; filters must accept them.
      const cases = await allCases();
      const own = cases.filter(c => {
        try { authorize(c, user); return true; } catch { return false; }
      });
      return success({ ...refs, plants: [...new Set([...refs.plants, ...own.flatMap(c => c.plant ? [c.plant] : [])])].sort(),
        mechanisms: [...new Set([...refs.mechanisms, ...own.flatMap(c => c.mechanism ? [c.mechanism] : [])])].sort() });
    }
    if (method === "GET" && path.length === 1 && ["cases", "summary", "timeline", "performance"].includes(name)) {
      const items = await allCases();
      const readable = items.filter(c => { try { authorize(c, user); return true; } catch { return false; } });
      const filterRefs = { ...refs, plants: [...new Set([...refs.plants, ...readable.flatMap(c => c.plant ? [c.plant] : [])])],
        mechanisms: [...new Set([...refs.mechanisms, ...readable.flatMap(c => c.mechanism ? [c.mechanism] : [])])] };
      const q = queryParams(new URL(request.url), filterRefs, name !== "cases");
      const filtered = visibleCases(items, user, q);
      if (name === "summary") return success(summary(filtered));
      if (name === "performance") return success(performanceForCases(filtered));
      if (name === "timeline") return success(timeline(filtered));
      const page = q.page ?? 1, pageSize = q.pageSize ?? 10;
      return success({ items: filtered.slice((page - 1) * pageSize, page * pageSize).map(c => listItem(c, user)), page, pageSize, total: filtered.length });
    }
    if (name === "cases" && method === "POST" && path.length === 1) {
      const item = createCase(parse(createSchema, await body(request)), user, refs);
      await insertCase(item);
      return success(present(item, user), 201);
    }
    if (name === "cases" && path.length === 2 && method === "GET") {
      const item = (await allCases()).find(c => c.id === path[1]);
      demand(item, 404, "NOT_FOUND", "Case not found."); authorize(item, user);
      return success(present(item, user));
    }
    let change: ((item: CaseDetail) => void) | undefined;
    let resultStatus = 200;
    if (name === "cases" && path.length === 2 && method === "PATCH") {
      const input = parse(updateSchema, await body(request));
      change = item => updateCase(item, input, user, refs);
    } else if (name === "cases" && path.length === 3 && path[2] === "transitions" && method === "POST") {
      const input = parse(transitionSchema, await body(request)); change = item => transition(item, input, user);
    } else if (name === "cases" && path.length === 3 && path[2] === "notes" && method === "POST") {
      const input = parse(noteSchema, await body(request)); resultStatus = 201;
      change = item => { authorize(item, user); demand(permissionsFor(user, item).canAddNote, 403, "FORBIDDEN", "Notes are not permitted."); record(item, user, "note", input.text); };
    } else if (name === "cases" && path.length === 3 && path[2] === "actions" && method === "POST") {
      const input = parse(actionSchema, await body(request)); resultStatus = 201; change = item => createAction(item, input, user);
    } else if (name === "cases" && path.length === 4 && path[2] === "actions" && method === "PATCH") {
      const input = parse(actionUpdateSchema, await body(request)); change = item => updateAction(item, path[3], input, user);
    }
    if (change) return success(present(await mutateCase(path[1], change), user), resultStatus);
    throw new ApiFault(404, "NOT_FOUND", "API route not found.");
  } catch (error) {
    if (error instanceof ApiFault) return Response.json({ error: { code: error.code, message: error.message, ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}) } }, { status: error.status, headers });
    const code = (error as { code?: string })?.code;
    const unavailable = (code && (["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "28P01", "3D000", "42P01", "53300", "57P01"].includes(code) || code.startsWith("08")))
      || (error instanceof Error && /connection.*timeout|timeout.*connect/i.test(error.message));
    console.error("Backend request failed", { code: code ?? "unknown" });
    return Response.json({ error: { code: unavailable ? "SERVICE_UNAVAILABLE" : "INTERNAL_ERROR", message: unavailable ? "Database is unavailable. Start and seed the local database." : "The request could not be completed." } }, { status: unavailable ? 503 : 500, headers });
  }
}
