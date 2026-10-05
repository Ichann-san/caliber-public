/**
 * Defense-in-depth display guard for the pump-only reference rule.
 *
 * The backend enforces suppression. The FE additionally never offers a
 * reference whose evidence includes PU-2101B-002 unless eqType is exactly
 * "PU". Null (unknown) equipment type counts as not PU. The tag prefix is
 * never used to guess the equipment type.
 */

import type { ActionReference, CaseDetail, SuppressedAction } from "@contracts/v1";

export const SUPPRESSION_EVIDENCE_ID = "PU-2101B-002";
export const SUPPRESSION_RULE_ID = "HR-PU-2101B-002";
export const SUPPRESSION_REASON =
  "Pump-specific reference withheld: equipment type is not PU or is unknown.";

export function isSuppressedReference(ref: Pick<ActionReference, "evidenceIds">, eqType: string | null): boolean {
  return ref.evidenceIds.includes(SUPPRESSION_EVIDENCE_ID) && eqType !== "PU";
}

export interface WithheldReference {
  id: string;
  /** Present when the reference text is known (guard-caught references). */
  text: string | null;
  reason: string;
  ruleId: string;
}

export interface PartitionedReferences {
  offered: ActionReference[];
  withheld: WithheldReference[];
}

/**
 * Splits a case's action references into those that may be offered (still
 * requiring applicability review) and those withheld by the safety rule,
 * merging the server's suppressedActions list with the local guard.
 */
export function partitionReferences(
  detail: Pick<CaseDetail, "actionReferences" | "suppressedActions" | "eqType">,
): PartitionedReferences {
  const serverSuppressed = new Map<string, SuppressedAction>(detail.suppressedActions.map((s) => [s.id, s]));
  const offered: ActionReference[] = [];
  const withheld: WithheldReference[] = [];
  const seen = new Set<string>();

  for (const ref of detail.actionReferences) {
    const server = serverSuppressed.get(ref.id);
    if (server || isSuppressedReference(ref, detail.eqType)) {
      withheld.push({
        id: ref.id,
        text: ref.text,
        reason: server?.reason ?? SUPPRESSION_REASON,
        ruleId: server?.ruleId ?? SUPPRESSION_RULE_ID,
      });
      seen.add(ref.id);
    } else {
      offered.push(ref);
    }
  }

  for (const s of detail.suppressedActions) {
    if (seen.has(s.id)) continue;
    withheld.push({ id: s.id, text: null, reason: s.reason, ruleId: s.ruleId });
  }

  return { offered, withheld };
}

/** References that may appear in the action-draft reference picker. */
export function offerableReferences(
  detail: Pick<CaseDetail, "actionReferences" | "suppressedActions" | "eqType">,
): ActionReference[] {
  return partitionReferences(detail).offered;
}
