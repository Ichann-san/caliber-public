/** Display formatting. ASCII only; no dates are invented or re-zoned. */

import type { SourceDate } from "@contracts/v1";

const COMPACT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** At most three digits before the decimal point and two after it. */
export function formatCompactNumber(value: number): string {
  const suffixes = ["", "k", "m", "b", "t"];
  let scaled = value;
  let unit = 0;
  while (Math.abs(scaled) >= 1000 && unit < suffixes.length - 1) {
    scaled /= 1000;
    unit += 1;
  }
  if (Math.abs(Number(COMPACT.format(scaled).replaceAll(",", ""))) >= 1000 && unit < suffixes.length - 1) {
    scaled /= 1000;
    unit += 1;
  }
  return `${COMPACT.format(scaled)}${suffixes[unit]}`;
}

/** Input is recorded kUSD; output uses a dollar sign and a compact USD scale. */
export function formatCompactKusd(value: number): string {
  return `$${formatCompactNumber(value * 1000)}`;
}

/** Money supplied in kUSD, displayed as compact USD with a dollar sign. */
export function formatKusd(value: number | null): string | null {
  return value === null || !Number.isFinite(value) ? null : formatCompactKusd(value);
}

/** Hours with the shared compact-number rule; null stays null (never 0). */
export function formatHours(value: number | null): string | null {
  return value === null || !Number.isFinite(value) ? null : formatCompactNumber(value);
}

/** Relative age for an ISO calendar date; unparseable source text stays unchanged. */
export function formatRelativeDate(value: string | null, now = new Date()): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return value;
  const days = Math.max(0, Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - date.getTime()) / 86_400_000));
  if (days < 14) return `${days} ${days === 1 ? "day" : "days"} ago`;
  if (days < 56) {
    const weeks = Math.floor(days / 7);
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  }
  const months = Math.max(1, Math.floor(days / 30.4375));
  if (months < 24) return `${months} ${months === 1 ? "month" : "months"} ago`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

export const NOT_RECORDED = "Not recorded";
export const DATE_NOT_RECORDED = "Date not recorded";

/** Source dates are shown exactly as given (source_text raw). */
export function formatSourceDate(date: SourceDate): string {
  if (!date.value) return DATE_NOT_RECORDED;
  return date.value;
}

/**
 * Demo/system timestamps (ISO 8601 with offset) as "YYYY-MM-DD HH:mm +07:00"
 * or "... UTC". String-based: the clock and offset are kept as supplied.
 */
export function formatDemoTimestamp(iso: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/.exec(iso);
  if (!m) return iso;
  const zone = m[3] === "Z" ? "UTC" : (m[3] ?? "");
  return `${m[1]} ${m[2]}${zone ? ` ${zone}` : ""}`;
}

export function initials(name: string): string {
  const words = name
    .replace(/\(.*?\)/g, "")
    .split(/[\s-]+/)
    .filter((w) => /^[A-Za-z]/.test(w));
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/** Short, traceable evidence label: the ID without the shared dataset prefix. */
export function shortEvidenceId(id: string): string {
  return id.replace(/^caliber2026-case2:/, "");
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
