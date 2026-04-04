import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addDays, addWeeks, addMonths,
  format, startOfWeek, subWeeks,
  startOfMonth, endOfMonth,
  eachDayOfInterval, endOfWeek
} from 'date-fns';

import {
  ChevronLeft, ChevronRight, RefreshCw, Zap,
  X, Clock, User, Plane, Calendar, LayoutGrid
} from 'lucide-react';

import {
  getRoster, getRosterSlot, generateRoster,
  type RosterSlot, type SlotStatus, type RosterSlotDetail,
} from '@/lib/api/roster';


import { recomputeRoster } from '@/lib/api/roster';
// ─────────────────────────────
// 🎨 STATUS STYLE
// ─────────────────────────────

const STATUS_STYLE: Record<SlotStatus, string> = {
  SCHEDULED: 'bg-sky-500/10 border-sky-400 text-sky-300',
  PENDING_DISPATCH: 'bg-amber-500/10 border-amber-400 text-amber-300',
  COMPLETED: 'bg-emerald-500/10 border-emerald-400 text-emerald-300',
  CANCELLED: 'bg-gray-500/10 border-gray-400 text-gray-400 line-through',
  WX_CANCELLED: 'bg-slate-500/10 border-slate-400 text-slate-400 line-through',
};

const SLOT_LABELS = ['SLOT_1', 'SLOT_2', 'SLOT_3'] as const;

// ─────────────────────────────
// 🧠 HELPERS
// ─────────────────────────────


function isoDate(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

function weekDays(anchor: Date) {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function groupSlots(slots: RosterSlot[]) {
  const map = new Map<string, Map<string, RosterSlot[]>>();
  for (const s of slots) {
    if (!map.has(s.flightDate)) map.set(s.flightDate, new Map());
    const dayMap = map.get(s.flightDate)!;
    if (!dayMap.has(s.flightSlot)) dayMap.set(s.flightSlot, []);
    dayMap.get(s.flightSlot)!.push(s);
  }
  return map;
}

// ─────────────────────────────
// ✨ SLOT CARD
// ─────────────────────────────

function SlotCard({ slot, onClick, compact = false }: any) {
  return (
    <button
      onClick={() => onClick(slot.id)}
      className={`w-full text-left rounded-xl border px-3 py-2 text-xs backdrop-blur-md transition-all
      hover:scale-[1.02] hover:shadow-lg ${STATUS_STYLE[slot.status]}`}
    >
      <div className="font-semibold truncate text-white">
        {slot.cadetName ?? 'Unassigned'}
      </div>
      {!compact && (
        <>
          <div className="text-[10px] opacity-70 truncate">
            {slot.instructorName ?? 'No instructor'}
          </div>
          <div className="text-[10px] opacity-60 truncate">
            {slot.aircraftCode ?? 'No aircraft'}
          </div>
        </>
      )}
    </button>
  );
}

// ─────────────────────────────
// 📅 WEEK VIEW
// ─────────────────────────────

function WeekView({ days, grouped, onSlotClick }: any) {
  return (
    <div className="grid grid-cols-8 gap-3">
      <div className="space-y-6 pt-10">
        {SLOT_LABELS.map((s) => (
          <div key={s} className="text-xs text-gray-400">
            {s.replace('_', ' ')}
          </div>
        ))}
      </div>

      {days.map((d) => {
        const dateKey = isoDate(d);

        return (
          <div key={dateKey} className="space-y-3">
            <div className="text-center">
              <div className="text-xs text-gray-400">{format(d, 'EEE')}</div>
              <div className="text-lg font-bold text-white">{format(d, 'd')}</div>
            </div>

            {SLOT_LABELS.map((slotLabel) => {
              const slots = grouped.get(dateKey)?.get(slotLabel) ?? [];

              return (
                <div key={slotLabel} className="rounded-xl bg-white/5 border border-white/10 p-2 space-y-1 min-h-[70px]">
                  {slots.length === 0 ? (
                    <div className="h-8 border border-dashed border-white/10 rounded" />
                  ) : (
                    slots.map((s: any) => (
                      <SlotCard key={s.id} slot={s} onClick={onSlotClick} />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────
// 📆 MONTH VIEW (UPGRADED)
// ─────────────────────────────

function MonthView({ anchor, grouped, onSlotClick }: any) {
  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);
  const days = eachDayOfInterval({
    start: startOfWeek(start, { weekStartsOn: 1 }),
    end: endOfWeek(end, { weekStartsOn: 1 }),
  });

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => {
        const dateKey = isoDate(d);
        const dayMap = grouped.get(dateKey);
        const slots = dayMap ? Array.from(dayMap.values()).flat() : [];

        return (
          <div key={dateKey} className="bg-white/5 border border-white/10 rounded-xl p-2 min-h-[100px]">
            <div className="text-xs text-gray-400 mb-1">
              {format(d, 'd')}
            </div>

            <div className="space-y-1">
              {slots.slice(0, 3).map((s: any) => (
                <SlotCard key={s.id} slot={s} onClick={onSlotClick} compact />
              ))}
              {slots.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{slots.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────
// 🪟 MODAL → RIGHT PANEL (TEAMS STYLE)
// ─────────────────────────────

function SlotDetailModal({ slotId, onClose }: any) {
  const { data, isLoading } = useQuery<RosterSlotDetail>({
    queryKey: ['roster-slot', slotId],
    queryFn: () => getRosterSlot(slotId),
  });

  return (
     <div
    className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
    onClick={onClose}   // ✅ ADD THIS
  >

      <div className="w-[420px] h-full bg-[#0B1220] border-l border-white/10 shadow-2xl p-6 overflow-y-auto text-white">

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Plane className="text-sky-400" />
            <span className="font-semibold">Flight Detail</span>
          </div>
          <button onClick={onClose}><X /></button>
        </div>

        {isLoading ? (
          <RefreshCw className="animate-spin" />
        ) : (
          <div className="space-y-6 text-sm">

            {/* Time */}
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="flex gap-2 items-center">
                <Calendar size={14} />
                {format(new Date(data.flightDate), 'dd MMM yyyy')}
              </div>
              <div className="flex gap-2 items-center mt-2">
                <Clock size={14} />
                {data.flightSlotDisplay}
              </div>
            </div>

            {/* Cadet */}
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="text-xs text-gray-400 mb-1">Cadet</div>
              <div className="font-semibold">{data.cadet.fullName}</div>
            </div>

            {/* Instructor */}
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="text-xs text-gray-400 mb-1">Instructor</div>
              <div className="font-semibold">{data.instructor.fullName}</div>
            </div>

            {/* Aircraft */}
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="text-xs text-gray-400 mb-1">Aircraft</div>
              <div className="font-semibold">{data.aircraft.registration}</div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────
// 🚀 MAIN PAGE
// ─────────────────────────────

export default function RosterPage() {
    const recomputeMutation = useMutation({
  mutationFn: recomputeRoster,
  onSuccess: () => qc.invalidateQueries({ queryKey: ['roster'] }),
});
  const qc = useQueryClient();
  const today = new Date();

  const [anchor, setAnchor] = useState(today);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const { fromDate, toDate } = useMemo(() => {
  if (view === 'week') {
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    return {
      fromDate: isoDate(start),
      toDate: isoDate(addDays(start, 6)),
    };
  } else {
    const start = startOfMonth(anchor);
    const end = endOfMonth(anchor);

    return {
      fromDate: isoDate(startOfWeek(start, { weekStartsOn: 1 })),
      toDate: isoDate(endOfWeek(end, { weekStartsOn: 1 })),
    };
  }
}, [anchor, view]);

function goBack() {
  setAnchor((a) => view === 'week' ? subWeeks(a, 1) : addMonths(a, -1));
}

function goForward() {
  setAnchor((a) => view === 'week' ? addWeeks(a, 1) : addMonths(a, 1));
}


  const { data, isLoading } = useQuery({
    queryKey: ['roster', fromDate, toDate],
    queryFn: () => getRoster({ from_date: fromDate, to_date: toDate }),
  });

  const grouped = useMemo(() => groupSlots(data?.slots ?? []), [data]);

  return (
    <div className="h-full flex flex-col bg-[#0B1220] text-white">

      {/* HEADER */}
      <div className="px-6 py-4 border-b border-white/10 flex justify-between">
        <div className="flex items-center gap-2">
          <Plane className="text-sky-400" />
          <span className="font-bold">Flight Ops</span>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setView('week')} className="text-xs">Week</button>
          <button onClick={() => setView('month')} className="text-xs">Month</button>
        </div>
         {/* Recompute */}
  <button
    onClick={() => recomputeMutation.mutate()}
    className="border border-white/20 hover:bg-white/10 px-3 py-2 rounded-lg text-sm flex items-center gap-1"
  >
    <RefreshCw className={`w-4 h-4 ${recomputeMutation.isPending ? 'animate-spin' : ''}`} />
    {recomputeMutation.isPending ? 'Recomputing…' : 'Recompute'}
  </button>
      </div>

      {/* NAV */}
      <div className="flex justify-between px-6 py-3 border-b border-white/10">
        <div className="flex gap-2">
         <button onClick={goBack}><ChevronLeft /></button>
        <button onClick={goForward}><ChevronRight /></button>
        </div>

        <div>{format(anchor, 'dd MMM yyyy')}</div>
      </div>

      {/* BODY */}
      <div className="flex-1 p-6 overflow-auto">
        {isLoading ? (
          <RefreshCw className="animate-spin" />
        ) : view === 'week' ? (
          <WeekView days={weekDays(anchor)} grouped={grouped} onSlotClick={setSelectedSlotId} />
        ) : (
          <MonthView anchor={anchor} grouped={grouped} onSlotClick={setSelectedSlotId} />
        )}
      </div>

      {/* MODAL */}

      {selectedSlotId && (
        <SlotDetailModal
          slotId={selectedSlotId}
          onClose={() => setSelectedSlotId(null)}
        />
      )}
    </div>
  );
}