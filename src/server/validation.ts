import { z } from "zod";
import { ApiFault } from "./errors";
export const text = z.string().trim().min(1).max(4000);
const short = z.string().trim().max(120).nullable().transform(v => v || null);
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(v + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "Invalid calendar date").nullable();
const id = z.string().min(1).max(240);
const ids = z.array(id).max(100).refine(v => new Set(v).size === v.length, "Duplicate IDs");
const version = z.number().int().positive();
export const status = z.enum(["draft", "submitted", "needs_revision", "investigating", "action_in_progress", "awaiting_verification", "closed"]);
const caseFields = {
  title: z.string().trim().min(1).max(160), description: text, occurredAt: date,
  tag: short, component: short, mechanism: short, plant: short, relatedDivisionIds: ids,
};
export const createSchema = z.strictObject(caseFields);
export const updateSchema = z.strictObject({ ...createSchema.partial().shape,
  expectedVersion: version, assigneeIds: ids.optional(), priority: z.enum(["high", "medium", "low"]).optional(),
});
export const transitionSchema = z.strictObject({ expectedVersion: version, to: status, note: text });
export const noteSchema = z.strictObject({ text });
export const actionSchema = z.strictObject({ title: caseFields.title, description: text, referenceId: id.nullable(), evidenceIds: ids, assigneeId: id.nullable(), dueDate: date });
export const actionUpdateSchema = z.strictObject({ expectedCaseVersion: version,
  status: z.enum(["draft", "approved", "in_progress", "completed", "verified"]).optional(),
  title: caseFields.title.optional(), description: text.optional(), assigneeId: id.nullable().optional(), dueDate: date.optional(),
  applicabilityReview: text.optional(), completionNote: text.optional(), verificationNote: text.optional(), evidenceIds: ids.optional(),
});
export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields: Record<string, string[]> = {};
    for (const issue of result.error.issues) (fields[issue.path.join(".") || "body"] ??= []).push(issue.message);
    throw new ApiFault(400, "VALIDATION_ERROR", "Review the highlighted fields.", fields);
  }
  return result.data;
}
export async function body(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new ApiFault(400, "VALIDATION_ERROR", "Expected application/json.");
  const raw = await request.text();
  if (raw.length > 65536) throw new ApiFault(400, "VALIDATION_ERROR", "Request is too large.");
  try { return JSON.parse(raw); } catch { throw new ApiFault(400, "VALIDATION_ERROR", "Invalid JSON."); }
}
