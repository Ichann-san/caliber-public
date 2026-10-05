import { TRANSITIONS, type User, type CaseDetail, type CaseListItem, type CasePermissions } from "./v1";

/** Shared demo policy for API implementation and FE mock adapter. */
export function canReadCase(user: User, item: CaseListItem): boolean {
  if (user.role === "unassigned") return false;
  if (user.role === "management") {
    return item.status !== "draft" && item.divisionIds.some(id => user.managedDivisionIds.includes(id));
  }
  return item.people.proposer.id === user.id || item.people.assignees.some(x => x.id === user.id);
}

export function permissionsFor(user: User, item: CaseDetail): CasePermissions {
  const visible = canReadCase(user, item);
  const manager = visible && user.role === "management";
  const proposer = visible && user.role === "engineer" && item.people.proposer.id === user.id;
  const assigned = visible && user.role === "engineer" && item.people.assignees.some(x => x.id === user.id);
  const live = ["investigating", "action_in_progress", "awaiting_verification"].includes(item.status);
  const actor = manager || (item.status === "draft" || item.status === "needs_revision" ? proposer : assigned);
  let allowed = actor ? [...(TRANSITIONS[item.status][user.role] ?? [])] : [];
  allowed = allowed.filter(to => {
    if (to === "investigating") return item.people.assignees.length > 0;
    if (to === "action_in_progress" && item.status === "investigating")
      return item.actions.some(a => ["approved", "in_progress"].includes(a.status));
    if (to === "awaiting_verification") return item.actions.length > 0 && item.actions.every(a => ["completed", "verified"].includes(a.status));
    if (to === "closed") return item.actions.length > 0 && item.actions.every(a => a.status === "verified") && item.conflicts.length === 0;
    return true;
  });
  return {
    canEdit: proposer && ["draft", "needs_revision"].includes(item.status),
    canAssign: manager && ["submitted", "investigating", "action_in_progress"].includes(item.status),
    canAddNote: live && (manager || assigned),
    canDraftAction: ["investigating", "action_in_progress"].includes(item.status) && (manager || assigned),
    canReviewAction: manager && ["investigating", "action_in_progress", "awaiting_verification"].includes(item.status),
    allowedTransitions: allowed,
  };
}
