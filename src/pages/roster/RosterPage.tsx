import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addDays, addWeeks, addMonths,
  format, startOfWeek, subWeeks,
  startOfMonth, endOfMonth,
  eachDayOfInterval, endOfWeek
} from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';
import {
  RefreshCw, X, Clock, Plane, Calendar
} from 'lucide-react';

import {
  getRoster, getRosterSlot, recomputeRoster,
  type RosterSlot, type SlotStatus, type RosterSlotDetail,
} from '@/lib/api/roster';

// 🎨 STATUS STYLE
const STATUS_STYLE: Record<SlotStatus, string> = {
  SCHEDULED: 'bg-blue-50 border-blue-200 text-blue-700',
  PENDING_DISPATCH: 'bg-amber-50 border-amber-200 text-amber-700',
  COMPLETED: 'bg-green-50 border-green-200 text-green-700',
  CANCELLED: 'bg-gray-100 border-gray-200 text-gray-400 line-through',
  WX_CANCELLED: 'bg-gray-100 border-gray-200 text-gray-400 line-through',
};

// 🧠 HELPERS
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

// ✨ SLOT CARD
function SlotCard({ slot, onClick, compact = false }: any) {
  return (
    <button
      onClick={() => onClick(slot.id)}
      className={`w-full text-left rounded-lg border px-3 py-2 text-xs bg-white shadow-sm hover:shadow-md transition ${STATUS_STYLE[slot.status]}`}
    >
      <div className="font-semibold truncate">
        {slot.cadetName ?? 'Unassigned'}
      </div>

      {!compact && (
        <>
          <div className="text-[11px] text-gray-500 truncate">
            {slot.instructorName ?? 'No instructor'}
          </div>
          <div className="text-[11px] text-gray-400 truncate">
            {slot.aircraftCode ?? 'No aircraft'}
          </div>
        </>
      )}
    </button>
  );
}

// 📅 WEEK VIEW
function WeekView({ days, grouped, onSlotClick }: any) {
  return (
    <div className="grid grid-cols-7 gap-3">
      {days.map((d) => {
        const dateKey = isoDate(d);
        const dayMap = grouped.get(dateKey);
        const slots = dayMap ? Array.from(dayMap.values()).flat() : [];

        return (
          <div key={dateKey} className="space-y-2">

            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase">
                {format(d, 'EEE')}
              </div>
              <div className="text-lg font-semibold">
                {format(d, 'd')}
              </div>
            </div>

            <div className="bg-white border-2 border-gray-300 rounded-lg p-2 min-h-[220px] hover:border-blue-400 hover:shadow-md transition">
              <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-sky-400 to-blue-500 rounded mb-2 opacity-70" />

              {slots.length === 0 ? (
                <div className="h-20 border border-dashed border-gray-300 rounded" />
              ) : (
                <div className="flex flex-col gap-2">
                  {slots.map((s: any) => (
                    <SlotCard key={s.id} slot={s} onClick={onSlotClick} />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 📆 MONTH VIEW
function MonthView({ anchor, grouped, onSlotClick }: any) {
  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);

  const days = eachDayOfInterval({
    start: startOfWeek(start, { weekStartsOn: 1 }),
    end: endOfWeek(end, { weekStartsOn: 1 }),
  });

  return (
    <div className="grid grid-cols-7 gap-3">
      {days.map((d) => {
        const dateKey = isoDate(d);
        const dayMap = grouped.get(dateKey);
        const slots = dayMap ? Array.from(dayMap.values()).flat() : [];

        return (
          <div key={dateKey} className="bg-white border-2 border-gray-300 rounded-lg p-2 min-h-[120px] hover:border-blue-400 hover:shadow-md transition">
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-sky-400 to-blue-500 rounded mb-1 opacity-70" />

            <div className="text-xs text-gray-500 mb-1 font-medium">
              {format(d, 'd')}
            </div>

            <div className="space-y-1">
              {slots.slice(0, 3).map((s: any) => (
                <SlotCard key={s.id} slot={s} onClick={onSlotClick} compact />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 🪟 SIDE PANEL
function SlotDetailModal({ slotId, onClose }: any) {
  const { data, isLoading } = useQuery<RosterSlotDetail>({
    queryKey: ['roster-slot', slotId],
    queryFn: () => getRosterSlot(slotId),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="w-[420px] h-full bg-white border-l shadow-xl p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between mb-6">
          <div className="flex gap-2 font-semibold">
            <Plane /> Flight Detail
          </div>
          <button onClick={onClose}><X /></button>
        </div>

        {isLoading ? <RefreshCw className="animate-spin" /> : (
          <div className="space-y-4 text-sm">
            <div className="bg-gray-50 p-3 rounded border">
              <Calendar size={14} /> {format(new Date(data.flightDate), 'dd MMM yyyy')}
              <div className="mt-2"><Clock size={14} /> {data.flightSlotDisplay}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 🧭 HEADER (ZOHO STYLE)
import DatePicker from 'react-datepicker';


function RosterHeader({
  anchor,
  setAnchor,
  view,
  setView,
  goBack,
  goForward,
  recomputeMutation,
}: any) {

  const [open, setOpen] = useState(false);

  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  const end = addDays(start, 6);

  const label =
    view === 'week'
      ? `${format(start, 'dd MMM yyyy')} - ${format(end, 'dd MMM yyyy')}`
      : format(anchor, 'MMMM yyyy');

  return (
    <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white border-b shadow-lg">

      <div className="flex items-center justify-between">

        {/* ✈️ LEFT (Brand) */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg backdrop-blur">
            <Plane className="text-sky-300" size={20} />
          </div>

          <div>
            <div className="font-semibold text-lg tracking-wide">
              Flight Operations
            </div>
            <div className="text-xs text-blue-200">
              Training & Scheduling Console
            </div>
          </div>
        </div>

        {/* 📅 CENTER NAV */}
        <div className="flex flex-col items-center relative">

          <div className="flex items-center gap-3 mb-1">

            <button
              onClick={goBack}
              className="p-2 rounded-md bg-white/10 hover:bg-white/20 transition"
            >
              ←
            </button>

            {/* CLICKABLE DATE */}
            <div
              onClick={() => setOpen(!open)}
              className="cursor-pointer font-semibold text-sm tracking-wide hover:text-sky-300"
            >
              {label}
            </div>

            <button
              onClick={goForward}
              className="p-2 rounded-md bg-white/10 hover:bg-white/20 transition"
            >
              →
            </button>

          </div>

          {/* DATE PICKER */}
          {open && (
            <div className="absolute top-12 z-50 bg-white text-black rounded shadow-lg">
              <DatePicker
                inline
                selected={anchor}
                onChange={(date: Date) => {
                  setAnchor(date);
                  setOpen(false);
                }}
              />
            </div>
          )}
        </div>

        {/* ⚙️ RIGHT CONTROLS */}
        <div className="flex items-center gap-2">

          {/* TODAY */}
          <button
            onClick={() => setAnchor(new Date())}
            className="px-3 py-1.5 text-sm rounded-md bg-white/10 hover:bg-white/20 transition"
          >
            Today
          </button>

          {/* VIEW SWITCH */}
          <div className="flex border border-white/20 rounded-md overflow-hidden">

            <button
              onClick={() => setView('list')}
              className={`px-3 py-1 text-sm ${
                view === 'list'
                  ? 'bg-white text-blue-900'
                  : 'bg-transparent hover:bg-white/10'
              }`}
            >
              List
            </button>

            <button
              onClick={() => setView('week')}
              className={`px-3 py-1 text-sm ${
                view === 'week'
                  ? 'bg-white text-blue-900'
                  : 'bg-transparent hover:bg-white/10'
              }`}
            >
              Week
            </button>

            <button
              onClick={() => setView('month')}
              className={`px-3 py-1 text-sm ${
                view === 'month'
                  ? 'bg-white text-blue-900'
                  : 'bg-transparent hover:bg-white/10'
              }`}
            >
              Month
            </button>

          </div>

          {/* RECOMPUTE */}
          <button
            onClick={() => recomputeMutation.mutate()}
            className="ml-2 bg-amber-400 hover:bg-amber-300 text-black px-3 py-1.5 rounded-md text-sm flex items-center gap-1 shadow"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                recomputeMutation.isPending ? 'animate-spin' : ''
              }`}
            />
            Recompute
          </button>

        </div>
      </div>
    </div>
  );
}
//List VIEW
function ListView({ grouped, onSlotClick }: any) {
  const allSlots = Array.from(grouped.values())
    .flatMap((m) => Array.from(m.values()).flat());

  return (
    <div className="bg-white border rounded-lg p-4 space-y-2">
      {allSlots.length === 0 ? (
        <div className="text-gray-400">No schedules</div>
      ) : (
        allSlots.map((s: any) => (
          <div
            key={s.id}
            onClick={() => onSlotClick(s.id)}
            className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
          >
            <div className="font-semibold">{s.cadetName}</div>
            <div className="text-xs text-gray-500">
              {s.flightDate} • {s.flightSlot}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// 🚀 MAIN
export default function RosterPage() {
  const qc = useQueryClient();
  const [anchor, setAnchor] = useState(new Date());
  //const [view, setView] = useState<'week' | 'month'>('week');
  const [view, setView] = useState<'list' | 'week' | 'month'>('week');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const recomputeMutation = useMutation({
    mutationFn: recomputeRoster,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roster'] }),
  });

  function goBack() {
    setAnchor(prev => view==='week'?subWeeks(prev,1):addMonths(prev,-1));
  }

  function goForward() {
    setAnchor(prev => view==='week'?addWeeks(prev,1):addMonths(prev,1));
  }

  const { fromDate, toDate } = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(anchor, { weekStartsOn: 1 });
      return { fromDate: isoDate(start), toDate: isoDate(addDays(start, 6)) };
    }
    const start = startOfMonth(anchor);
    const end = endOfMonth(anchor);
    return {
      fromDate: isoDate(startOfWeek(start, { weekStartsOn: 1 })),
      toDate: isoDate(endOfWeek(end, { weekStartsOn: 1 })),
    };
  }, [anchor, view]);

  const { data, isLoading } = useQuery({
    queryKey: ['roster', fromDate, toDate],
    queryFn: () => getRoster({ from_date: fromDate, to_date: toDate }),
  });

  const grouped = useMemo(() => groupSlots(data?.slots ?? []), [data]);

  return (
    <div className="h-full flex flex-col bg-gray-50">

     <RosterHeader
  anchor={anchor}
  setAnchor={setAnchor}
  view={view}
  setView={setView}
  goBack={goBack}
  goForward={goForward}
  recomputeMutation={recomputeMutation}
/>

      <div className="flex-1 p-6 overflow-auto">
        {isLoading ? <RefreshCw className="animate-spin" /> :
          view === 'week'
            ? <WeekView days={weekDays(anchor)} grouped={grouped} onSlotClick={setSelectedSlotId} />
            : <MonthView anchor={anchor} grouped={grouped} onSlotClick={setSelectedSlotId} />
        }
      </div>

      {selectedSlotId && (
        <SlotDetailModal
          slotId={selectedSlotId}
          onClose={() => setSelectedSlotId(null)}
        />
      )}
    </div>
  );
}