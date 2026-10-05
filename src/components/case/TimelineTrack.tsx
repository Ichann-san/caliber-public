"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { TimelineEventView, TimelineLaneView } from "@/components/view-models";
import styles from "./TimelineTrack.module.css";

export interface TimelineTrackProps {
  lanes: TimelineLaneView[];
  /** Accessible name of the scroll region. Defaults to "Case timeline". */
  label?: string;
  /** Shown when no lane has a dated event. */
  emptyText?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PX_PER_MONTH = 72;
const MIN_TRACK_PX = 480;
const LABEL_ROOM_PX = 240; // room to the right of the last marker for its text
const ROW_PX = 32;

interface PlacedEvent {
  event: TimelineEventView;
  time: number;
}

interface Tick {
  key: string;
  pct: number;
  label: string;
  major: boolean;
}

function parseTime(iso: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function monthStart(year: number, month: number): number {
  return Date.UTC(year, month, 1);
}

/**
 * Horizontal date axis with one lane per case. Only events with a real date
 * are placed; no date is invented. Source and demo events differ by marker
 * shape (solid square vs dashed diamond) and by a text label. The axis
 * scrolls inside its own container; the page never scrolls horizontally.
 */
export function TimelineTrack({
  lanes,
  label = "Case timeline",
  emptyText = "No dated events to show.",
}: TimelineTrackProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const axisRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const captionId = useId();

  const model = useMemo(() => {
    const placed = new Map<string, PlacedEvent[]>();
    let min = Infinity;
    let max = -Infinity;

    for (const lane of lanes) {
      const events: PlacedEvent[] = [];
      for (const event of lane.events) {
        const time = parseTime(event.dateISO);
        if (time === null) continue;
        events.push({ event, time });
        if (time < min) min = time;
        if (time > max) max = time;
      }
      events.sort((a, b) => a.time - b.time);
      placed.set(lane.id, events);
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

    const minDate = new Date(min);
    const maxDate = new Date(max);
    const startYear = minDate.getUTCFullYear();
    const startMonth = minDate.getUTCMonth();
    const start = monthStart(startYear, startMonth);
    const end = monthStart(maxDate.getUTCFullYear(), maxDate.getUTCMonth() + 1);
    const months =
      (maxDate.getUTCFullYear() - startYear) * 12 + (maxDate.getUTCMonth() - startMonth) + 1;
    const span = end - start;

    const step = months > 60 ? 12 : months > 24 ? 3 : 1;
    const ticks: Tick[] = [];
    for (let i = 0; i <= months; i += 1) {
      const year = startYear + Math.floor((startMonth + i) / 12);
      const month = (startMonth + i) % 12;
      const isJan = month === 0;
      if (i % step !== 0 && !isJan) continue;
      if (step === 12 && !isJan && i !== 0) continue;
      const t = monthStart(year, month);
      ticks.push({
        key: `${year}-${month}`,
        pct: ((t - start) / span) * 100,
        label: step === 12 || isJan || i === 0 ? `${MONTHS[month]} ${year}` : MONTHS[month],
        major: isJan,
      });
    }

    const trackPx = Math.max(MIN_TRACK_PX, months * PX_PER_MONTH);
    const pct = (time: number) => ((time - start) / span) * 100;

    return { placed, ticks, trackPx, pct };
  }, [lanes]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [model]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const axis = axisRef.current;
    if (!scroller || !axis || !model) return;

    const measureGuides = () => {
      const axisTop = axis.getBoundingClientRect().top;
      scroller.querySelectorAll<HTMLElement>("[data-source-event]").forEach((event) => {
        const rect = event.getBoundingClientRect();
        const markerCenter = rect.top + rect.height / 2;
        event.style.setProperty("--source-guide-height", `${Math.max(0, markerCenter - axisTop)}px`);
      });
    };

    measureGuides();
    const observer = new ResizeObserver(measureGuides);
    observer.observe(scroller);
    observer.observe(axis);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    void document.fonts?.ready.then(measureGuides);
    return () => observer.disconnect();
  }, [model, lanes]);

  const legend = (
    <ul className={styles.legend} aria-label="Legend">
      <li className={styles.legendItem}>
        <span className={`${styles.marker} ${styles.markerSource}`} aria-hidden="true" />
        Source date
      </li>
      <li className={styles.legendItem}>
        <span className={`${styles.marker} ${styles.markerDemo}`} aria-hidden="true" />
        Action date (planned)
      </li>
    </ul>
  );

  const totalUndated = lanes.reduce((sum, lane) => sum + (lane.undatedCount ?? 0), 0);

  if (!model) {
    return (
      <div className={styles.timeline}>
        {legend}
        <p className={styles.empty}>
          {emptyText}
          {totalUndated > 0
            ? ` ${totalUndated} ${totalUndated === 1 ? "event has" : "events have"} no recorded date.`
            : null}
        </p>
      </div>
    );
  }

  const canvasStyle = {
    "--track-px": `${model.trackPx}px`,
    "--label-room": `${LABEL_ROOM_PX}px`,
  } as CSSProperties;

  return (
    <div className={styles.timeline}>
      <div className={styles.topRow}>
        {legend}
        <p
          id={captionId}
          className={[styles.caption, overflowing ? styles.captionVisible : undefined]
            .filter(Boolean)
            .join(" ")}
        >
          Scroll horizontally to see the full range
        </p>
      </div>

      <div
        ref={scrollerRef}
        className={styles.scroller}
        role="region"
        aria-label={label}
        aria-describedby={captionId}
        tabIndex={0}
      >
        <div className={styles.canvas} style={canvasStyle}>
          <div ref={axisRef} className={styles.axisRow} aria-hidden="true">
            <div className={styles.corner}>Case</div>
            <div className={styles.axis}>
              {model.ticks.map((tick) => (
                <span
                  key={tick.key}
                  className={[styles.tick, tick.major ? styles.tickMajor : undefined]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ left: `${tick.pct}%` }}
                >
                  {tick.label}
                </span>
              ))}
            </div>
          </div>

          <ul className={styles.lanes}>
            {lanes.map((lane) => {
              const events = model.placed.get(lane.id) ?? [];
              const undated = lane.undatedCount ?? 0;
              const rows = Math.max(1, events.length) + (undated > 0 ? 1 : 0);
              return (
                <li key={lane.id} className={styles.lane}>
                  <div className={styles.laneTitle}>
                    <Link href={lane.href} className={styles.laneLink}>
                      {lane.title}
                    </Link>
                  </div>
                  <div className={styles.track} style={{ height: `${rows * ROW_PX + 8}px` }}>
                    {model.ticks.map((tick) => (
                      <span
                        key={tick.key}
                        className={[styles.grid, tick.major ? styles.gridMajor : undefined]
                          .filter(Boolean)
                          .join(" ")}
                        style={{ left: `${tick.pct}%` }}
                        aria-hidden="true"
                      />
                    ))}
                    {undated > 0 ? (
                      <p
                        className={styles.undatedNote}
                        style={{ top: `${Math.max(1, events.length) * ROW_PX + 4}px` }}
                      >
                        {undated === 1
                          ? "1 event without a recorded date (not shown on the axis)"
                          : `${undated} events without a recorded date (not shown on the axis)`}
                      </p>
                    ) : null}
                    {events.length === 0 ? (
                      <p className={styles.noEvents}>No dated events</p>
                    ) : (
                      <ol className={styles.events}>
                        {events.map(({ event, time }, index) => {
                          const isDemo = event.kind === "demo";
                          const tooltipId = `${captionId}-${event.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
                          return (
                            <li
                              key={event.id}
                              className={styles.event}
                              data-source-event={!isDemo ? "" : undefined}
                              style={{ left: `${model.pct(time)}%`, top: `${index * ROW_PX + 4}px` }}
                            >
                              {!isDemo ? <span className={styles.sourceGuide} aria-hidden="true" /> : null}
                              {isDemo ? (
                                <>
                                  <span className={`${styles.marker} ${styles.markerDemo}`} aria-hidden="true" />
                                  <span className={styles.kindDemo}>Planned</span>
                                  <span className={styles.eventLabel}>{event.label}</span>
                                  <time className={styles.eventDate} dateTime={event.dateISO}>{event.dateText}</time>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className={styles.sourceMarkerButton}
                                  aria-label={`${event.label}: ${event.dateText}`}
                                  aria-describedby={activeSourceId === event.id ? tooltipId : undefined}
                                  aria-expanded={activeSourceId === event.id}
                                  onClick={() => setActiveSourceId(current => current === event.id ? null : event.id)}
                                  onBlur={() => setActiveSourceId(current => current === event.id ? null : current)}
                                >
                                  <span className={`${styles.marker} ${styles.markerSource}`} aria-hidden="true" />
                                  <span id={tooltipId} role="tooltip" className={[styles.sourceTooltip, activeSourceId === event.id ? styles.sourceTooltipOpen : undefined].filter(Boolean).join(" ")}>
                                    <strong>{event.dateText}</strong>
                                    <span>{event.label}</span>
                                  </span>
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
