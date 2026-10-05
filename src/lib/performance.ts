import type { CaseListItem, PerformanceAsset, PerformanceSnapshot } from "@contracts/v1";
import published from "@/data/performance-v1.json";

const snapshot = published as unknown as PerformanceSnapshot;

/** This publication contains five distinct asset windows, never a plant total. */
export function performanceForCases(cases: Pick<CaseListItem, "tag" | "sourceIncidentId" | "occurredAt">[]): PerformanceSnapshot {
  const assets = snapshot.assets.filter(asset => cases.some(item => assetForCase([asset], item)));
  const visibleTags = new Set(assets.map(asset => asset.tag));
  const sourceGroups = snapshot.sourceGroups.map(group => ({
    ...group,
    sourceIds: group.sourceIds.filter(id =>
      group.id === "incident" ? cases.length > 0 : [...visibleTags].some(tag => id.includes(tag)),
    ),
  }));
  return { ...snapshot, assets, sourceGroups };
}

/** Tag and occurrence window permit contextual navigation, not a causal claim. */
export function assetForCase(
  assets: PerformanceAsset[],
  item: Pick<CaseListItem, "tag" | "occurredAt" | "sourceIncidentId">,
): PerformanceAsset | null {
  if (!item.sourceIncidentId || !item.tag || !item.occurredAt.value ||
      !["date", "timestamp"].includes(item.occurredAt.precision)) return null;
  const date = item.occurredAt.value.slice(0, 10);
  return assets.find(asset => asset.tag === item.tag &&
    date >= asset.windowStart.slice(0, 10) && date <= asset.windowEnd.slice(0, 10)) ?? null;
}
