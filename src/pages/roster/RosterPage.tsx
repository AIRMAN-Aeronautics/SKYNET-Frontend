import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addDays, addWeeks, addMonths, subDays, subWeeks, subMonths,
  format, startOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, endOfWeek, isSameDay, isToday,
} from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';
import DatePicker from 'react-datepicker';
import {
  RefreshCw, X, Plane, ClipboardList, Download,
  ChevronLeft, ChevronRight, Clock, User, GraduationCap,
  CheckCircle2, AlertTriangle, CloudRain, Calendar,
  LayoutGrid,
} from 'lucide-react';

import {
  getRoster, getRosterSlot, recomputeRoster,
  type RosterSlot, type SlotStatus, type RosterSlotDetail,
} from '@/lib/api/roster';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_START   = 6;   // 06:00
const DAY_END     = 22;  // 22:00
const HOUR_PX     = 56;  // pixels per hour
const TOTAL_H     = (DAY_END - DAY_START) * HOUR_PX;
const HOURS       = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoDate(d: Date) { return format(d, 'yyyy-MM-dd'); }

function parseSlotHours(display: string): { startH: number; endH: number } {
  const m = display.match(/(\d{1,2}):(\d{2})[–\-](\d{1,2}):(\d{2})/);
  if (m) return {
    startH: parseInt(m[1]) + parseInt(m[2]) / 60,
    endH:   parseInt(m[3]) + parseInt(m[4]) / 60,
  };
  // Fallback by slot key
  return { startH: 6, endH: 9 };
}

function slotStartH(s: RosterSlot)   { return parseSlotHours(s.flightSlotDisplay).startH; }
function slotEndH(s: RosterSlot)     { return parseSlotHours(s.flightSlotDisplay).endH; }

function groupByDate(slots: RosterSlot[]): Map<string, RosterSlot[]> {
  const map = new Map<string, RosterSlot[]>();
  for (const s of slots) {
    if (!map.has(s.flightDate)) map.set(s.flightDate, []);
    map.get(s.flightDate)!.push(s);
  }
  return map;
}

// ── Coordinate-based collision layout ─────────────────────────────────────────
//
//  Step 1 — build an overlap graph (which events share time with which).
//  Step 2 — greedy graph colouring: assign each event the smallest column (colour)
//            not already used by any of its already-placed neighbours.
//  Step 3 — totalCols for event i  = max col in its clique + 1
//            widthPct              = 100 / totalCols
//            leftPct               = col[i] * widthPct

interface PositionedEvent {
  slot:      RosterSlot;
  top:       number;      // px from top of day column
  height:    number;      // px
  leftPct:   number;      // 0–100
  widthPct:  number;      // 0–100
  totalCols: number;      // used for compact-content decision
}

function doOverlap(a: RosterSlot, b: RosterSlot): boolean {
  // Two events overlap when their intervals intersect (strictly — adjacent slots do NOT overlap)
  return slotStartH(a) < slotEndH(b) && slotEndH(a) > slotStartH(b);
}

function layoutDaySlots(slots: RosterSlot[]): PositionedEvent[] {
  if (!slots.length) return [];

  const n      = slots.length;
  // Sort by start time so greedy colouring runs left-to-right in time
  const sorted = [...slots].sort((a, b) => slotStartH(a) - slotStartH(b));

  // ── Step 1: Build N×N overlap matrix ──────────────────────────────────────
  const overlaps: boolean[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => i !== j && doOverlap(sorted[i], sorted[j])),
  );

  // ── Step 2: Greedy graph colouring ────────────────────────────────────────
  const col: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    // Collect columns already taken by earlier neighbours
    const taken = new Set<number>();
    for (let j = 0; j < i; j++) {
      if (overlaps[i][j]) taken.add(col[j]);
    }
    // Assign smallest available column
    let c = 0;
    while (taken.has(c)) c++;
    col[i] = c;
  }

  // ── Step 3: Compute CSS geometry for each event ───────────────────────────
  return sorted.map((slot, i) => {
    const sh = slotStartH(slot);
    const eh = slotEndH(slot);

    // How many columns does this event's overlap group need?
    let maxCol = col[i];
    for (let j = 0; j < n; j++) {
      if (overlaps[i][j]) maxCol = Math.max(maxCol, col[j]);
    }
    const totalCols = maxCol + 1;   // e.g. 3 overlapping events → 3 columns
    const widthPct  = 100 / totalCols;

    return {
      slot,
      top:      (sh - DAY_START) * HOUR_PX,                   // pixels from grid top
      height:   Math.max((eh - sh) * HOUR_PX - 2, 24),        // min 24 px so tiny slots are clickable
      leftPct:  col[i] * widthPct,                             // e.g. col 1 of 3 → 33.33 %
      widthPct,                                                 // e.g. 33.33 %
      totalCols,
    };
  });
}

// ── Type & Status Styling ─────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, { bg: string; border: string; text: string; dot: string; subtext: string }> = {
  DUAL:          { bg: 'bg-blue-100',    border: 'border-l-blue-500',    text: 'text-blue-900',    subtext: 'text-blue-600',    dot: 'bg-blue-500'    },
  SOLO:          { bg: 'bg-emerald-100', border: 'border-l-emerald-500', text: 'text-emerald-900', subtext: 'text-emerald-700', dot: 'bg-emerald-500' },
  CROSS_COUNTRY: { bg: 'bg-violet-100',  border: 'border-l-violet-500',  text: 'text-violet-900',  subtext: 'text-violet-700',  dot: 'bg-violet-500'  },
  DEFAULT:       { bg: 'bg-slate-100',   border: 'border-l-slate-400',   text: 'text-slate-700',   subtext: 'text-slate-500',   dot: 'bg-slate-400'   },
};
function typeColor(ft: string) { return TYPE_COLOR[ft] ?? TYPE_COLOR.DEFAULT; }

function initials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

const STATUS_LABEL: Record<SlotStatus, { label: string; cls: string }> = {
  SCHEDULED:       { label: 'Scheduled',   cls: 'bg-blue-100 text-blue-700'   },
  PENDING_DISPATCH:{ label: 'Dispatching', cls: 'bg-amber-100 text-amber-700' },
  COMPLETED:       { label: 'Completed',   cls: 'bg-emerald-100 text-emerald-700' },
  CANCELLED:       { label: 'Cancelled',   cls: 'bg-gray-100 text-gray-500'   },
  WX_CANCELLED:    { label: 'Wx Cancel',   cls: 'bg-gray-100 text-gray-500'   },
};

const STATUS_DIM: Record<SlotStatus, string> = {
  SCHEDULED:        '',
  PENDING_DISPATCH: '',
  COMPLETED:        'opacity-60',
  CANCELLED:        'opacity-35 grayscale',
  WX_CANCELLED:     'opacity-35 grayscale',
};

// ── useCurrentTime ────────────────────────────────────────────────────────────

function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ── CalendarEventBlock ────────────────────────────────────────────────────────
//
//  IMPORTANT — positioning rules:
//   • position:'absolute' is in the INLINE STYLE (not a Tailwind class) so it
//     can never be overridden by any stylesheet rule.
//   • top / height / left / width are all inline styles — highest CSS specificity.
//   • z-index lives in className only so that hover:z-[50] (a :hover rule) can
//     win over z-[10] (no pseudo-class) via CSS cascade without JS state.

function CalendarEventBlock({ ev, onClick }: { ev: PositionedEvent; onClick: (id: string) => void }) {
  const { slot, top, height, leftPct, widthPct, totalCols } = ev;
  const c   = typeColor(slot.flightType);
  const dim = STATUS_DIM[slot.status];

  // Decide content density based on column width
  // totalCols 1 → 100 % wide (full), 2 → 50 %, 3 → 33 %, 4+ → tiny
  const narrow  = totalCols >= 3;   // ~33 %  → initials + tail only
  const vnarrow = totalCols >= 5;   // ~20 %  → initials only

  const tooltip = [
    slot.cadetName ?? 'Unassigned',
    slot.instructorName ?? 'No instructor',
    slot.aircraftCode ?? '—',
    slot.flightType.replace('_', ' '),
    slot.flightSlotDisplay.match(/\((.+)\)/)?.[1] ?? '',
  ].filter(Boolean).join(' · ');

  return (
    <button
      onClick={() => onClick(slot.id)}
      title={tooltip}
      // z-[10] sits above grid lines; hover:z-[50] pops to front of siblings.
      // hover:scale-[1.03] + origin-top-left gives a natural "lift" on hover.
      className={`z-[10] hover:z-[50] hover:scale-[1.03] hover:shadow-lg
        rounded-[4px] border-l-[3px] text-left cursor-pointer
        transition-all duration-150 ease-out origin-top-left
        ${c.bg} ${c.border} ${c.text} ${dim}`}
      style={{
        // ── Geometry — ALL inline so nothing can override them ──────────────
        position: 'absolute',
        top:      `${top}px`,
        height:   `${height}px`,
        left:     `${leftPct}%`,            // no +1px offset — keep math clean
        width:    `calc(${widthPct}% - 2px)`, // 2 px gap between side-by-side events
        // ── Visual ──────────────────────────────────────────────────────────
        padding:    narrow ? '2px 3px' : '4px 6px',
        overflow:   'hidden',
        boxShadow:  '0 1px 2px rgba(0,0,0,0.07)',
      }}
    >
      {vnarrow ? (
        // ≥5 overlapping: centred initials badge
        <span className={`flex h-full items-center justify-center text-[10px] font-black leading-none ${c.text}`}>
          {initials(slot.cadetName)}
        </span>
      ) : narrow ? (
        // 3-4 overlapping: initials + tail number
        <div>
          <p className={`text-[10px] font-bold leading-tight truncate ${c.text}`}>
            {initials(slot.cadetName)}
          </p>
          {height > 32 && (
            <p className={`text-[9px] font-mono leading-tight truncate mt-px ${c.subtext}`}>
              {slot.aircraftCode ?? '—'}
            </p>
          )}
        </div>
      ) : (
        // 1-2 wide: full detail
        <div>
          <p className={`text-[11px] font-bold leading-tight truncate ${c.text}`}>
            {slot.cadetName ?? 'Unassigned'}
          </p>
          {height > 34 && (
            <p className={`text-[10px] leading-tight truncate mt-px ${c.subtext}`}>
              {slot.instructorName ?? 'No instructor'}
            </p>
          )}
          {height > 52 && (
            <p className={`text-[10px] font-mono leading-tight truncate mt-px ${c.subtext} opacity-80`}>
              {slot.aircraftCode ?? '—'} · {slot.flightType.replace('_', ' ')}
            </p>
          )}
        </div>
      )}
    </button>
  );
}

// ── CurrentTimeIndicator ──────────────────────────────────────────────────────

function CurrentTimeIndicator({ now }: { now: Date }) {
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < DAY_START || h > DAY_END) return null;
  const top = (h - DAY_START) * HOUR_PX;
  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
      <div className="flex items-center">
        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-sm shadow-red-400" />
        <div className="flex-1 h-[1.5px] bg-red-500 opacity-80" />
      </div>
    </div>
  );
}

// ── TimeAxis ──────────────────────────────────────────────────────────────────

function TimeAxis() {
  return (
    <div className="relative select-none" style={{ height: TOTAL_H }}>
      {HOURS.map(h => (
        <div
          key={h}
          className="absolute left-0 right-0 flex items-start"
          style={{ top: (h - DAY_START) * HOUR_PX }}
        >
          <span className="text-[10px] font-mono text-slate-400 pr-2 leading-none w-12 text-right">
            {String(h).padStart(2, '0')}:00
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Grid background lines ─────────────────────────────────────────────────────

function GridLines() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ height: TOTAL_H }}>
      {HOURS.flatMap(h => [
        /* Full-hour line — visible */
        <div
          key={`h-${h}`}
          className="absolute left-0 right-0 border-t border-slate-200"
          style={{ top: (h - DAY_START) * HOUR_PX }}
        />,
        /* Half-hour line — subtle dashed */
        <div
          key={`hh-${h}`}
          className="absolute left-0 right-0 border-t border-slate-100 border-dashed"
          style={{ top: (h - DAY_START) * HOUR_PX + HOUR_PX / 2 }}
        />,
      ])}
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────
//
//  All layout-critical styles are INLINE to guarantee browser renders them
//  exactly as intended regardless of Tailwind's CSS cascade.
//
//  Structure (purely flex-based, no CSS grid in the body):
//
//   ┌─[56px]─┬──[flex:1]──┬──[flex:1]──┬ … ┬──[flex:1]──┐
//   │ spacer  │    Mon      │    Tue      │ … │    Sun      │  ← header
//   ├─[56px]─┼──[flex:1]──┼──[flex:1]──┼ … ┼──[flex:1]──┤
//   │ time    │ pos:relative│ pos:relative│   │ pos:relative│  ← body
//   │ axis    │ h:TOTAL_H  │ h:TOTAL_H  │   │ h:TOTAL_H  │
//   │         │  events…   │  events…   │   │  events…   │
//   └─────────┴────────────┴────────────┴───┴────────────┘
//
//  Each event is position:absolute inside its day column.
//  left = col * (100/totalCols) %    width = (100/totalCols)% - 2px

function WeekView({ days, byDate, onSlotClick, now }: {
  days: Date[];
  byDate: Map<string, RosterSlot[]>;
  onSlotClick: (id: string) => void;
  now: Date;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (now.getHours() - DAY_START - 1) * HOUR_PX);
    }
  }, []); // eslint-disable-line

  return (
    // Outer shell — flex column, fills the content area
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', userSelect: 'none' }}>

      {/* ── Day-of-week header row ── */}
      <div style={{ display: 'flex', flexShrink: 0, background: '#fff', borderBottom: '1px solid #e2e8f0' }}>

        {/* Spacer — exact same width as the time axis below */}
        <div style={{ width: 56, flexShrink: 0, borderRight: '1px solid #e2e8f0' }} />

        {/* 7 day-label columns — MUST use flex:'1 1 0%' to match body columns */}
        {days.map(d => {
          const today = isToday(d);
          return (
            <div key={isoDate(d)} style={{ flex: '1 1 0%', textAlign: 'center', padding: '8px 0', borderRight: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: today ? '#3b82f6' : '#94a3b8' }}>
                {format(d, 'EEE')}
              </p>
              <p style={{
                marginTop: 2, fontSize: 14, fontWeight: 700,
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '2px auto 0', borderRadius: '50%',
                background: today ? '#3b82f6' : 'transparent',
                color: today ? '#fff' : '#334155',
              }}>
                {format(d, 'd')}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Scrollable body ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

        {/* Single flex-row containing the time axis + 7 day columns.
            height: TOTAL_H ensures absolutely-positioned events can use px offsets. */}
        <div style={{ display: 'flex', height: TOTAL_H }}>

          {/* Time axis — fixed 56 px, never shrinks */}
          <div style={{
            width: 56, flexShrink: 0, position: 'relative',
            height: TOTAL_H, background: '#fff',
            borderRight: '1px solid #e2e8f0', zIndex: 20,
          }}>
            <TimeAxis />
          </div>

          {/* 7 Day columns */}
          {days.map(d => {
            const dateKey = isoDate(d);
            const events  = layoutDaySlots(byDate.get(dateKey) ?? []);
            const today   = isToday(d);

            return (
              <div
                key={dateKey}
                style={{
                  // flex:'1 1 0%' → each day gets exactly 1/7 of remaining width
                  flex:     '1 1 0%',
                  // position:relative → THIS is the containing block for absolute children
                  position: 'relative',
                  // height MUST be explicit (px) so children can use top:Npx correctly
                  height:   TOTAL_H,
                  background: today ? 'rgba(239,246,255,0.35)' : '#fff',
                  borderRight: '1px solid #e2e8f0',
                  // overflow:visible so hover:scale events aren't clipped at column edge
                  overflow: 'visible',
                }}
              >
                {/* Hour / half-hour grid lines */}
                <GridLines />

                {/* Red "now" line — today's column only */}
                {today && <CurrentTimeIndicator now={now} />}

                {/* Flight events — each is position:absolute via CalendarEventBlock */}
                {events.map(ev => (
                  <CalendarEventBlock key={ev.slot.id} ev={ev} onClick={onSlotClick} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Day View ──────────────────────────────────────────────────────────────────

function DayView({ day, byDate, onSlotClick, now }: {
  day: Date;
  byDate: Map<string, RosterSlot[]>;
  onSlotClick: (id: string) => void;
  now: Date;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const h = now.getHours();
      scrollRef.current.scrollTop = Math.max(0, (h - DAY_START - 1) * HOUR_PX);
    }
  }, []); // eslint-disable-line

  const dateKey = isoDate(day);
  const slots   = byDate.get(dateKey) ?? [];
  const events  = layoutDaySlots(slots);
  const today   = isToday(day);

  return (
    <div className="flex flex-col h-full">
      {/* Day header */}
      <div className="shrink-0 flex items-center gap-4 px-6 py-3 border-b border-slate-200 bg-white">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
          ${today ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
          {format(day, 'd')}
        </div>
        <div>
          <div className={`text-xs font-bold uppercase tracking-widest ${today ? 'text-blue-500' : 'text-slate-400'}`}>
            {format(day, 'EEEE')}
          </div>
          <div className="text-sm font-semibold text-slate-700">{format(day, 'MMMM yyyy')}</div>
        </div>
        <div className="ml-auto text-xs text-slate-400">{slots.length} flight{slots.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: TOTAL_H }}>
          <div className="shrink-0 bg-white border-r border-slate-200 z-20" style={{ width: 56, height: TOTAL_H }}>
            <TimeAxis />
          </div>
          <div
            className={`relative flex-1 ${today ? 'bg-blue-50/25' : 'bg-white'}`}
            style={{ height: TOTAL_H }}
          >
            <GridLines />
            {today && <CurrentTimeIndicator now={now} />}
            {events.map(ev => (
              <CalendarEventBlock key={ev.slot.id} ev={ev} onClick={onSlotClick} />
            ))}
            {slots.length === 0 && (
              <div className="flex items-center justify-center h-full text-slate-300 text-sm">
                No flights scheduled
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Month View ────────────────────────────────────────────────────────────────

function MonthEventPill({ slot, onClick }: { slot: RosterSlot; onClick: (id: string) => void }) {
  const c = typeColor(slot.flightType);
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(slot.id); }}
      className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate border-l-2
        ${c.bg} ${c.border} ${c.text} ${STATUS_DIM[slot.status]} hover:brightness-95 transition`}
    >
      {slot.cadetName ?? 'Unassigned'}
    </button>
  );
}

function MonthView({ anchor, byDate, onSlotClick, onViewMore }: {
  anchor: Date;
  byDate: Map<string, RosterSlot[]>;
  onSlotClick: (id: string) => void;
  onViewMore: (date: Date, slots: RosterSlot[]) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(anchor),     { weekStartsOn: 1 }),
  });
  const inMonth = (d: Date) => d.getMonth() === anchor.getMonth();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day-of-week header */}
      <div className="shrink-0 grid grid-cols-7 border-b border-slate-200 bg-white">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 border-r border-slate-100 last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7" style={{ gridAutoRows: 'minmax(96px, 1fr)' }}>
          {days.map(d => {
            const dateKey = isoDate(d);
            const slots   = byDate.get(dateKey) ?? [];
            const today   = isToday(d);
            const dim     = !inMonth(d);
            const visible = slots.slice(0, 3);
            const more    = slots.length - 3;

            return (
              <div
                key={dateKey}
                className={`border-r border-b border-slate-100 last:border-r-0 p-1.5 flex flex-col gap-0.5 min-h-[96px]
                  ${dim ? 'bg-slate-50/60' : 'bg-white'}`}
              >
                {/* Date number */}
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                    ${today ? 'bg-blue-500 text-white' : dim ? 'text-slate-300' : 'text-slate-600'}`}>
                    {format(d, 'd')}
                  </span>
                </div>

                {/* Event pills */}
                <div className="space-y-0.5 flex-1 min-h-0 overflow-hidden">
                  {visible.map(s => (
                    <MonthEventPill key={s.id} slot={s} onClick={onSlotClick} />
                  ))}
                </div>

                {/* View more */}
                {more > 0 && (
                  <button
                    onClick={() => onViewMore(d, slots)}
                    className="text-[10px] font-semibold text-blue-500 hover:text-blue-700 text-left mt-0.5 transition"
                  >
                    +{more} more
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────

function ListView({ byDate, onSlotClick, anchor, view }: {
  byDate: Map<string, RosterSlot[]>;
  onSlotClick: (id: string) => void;
  anchor: Date;
  view: string;
}) {
  const entries = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        No flights in this range
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-4">
      {entries.map(([dateKey, slots]) => {
        const d = new Date(dateKey + 'T00:00:00');
        return (
          <div key={dateKey} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Date heading */}
            <div className={`px-4 py-2 border-b border-slate-100 flex items-center gap-3
              ${isToday(d) ? 'bg-blue-50' : 'bg-slate-50'}`}>
              <div className={`text-sm font-bold ${isToday(d) ? 'text-blue-600' : 'text-slate-700'}`}>
                {format(d, 'EEEE, d MMMM yyyy')}
              </div>
              {isToday(d) && (
                <span className="text-[10px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full">TODAY</span>
              )}
              <span className="ml-auto text-xs text-slate-400">{slots.length} flight{slots.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Slots */}
            <div className="divide-y divide-slate-100">
              {slots.map(s => {
                const c = typeColor(s.flightType);
                return (
                  <button
                    key={s.id}
                    onClick={() => onSlotClick(s.id)}
                    className={`w-full text-left flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition border-l-4 ${c.border} ${STATUS_DIM[s.status]}`}
                  >
                    <div className={`text-xs font-mono font-semibold text-slate-500 w-24 shrink-0`}>
                      {s.flightSlotDisplay.match(/\((.+)\)/)?.[1] ?? s.flightSlot}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{s.cadetName ?? 'Unassigned'}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {s.instructorName ?? 'No instructor'} · {s.aircraftCode ?? '—'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
                        {s.flightType.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_LABEL[s.status].cls}`}>
                        {STATUS_LABEL[s.status].label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({ slotId, onClose, rightOffset = 0 }: {
  slotId: string; onClose: () => void; rightOffset?: number;
}) {
  const { data, isLoading } = useQuery<RosterSlotDetail>({
    queryKey: ['roster-slot', slotId],
    queryFn: () => getRosterSlot(slotId),
  });

  const c = data ? typeColor(data.flightType) : TYPE_COLOR.DEFAULT;

  return (
    <div
      className="fixed top-0 bottom-0 z-50 w-[400px] bg-white border-l border-slate-200 shadow-2xl flex flex-col overflow-hidden transition-all duration-200"
      style={{ right: rightOffset }}
    >
        {/* Panel header */}
        <div className={`shrink-0 px-5 py-4 border-b border-slate-100 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${c.dot}`} />
            <span className="font-bold text-slate-800 text-sm">Flight Detail</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="animate-spin text-slate-400" />
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto">
            {/* Status + type badge */}
            <div className={`px-5 py-4 border-b border-slate-100 ${c.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-2 py-1 rounded-full border-l-4 ${c.bg} ${c.border} ${c.text}`}>
                  {data.flightType.replace('_', ' ')}
                </span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_LABEL[data.status].cls}`}>
                  {STATUS_LABEL[data.status].label}
                </span>
              </div>
              <div className="text-lg font-bold text-slate-800">
                {format(new Date(data.flightDate + 'T00:00:00'), 'EEEE, d MMMM yyyy')}
              </div>
              <div className="text-sm font-mono text-slate-500 mt-0.5">{data.flightSlotDisplay}</div>
            </div>

            {/* People */}
            <div className="px-5 py-4 space-y-4 border-b border-slate-100">
              <Row icon={<GraduationCap className="h-4 w-4 text-slate-400" />} label="Cadet">
                <div className="font-semibold text-slate-800">{data.cadet.fullName ?? '—'}</div>
                {data.cadet.regulatoryId && <div className="text-xs text-slate-500 font-mono">{data.cadet.regulatoryId}</div>}
                {data.cadet.programCode  && <div className="text-xs text-slate-500">{data.cadet.programCode}</div>}
              </Row>
              <Row icon={<User className="h-4 w-4 text-slate-400" />} label="Instructor">
                <div className="font-semibold text-slate-800">{data.instructor.fullName ?? '—'}</div>
                {data.instructor.instructorCode && <div className="text-xs text-slate-500 font-mono">{data.instructor.instructorCode}</div>}
              </Row>
              <Row icon={<Plane className="h-4 w-4 text-slate-400" />} label="Aircraft">
                <div className="font-semibold text-slate-800 font-mono">{data.aircraft.registration ?? '—'}</div>
                {data.aircraft.model && <div className="text-xs text-slate-500">{data.aircraft.type} · {data.aircraft.model}</div>}
              </Row>
            </div>

            {/* Hours */}
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3">Cadet Hours</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Skynet',   value: data.cadetHours.skynetHours },
                  { label: 'Maverick', value: data.cadetHours.maverickHours },
                  { label: 'Total',    value: data.cadetHours.totalHours },
                ].map(h => (
                  <div key={h.label} className="bg-slate-50 rounded-lg p-2.5 text-center border border-slate-100">
                    <div className="text-base font-bold text-slate-800">{h.value.toFixed(1)}</div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">{h.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conditions / remarks */}
            {(data.wxCondition || data.cancellationReason) && (
              <div className="px-5 py-4">
                {data.wxCondition && (
                  <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3 border border-amber-200 mb-2">
                    <CloudRain className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{data.wxCondition}</span>
                  </div>
                )}
                {data.cancellationReason && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-3 border border-red-200">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{data.cancellationReason}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-6 mt-0.5">{icon}</div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</div>
        {children}
      </div>
    </div>
  );
}

// ── Day Overflow Panel ────────────────────────────────────────────────────────

function DayOverflowPanel({ day, slots, onSlotClick, onClose, activeSlotId }: {
  day: Date; slots: RosterSlot[]; onSlotClick: (id: string) => void;
  onClose: () => void; activeSlotId: string | null;
}) {
  return (
    <div className="fixed top-0 right-0 bottom-0 z-50 w-[360px] bg-white border-l border-slate-200 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{format(day, 'EEEE')}</div>
          <div className="font-bold text-slate-800">{format(day, 'd MMMM yyyy')}</div>
          <div className="text-xs text-slate-400 mt-0.5">{slots.length} flight{slots.length !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Slot list */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {slots.map(s => {
          const c       = typeColor(s.flightType);
          const isActive = s.id === activeSlotId;
          return (
            <button
              key={s.id}
              onClick={() => onSlotClick(s.id)}
              className={`w-full text-left px-5 py-3.5 transition border-l-4 ${c.border} ${STATUS_DIM[s.status]}
                ${isActive ? 'bg-blue-50 shadow-inner' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-semibold text-slate-500">
                  {s.flightSlotDisplay.match(/\((.+)\)/)?.[1] ?? s.flightSlot}
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>
                  {s.flightType.replace('_', ' ')}
                </span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                )}
              </div>
              <div className={`text-sm font-semibold ${isActive ? 'text-blue-700' : 'text-slate-800'}`}>
                {s.cadetName ?? 'Unassigned'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {s.instructorName ?? 'No instructor'} · {s.aircraftCode ?? '—'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Body Header ───────────────────────────────────────────────────────────────

type RosterView = 'month' | 'week' | 'day' | 'list';

const VIEW_LABELS: Record<RosterView, string> = {
  month: 'Month',
  week:  'Week',
  day:   'Today',
  list:  'List',
};

function BodyHeader({ anchor, setAnchor, view, setView, goBack, goForward, recomputeMutation, stats, onExport }: {
  anchor: Date; setAnchor: (d: Date) => void;
  view: RosterView; setView: (v: RosterView) => void;
  goBack: () => void; goForward: () => void;
  recomputeMutation: any; stats: any;
  onExport: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const label = useMemo(() => {
    if (view === 'month') return format(anchor, 'MMMM yyyy');
    if (view === 'day')   return format(anchor, 'EEEE, d MMMM yyyy');
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    return `${format(start, 'dd MMM')} – ${format(addDays(start, 6), 'dd MMM yyyy')}`;
  }, [anchor, view]);

  return (
    <div className="shrink-0 bg-white border-b border-slate-200 shadow-sm">
      {/* Main control row */}
      <div className="flex items-center justify-between px-5 py-2.5 gap-4">

        {/* Left: Branding */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
            <ClipboardList className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] text-slate-400 uppercase leading-none">Operations</p>
            <p className="text-sm font-bold text-slate-800 leading-tight">Flight Roster</p>
          </div>
        </div>

        {/* Center: Date nav */}
        <div className="flex items-center gap-2 relative">
          <button onClick={goBack} className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setPickerOpen(o => !o)}
            className="font-semibold text-sm text-slate-800 hover:text-blue-600 transition min-w-[220px] text-center px-2"
          >
            {label}
          </button>

          <button onClick={goForward} className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {pickerOpen && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-white text-black rounded-xl shadow-2xl border border-slate-200">
              <DatePicker inline selected={anchor} onChange={(d: Date) => { setAnchor(d); setPickerOpen(false); }} />
            </div>
          )}
        </div>

        {/* Right: view toggle + actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Recompute */}
          <button
            onClick={() => recomputeMutation.mutate()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${recomputeMutation.isPending ? 'animate-spin' : ''}`} />
            Recompute
          </button>

          {/* Export */}
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs transition"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>

          {/* View toggle — unified pill group */}
          <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs shadow-sm">
            {(['month','week','day','list'] as const).map(v => (
              <button
                key={v}
                onClick={() => { setView(v); if (v === 'day') setAnchor(new Date()); }}
                className={`px-3 py-1.5 font-semibold transition border-r border-slate-200 last:border-r-0
                  ${view === v
                    ? 'bg-blue-600 text-white shadow-inner'
                    : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-6 px-5 py-1.5 border-t border-slate-100 bg-slate-50/70">
        {[
          { label: 'Total',     value: stats.total,     cls: 'text-slate-700'   },
          { label: 'Scheduled', value: stats.scheduled, cls: 'text-blue-600'    },
          { label: 'Completed', value: stats.completed, cls: 'text-emerald-600' },
          { label: 'Cancelled', value: stats.cancelled, cls: 'text-slate-400'   },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs">
            <span className={`font-bold font-mono ${s.cls}`}>{s.value}</span>
            <span className="text-slate-400">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function RosterPage() {
  const qc = useQueryClient();
  const now = useCurrentTime();

  const [anchor, setAnchor] = useState(new Date());
  const [view, setView]     = useState<RosterView>('week');
  const [selectedSlotId, setSelectedSlotId]   = useState<string | null>(null);
  const [detailFromOverflow, setDetailFromOverflow] = useState(false);
  const [overflowDay, setOverflowDay]         = useState<Date | null>(null);
  const [overflowSlots, setOverflowSlots]     = useState<RosterSlot[]>([]);

  const recomputeMutation = useMutation({
    mutationFn: recomputeRoster,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roster'] }),
  });

  function goBack() {
    setAnchor(prev =>
      view === 'day'   ? subDays(prev, 1) :
      view === 'week'  ? subWeeks(prev, 1) :
      view === 'list'  ? subWeeks(prev, 1) :
      subMonths(prev, 1)
    );
  }
  function goForward() {
    setAnchor(prev =>
      view === 'day'   ? addDays(prev, 1) :
      view === 'week'  ? addWeeks(prev, 1) :
      view === 'list'  ? addWeeks(prev, 1) :
      addMonths(prev, 1)
    );
  }

  const { fromDate, toDate } = useMemo(() => {
    if (view === 'day') {
      const d = isoDate(anchor);
      return { fromDate: d, toDate: d };
    }
    if (view === 'week' || view === 'list') {
      const start = startOfWeek(anchor, { weekStartsOn: 1 });
      return { fromDate: isoDate(start), toDate: isoDate(addDays(start, 6)) };
    }
    // month
    const start = startOfMonth(anchor);
    const end   = endOfMonth(anchor);
    return {
      fromDate: isoDate(startOfWeek(start, { weekStartsOn: 1 })),
      toDate:   isoDate(endOfWeek(end,   { weekStartsOn: 1 })),
    };
  }, [anchor, view]);

  const { data, isLoading } = useQuery({
    queryKey: ['roster', fromDate, toDate],
    queryFn:  () => getRoster({ from_date: fromDate, to_date: toDate }),
  });

  const byDate = useMemo(() => groupByDate(data?.slots ?? []), [data]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor]);

  const stats = useMemo(() => {
    const slots = data?.slots ?? [];
    return {
      total:     slots.length,
      scheduled: slots.filter(s => s.status === 'SCHEDULED' || s.status === 'PENDING_DISPATCH').length,
      completed: slots.filter(s => s.status === 'COMPLETED').length,
      cancelled: slots.filter(s => s.status === 'CANCELLED' || s.status === 'WX_CANCELLED').length,
    };
  }, [data]);

  // Click from calendar grid → close overflow, open detail standalone
  function handleSlotClick(id: string) {
    setOverflowDay(null);
    setDetailFromOverflow(false);
    setSelectedSlotId(id);
  }

  // Click from overflow list → keep overflow open, open detail to its left
  function handleOverflowSlotClick(id: string) {
    setDetailFromOverflow(true);
    setSelectedSlotId(id);
  }

  function handleViewMore(day: Date, slots: RosterSlot[]) {
    setSelectedSlotId(null);
    setDetailFromOverflow(false);
    setOverflowDay(day);
    setOverflowSlots(slots);
  }

  function handleExport() {
    const slots = data?.slots ?? [];
    if (slots.length === 0) return;

    const headers = [
      'Flight Date', 'Slot', 'Time', 'Flight Type', 'Status',
      'Cadet', 'Instructor', 'Aircraft', 'WX Condition', 'Cancellation Reason',
    ];

    const rows = slots.map(s => [
      s.flightDate,
      s.flightSlot,
      s.flightSlotDisplay.match(/\((.+)\)/)?.[1] ?? '',
      s.flightType,
      s.status,
      s.cadetName ?? '',
      s.instructorName ?? '',
      s.aircraftCode ?? '',
      s.wxCondition ?? '',
      s.cancellationReason ?? '',
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `roster_${fromDate}_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function closeAll() {
    setSelectedSlotId(null);
    setOverflowDay(null);
    setDetailFromOverflow(false);
  }

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC] overflow-hidden">

      <BodyHeader
        anchor={anchor}
        setAnchor={setAnchor}
        view={view}
        setView={setView}
        goBack={goBack}
        goForward={goForward}
        recomputeMutation={recomputeMutation}
        stats={stats}
        onExport={handleExport}
      />

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="animate-spin text-slate-400" />
          </div>
        ) : view === 'month' ? (
          <MonthView anchor={anchor} byDate={byDate} onSlotClick={handleSlotClick} onViewMore={handleViewMore} />
        ) : view === 'week' ? (
          <WeekView days={weekDays} byDate={byDate} onSlotClick={handleSlotClick} now={now} />
        ) : view === 'day' ? (
          <DayView day={anchor} byDate={byDate} onSlotClick={handleSlotClick} now={now} />
        ) : (
          <div className="h-full overflow-y-auto px-4">
            <ListView byDate={byDate} onSlotClick={handleSlotClick} anchor={anchor} view={view} />
          </div>
        )}
      </div>

      {/* Shared backdrop — click to close everything */}
      {(selectedSlotId || overflowDay) && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={closeAll} />
      )}

      {/* Overflow list panel — always docked at far right */}
      {overflowDay && (
        <DayOverflowPanel
          day={overflowDay}
          slots={overflowSlots}
          onSlotClick={handleOverflowSlotClick}
          onClose={closeAll}
          activeSlotId={selectedSlotId}
        />
      )}

      {/* Detail panel — to the left of overflow when opened from it, otherwise at far right */}
      {selectedSlotId && (
        <DetailPanel
          slotId={selectedSlotId}
          onClose={() => setSelectedSlotId(null)}
          rightOffset={detailFromOverflow ? 360 : 0}
        />
      )}
    </div>
  );
}
