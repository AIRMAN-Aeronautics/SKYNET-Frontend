import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AircraftHologram } from '@/components/aircraft/AircraftHologram';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Plus, Pencil, Trash2, X, Plane, Wrench, ClipboardList, BookOpen,
  CheckCircle2, AlertTriangle, Ban, Wifi, Moon, RefreshCw,
  Calendar, Search, Save, ChevronRight, ChevronDown, MapPin, Gauge, Activity,
  Users, Shield, Clock, Tag, Factory, Layers, BarChart3, UserCheck, Download,
} from 'lucide-react';
import {
  listAircraft, createAircraft, updateAircraft, deleteAircraft,
  listSchedule, addSchedule, updateSchedule, deleteSchedule,
  type AircraftRecord, type AircraftFormData,
  type AircraftStatus, type ScheduleStatus, type AircraftScheduleRecord,
} from '@/lib/api/aircraft';
import {
  getAircraftAvailability, createAvailabilityEvent,
  updateAvailabilityEvent, resolveAvailabilityEvent, deleteAvailabilityEvent,
  type AircraftAvailabilityRecord, type DownStatus,
} from '@/lib/api/aircraftAvailability';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<AircraftStatus, {
  label: string; dot: string; bar: string; barSolid: string;
  badge: string; bg: string; text: string; icon: React.ElementType;
}> = {
  OPERATIONAL: {
    label:    'Available',
    dot:      'bg-emerald-500',
    bar:      'bg-emerald-500',
    barSolid: 'bg-emerald-500',
    badge:    'bg-emerald-50 border-emerald-200 text-emerald-700',
    bg:       'bg-emerald-50',
    text:     'text-emerald-700',
    icon:     CheckCircle2,
  },
  MAINTENANCE: {
    label:    'Maintenance',
    dot:      'bg-amber-500',
    bar:      'bg-amber-400',
    barSolid: 'bg-amber-500',
    badge:    'bg-amber-50 border-amber-200 text-amber-700',
    bg:       'bg-amber-50',
    text:     'text-amber-700',
    icon:     Wrench,
  },
  GROUNDED: {
    label:    'Grounded',
    dot:      'bg-red-500',
    bar:      'bg-red-500',
    barSolid: 'bg-red-500',
    badge:    'bg-red-50 border-red-200 text-red-700',
    bg:       'bg-red-50',
    text:     'text-red-700',
    icon:     Ban,
  },
};

const SCHED_CFG: Record<ScheduleStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  AVAILABLE:   { label: 'Available',   bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  MAINTENANCE: { label: 'Maintenance', bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200',   dot: 'bg-amber-500'   },
  BLOCKED:     { label: 'Blocked',     bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200',     dot: 'bg-red-500'     },
};

const AIRCRAFT_TYPES = ['Single Engine', 'Multi Engine', 'Turboprop', 'Jet', 'Helicopter'];
const FUEL_TYPES     = ['AVGAS 100LL', 'JET-A', 'MOGAS', 'AVTUR'];
const AW_STATUSES    = ['VALID', 'EXPIRED', 'SUSPENDED'];

const EMPTY_FORM: AircraftFormData = {
  name: '', registration: '', manufacturer: '', type: '',
  aircraft_type: '', model: '', seating_capacity: undefined,
  status: 'OPERATIONAL', base_airport_icao: '', fuel_type: '',
  total_hours: undefined, engine_hours: undefined,
  last_flight_date: '', last_hobbs: undefined,
  next_service_due_hours: undefined, next_service_due_date: '',
  airworthiness_status: 'VALID', insurance_expiry: '',
  is_ifr_capable: false, is_night_allowed: false, notes: '',
};

// ── Shared small helpers ───────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase px-0.5 mb-2">
      {children}
    </p>
  );
}

function ViewRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.15em] text-slate-400 uppercase leading-none mb-1 flex items-center gap-1">
        {Icon && <Icon className="h-2.5 w-2.5" />}
        {label}
      </p>
      <p className="text-xs font-medium text-foreground leading-snug">
        {value ?? <span className="text-muted-foreground/40">—</span>}
      </p>
    </div>
  );
}

function Field({
  label, children, full,
}: {
  label: string; children: React.ReactNode; full?: boolean;
}) {
  const isRequired = label.endsWith(' *');
  const displayLabel = isRequired ? label.slice(0, -2) : label;
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1.5">
        {displayLabel}
        {isRequired && <span className="text-red-500 ml-0.5 normal-case">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AircraftStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={`shrink-0 inline-flex items-center gap-1 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full border ${cfg.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Skeleton + aviation loader ────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white px-4 py-3 animate-pulse overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 rounded-l-xl" />
      <div className="flex items-start justify-between gap-2 pl-1">
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-slate-100 rounded w-3/4" />
          <div className="h-2.5 bg-slate-100 rounded w-2/5" />
        </div>
        <div className="h-4 w-14 bg-slate-100 rounded-full shrink-0 mt-0.5" />
      </div>
    </div>
  );
}

function AircraftLoader() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 select-none">
      {/* Radar / approach-light rings */}
      <div className="relative flex items-center justify-center w-28 h-28">
        <span className="absolute inset-0 rounded-full border border-blue-400/20 animate-ping" style={{ animationDuration: '2s' }} />
        <span className="absolute inset-3 rounded-full border border-blue-400/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.4s' }} />
        <span className="absolute inset-6 rounded-full border border-blue-400/40 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.8s' }} />
        {/* Radar sweep arc */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div
            className="absolute inset-0 origin-center"
            style={{
              background: 'conic-gradient(from 0deg, transparent 70%, rgba(59,130,246,0.15) 100%)',
              animation: 'spin 2.5s linear infinite',
            }}
          />
        </div>
        {/* Center cockpit */}
        <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-blue-950 border border-blue-700/60 shadow-lg shadow-blue-950/60">
          <Plane className="h-5 w-5 text-blue-300" style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
        </div>
      </div>

      {/* Runway centerline dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3, 4].map(i => (
          <span
            key={i}
            className="h-1 w-4 rounded-full bg-blue-400/40"
            style={{ animation: `pulse 1.2s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      <div className="text-center space-y-0.5">
        <p className="text-[10px] font-bold tracking-[0.25em] text-blue-500 uppercase">
          Loading Fleet Data
        </p>
        <p className="text-[11px] text-muted-foreground">Retrieving aircraft registry…</p>
      </div>
    </div>
  );
}

// ── Aircraft Card (left panel) ─────────────────────────────────────────────────

function AircraftCard({
  aircraft,
  selected,
  onClick,
}: {
  aircraft: AircraftRecord;
  selected: boolean;
  onClick: () => void;
}) {
  const cfg = STATUS_CFG[aircraft.status];
  return (
    <button
      onClick={onClick}
      className={`group w-full text-left relative rounded-xl border bg-white overflow-hidden transition-all duration-150 ${
        selected
          ? 'border-blue-400 shadow-md ring-1 ring-blue-400/30 -translate-y-0.5'
          : 'border-slate-200 hover:border-blue-300 hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      {/* Left status bar */}
      <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${cfg.barSolid}`} />
      <div className="flex items-center justify-between gap-2 pl-5 pr-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-foreground truncate">
            {aircraft.name || aircraft.registration}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono truncate">
            {aircraft.registration}
            {aircraft.model ? ` · ${aircraft.model}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge status={aircraft.status} />
          <ChevronRight className={`h-3.5 w-3.5 text-slate-300 transition-all ${selected ? 'opacity-100 text-blue-400' : 'opacity-0 group-hover:opacity-100'}`} />
        </div>
      </div>
    </button>
  );
}

// ── Inline Aircraft Form ───────────────────────────────────────────────────────

function AircraftForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
  title,
}: {
  initial?: AircraftRecord | null;
  onSave: (data: AircraftFormData) => void;
  onCancel: () => void;
  saving: boolean;
  error?: string;
  title: string;
}) {
  const [form, setForm] = useState<AircraftFormData>(
    initial ? {
      name:             initial.name ?? '',
      registration:     initial.registration,
      manufacturer:     initial.manufacturer ?? '',
      type:             initial.type ?? '',
      aircraft_type:    initial.aircraftType ?? '',
      model:            initial.model ?? '',
      seating_capacity: initial.seatingCapacity ?? undefined,
      status:           initial.status,
      base_airport_icao: initial.baseAirportIcao ?? '',
      fuel_type:        initial.fuelType ?? '',
      total_hours:      initial.totalHours ?? undefined,
      engine_hours:     initial.engineHours ?? undefined,
      last_flight_date: initial.lastFlightDate ?? '',
      last_hobbs:       initial.lastHobbs ?? undefined,
      next_service_due_hours: initial.nextServiceDueHours ?? undefined,
      next_service_due_date:  initial.nextServiceDueDate ?? '',
      airworthiness_status:   initial.airworthinessStatus ?? 'VALID',
      insurance_expiry:       initial.insuranceExpiry ?? '',
      is_ifr_capable:   initial.isIfrCapable,
      is_night_allowed: initial.isNightAllowed,
      notes:            initial.notes ?? '',
    } : EMPTY_FORM,
  );

  const set = (field: keyof AircraftFormData, value: any) =>
    setForm(f => ({ ...f, [field]: value }));
  const num = (v: string) => (v === '' ? undefined : parseFloat(v));

  const canSave = form.name.trim().length > 0 && form.registration.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    // Strip empty strings from optional fields — pydantic rejects "" for Optional[date] / Optional[str]
    const sanitized: AircraftFormData = {
      ...form,
      manufacturer:          form.manufacturer?.trim()          || undefined,
      type:                  form.type?.trim()                  || undefined,
      aircraft_type:         form.aircraft_type?.trim()         || undefined,
      model:                 form.model?.trim()                 || undefined,
      base_airport_icao:     form.base_airport_icao?.trim()     || undefined,
      fuel_type:             form.fuel_type?.trim()             || undefined,
      last_flight_date:      form.last_flight_date?.trim()      || undefined,
      next_service_due_date: form.next_service_due_date?.trim() || undefined,
      airworthiness_status:  form.airworthiness_status?.trim()  || undefined,
      insurance_expiry:      form.insurance_expiry?.trim()      || undefined,
      notes:                 form.notes?.trim()                 || undefined,
    };
    onSave(sanitized);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Form header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white shrink-0">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-slate-400 uppercase mb-0.5">
            Aircraft Fleet
          </p>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
        </div>
        <button
          onClick={onCancel}
          className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable form body */}
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4 bg-[#F8FAFC]">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2 text-xs text-red-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <Tag className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Basic Info</p>
          </div>
          <div className="grid grid-cols-3 gap-x-4 gap-y-3 p-4">
            <Field label="Aircraft Name *">
              <input required value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Cessna Alpha" className="form-input" />
            </Field>
            <Field label="Registration *">
              <input required value={form.registration}
                onChange={e => set('registration', e.target.value.toUpperCase())}
                placeholder="e.g. VT-AAA" className="form-input font-mono" />
            </Field>
            <Field label="Manufacturer">
              <input value={form.manufacturer ?? ''} onChange={e => set('manufacturer', e.target.value)}
                placeholder="e.g. Cessna" className="form-input" />
            </Field>
            <Field label="Model">
              <input value={form.model ?? ''} onChange={e => set('model', e.target.value)}
                placeholder="e.g. 172S" className="form-input" />
            </Field>
            <Field label="Category">
              <input value={form.type ?? ''} onChange={e => set('type', e.target.value)}
                placeholder="Fixed Wing / Rotary" className="form-input" />
            </Field>
            <Field label="Aircraft Type">
              <select value={form.aircraft_type ?? ''} onChange={e => set('aircraft_type', e.target.value)}
                className="form-input">
                <option value="">— Select —</option>
                {AIRCRAFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Seating Capacity">
              <input type="number" min={1} value={form.seating_capacity ?? ''}
                onChange={e => set('seating_capacity', num(e.target.value))}
                placeholder="e.g. 4" className="form-input" />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e => set('status', e.target.value as AircraftStatus)}
                className="form-input">
                <option value="OPERATIONAL">Available</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="GROUNDED">Grounded</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Operational + Capabilities */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Operational</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
              <Field label="Base Airport (ICAO)">
                <input value={form.base_airport_icao ?? ''}
                  onChange={e => set('base_airport_icao', e.target.value.toUpperCase())}
                  placeholder="e.g. VOBL" className="form-input font-mono" />
              </Field>
              <Field label="Fuel Type">
                <select value={form.fuel_type ?? ''} onChange={e => set('fuel_type', e.target.value)}
                  className="form-input">
                  <option value="">— Select —</option>
                  {FUEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <Shield className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Capabilities</p>
            </div>
            <div className="flex flex-col gap-2.5 p-4 pt-3.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.is_ifr_capable}
                  onChange={e => set('is_ifr_capable', e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-xs text-foreground flex items-center gap-1.5">
                  <Wifi className="h-3 w-3 text-blue-500" /> IFR Capable
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.is_night_allowed}
                  onChange={e => set('is_night_allowed', e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-xs text-foreground flex items-center gap-1.5">
                  <Moon className="h-3 w-3 text-indigo-500" /> Night Flying Allowed
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Usage */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <Gauge className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Usage</p>
          </div>
          <div className="grid grid-cols-4 gap-x-4 gap-y-3 p-4">
            <Field label="Total Hours">
              <input type="number" min={0} step={0.1} value={form.total_hours ?? ''}
                onChange={e => set('total_hours', num(e.target.value))} placeholder="0.0" className="form-input" />
            </Field>
            <Field label="Engine Hours">
              <input type="number" min={0} step={0.1} value={form.engine_hours ?? ''}
                onChange={e => set('engine_hours', num(e.target.value))} placeholder="0.0" className="form-input" />
            </Field>
            <Field label="Last Flight Date">
              <input type="date" value={form.last_flight_date ?? ''}
                onChange={e => set('last_flight_date', e.target.value)} className="form-input" />
            </Field>
            <Field label="Last Hobbs (h)">
              <input type="number" min={0} step={0.1} value={form.last_hobbs ?? ''}
                onChange={e => set('last_hobbs', num(e.target.value))} placeholder="0.0" className="form-input" />
            </Field>
          </div>
        </div>

        {/* Maintenance */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <Wrench className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Maintenance</p>
          </div>
          <div className="grid grid-cols-4 gap-x-4 gap-y-3 p-4">
            <Field label="Next Service (Hours)">
              <input type="number" min={0} step={0.1} value={form.next_service_due_hours ?? ''}
                onChange={e => set('next_service_due_hours', num(e.target.value))} placeholder="0.0" className="form-input" />
            </Field>
            <Field label="Next Service (Date)">
              <input type="date" value={form.next_service_due_date ?? ''}
                onChange={e => set('next_service_due_date', e.target.value)} className="form-input" />
            </Field>
            <Field label="Airworthiness">
              <select value={form.airworthiness_status ?? 'VALID'}
                onChange={e => set('airworthiness_status', e.target.value)} className="form-input">
                {AW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Insurance Expiry">
              <input type="date" value={form.insurance_expiry ?? ''}
                onChange={e => set('insurance_expiry', e.target.value)} className="form-input" />
            </Field>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Notes</p>
          </div>
          <div className="p-4">
            <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)}
              rows={2} placeholder="Additional notes…" className="form-input resize-none" />
          </div>
        </div>

        {/* Sticky footer actions */}
        <div className="flex items-center gap-3 pt-1 pb-1 sticky bottom-0 bg-[#F8FAFC]">
          <button type="submit" disabled={saving || !canSave}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-blue-200 transition-colors">
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Save Aircraft'}
          </button>
          <button type="button" onClick={onCancel}
            className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          {!canSave && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              Aircraft Name and Registration are required
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

// ── Inline Schedule Block Form ─────────────────────────────────────────────────

function ScheduleBlockForm({
  aircraftId,
  initial,
  onClose,
}: {
  aircraftId: number;
  initial: AircraftScheduleRecord | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [startTime, setStartTime] = useState(initial ? initial.startTime.slice(0, 16) : '');
  const [endTime,   setEndTime]   = useState(initial ? initial.endTime.slice(0, 16) : '');
  const [status,    setStatus]    = useState<ScheduleStatus>(initial?.status ?? 'MAINTENANCE');
  const [reason,    setReason]    = useState(initial?.reason ?? '');
  const [err,       setErr]       = useState('');

  const addMut = useMutation({
    mutationFn: (body: any) => addSchedule(aircraftId, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['aircraft-schedule', aircraftId] }); onClose(); },
    onError: () => setErr('Failed to save. Check the dates.'),
  });
  const updMut = useMutation({
    mutationFn: (body: any) => updateSchedule(aircraftId, initial!.id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['aircraft-schedule', aircraftId] }); onClose(); },
    onError: () => setErr('Failed to update.'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const body = {
      start_time: new Date(startTime).toISOString(),
      end_time:   new Date(endTime).toISOString(),
      status,
      reason: reason || undefined,
    };
    if (initial) updMut.mutate(body);
    else addMut.mutate(body);
  }

  const saving = addMut.isPending || updMut.isPending;

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-blue-800">
          {initial ? 'Edit Schedule Block' : 'New Schedule Block'}
        </p>
        <button onClick={onClose} className="rounded-lg p-0.5 hover:bg-blue-100 text-blue-500">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Start</label>
            <input
              required type="datetime-local"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="form-input"
            />
          </div>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">End</label>
            <input
              required type="datetime-local"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="form-input"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as ScheduleStatus)}
              className="form-input"
            >
              <option value="MAINTENANCE">Maintenance</option>
              <option value="BLOCKED">Blocked</option>
              <option value="AVAILABLE">Available</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Reason</label>
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Optional"
              className="form-input"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : initial ? 'Update Block' : 'Add Block'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Info Tab (view mode with inline edit) ─────────────────────────────────────

function InfoTab({
  aircraft,
  onDelete,
}: {
  aircraft: AircraftRecord;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const [isEditing,        setIsEditing]        = useState(false);
  const [formError,        setFormError]         = useState('');
  const [showSchedForm,    setShowSchedForm]     = useState(false);
  const [editBlock,        setEditBlock]         = useState<AircraftScheduleRecord | null>(null);

  const { data: schedData, isLoading: schedLoading } = useQuery({
    queryKey: ['aircraft-schedule', aircraft.id],
    queryFn:  () => listSchedule(aircraft.id),
  });
  const schedule = schedData?.schedule ?? [];

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: AircraftFormData }) => updateAircraft(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aircraft-list'] });
      setIsEditing(false);
      setFormError('');
    },
    onError: (e: any) => setFormError(e?.response?.data?.detail ?? 'Failed to save changes.'),
  });

  const delSchedMut = useMutation({
    mutationFn: (sid: number) => deleteSchedule(aircraft.id, sid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aircraft-schedule', aircraft.id] }),
  });

  // ── Edit mode ────────────────────────────────────────────────────────────────

  if (isEditing) {
    return (
      <AircraftForm
        title={`Edit ${aircraft.name || aircraft.registration}`}
        initial={aircraft}
        saving={updateMut.isPending}
        error={formError}
        onSave={body => updateMut.mutate({ id: aircraft.id, body })}
        onCancel={() => { setIsEditing(false); setFormError(''); }}
      />
    );
  }

  // ── View mode ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full min-h-0 overflow-y-auto px-5 py-4 space-y-4 bg-[#F8FAFC] animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 shadow-sm transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      </div>

      {/* Basic Info */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <Tag className="h-3.5 w-3.5 text-slate-400" />
          <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Basic Info</p>
        </div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-3 p-4">
          <ViewRow label="Aircraft Name"    value={aircraft.name} />
          <ViewRow label="Registration"     value={<span className="font-mono font-semibold text-xs">{aircraft.registration}</span>} />
          <ViewRow label="Manufacturer"     value={aircraft.manufacturer} icon={Factory} />
          <ViewRow label="Model"            value={aircraft.model} icon={Layers} />
          <ViewRow label="Category"         value={aircraft.type} />
          <ViewRow label="Aircraft Type"    value={aircraft.aircraftType} />
          <ViewRow label="Seating Capacity" value={aircraft.seatingCapacity} icon={Users} />
          <ViewRow label="Status"           value={<StatusBadge status={aircraft.status} />} />
        </div>
      </div>

      {/* Operational + Usage */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Operational</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
            <ViewRow label="Base Airport (ICAO)" value={aircraft.baseAirportIcao
              ? <span className="font-mono font-semibold text-xs">{aircraft.baseAirportIcao}</span>
              : null} />
            <ViewRow label="Fuel Type" value={aircraft.fuelType} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <Gauge className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Usage</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
            <ViewRow label="Total Hours"      value={aircraft.totalHours      != null ? `${aircraft.totalHours} h`  : null} />
            <ViewRow label="Engine Hours"     value={aircraft.engineHours     != null ? `${aircraft.engineHours} h` : null} />
            <ViewRow label="Last Flight Date" value={aircraft.lastFlightDate  ? format(new Date(aircraft.lastFlightDate), 'd MMM yyyy') : null} icon={Clock} />
            <ViewRow label="Last Hobbs"       value={aircraft.lastHobbs       != null ? `${aircraft.lastHobbs} h`   : null} />
          </div>
        </div>
      </div>

      {/* Maintenance */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <Wrench className="h-3.5 w-3.5 text-slate-400" />
          <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Maintenance</p>
        </div>
        <div className="grid grid-cols-4 gap-x-4 gap-y-3 p-4">
          <ViewRow label="Next Service (h)"    value={aircraft.nextServiceDueHours != null ? `${aircraft.nextServiceDueHours} h` : null} />
          <ViewRow label="Next Service (Date)" value={aircraft.nextServiceDueDate  ? format(new Date(aircraft.nextServiceDueDate), 'd MMM yyyy') : null} icon={Calendar} />
          <ViewRow label="Airworthiness"       value={aircraft.airworthinessStatus} icon={Shield} />
          <ViewRow label="Insurance Expiry"    value={aircraft.insuranceExpiry ? format(new Date(aircraft.insuranceExpiry), 'd MMM yyyy') : null} />
        </div>
      </div>

      {/* Capabilities + Notes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <Activity className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Capabilities</p>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium border
              ${aircraft.isIfrCapable ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              <Wifi className="h-2.5 w-2.5" />
              IFR {aircraft.isIfrCapable ? 'Capable' : 'Not Capable'}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium border
              ${aircraft.isNightAllowed ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              <Moon className="h-2.5 w-2.5" />
              Night {aircraft.isNightAllowed ? 'Allowed' : 'Not Allowed'}
            </span>
          </div>
        </div>
        {aircraft.notes ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Notes</p>
            </div>
            <p className="text-xs text-foreground whitespace-pre-wrap line-clamp-3 p-4">{aircraft.notes}</p>
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* Schedule blocks */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Schedule Blocks</p>
          </div>
          {!showSchedForm && (
            <button
              onClick={() => { setEditBlock(null); setShowSchedForm(true); }}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add Block
            </button>
          )}
        </div>
        <div className="p-4 space-y-3">
          {showSchedForm && (
            <ScheduleBlockForm
              aircraftId={aircraft.id}
              initial={editBlock}
              onClose={() => { setShowSchedForm(false); setEditBlock(null); }}
            />
          )}

          {schedLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : schedule.length === 0 ? (
            <p className="text-sm text-muted-foreground">No schedule blocks — all dates open.</p>
          ) : (
            <div className="space-y-2">
              {schedule.map(b => {
                const cfg = SCHED_CFG[b.status];
                return (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${cfg.bg} ${cfg.border}`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-medium ${cfg.text} flex items-center gap-1.5`}>
                          <Calendar className="h-3 w-3 shrink-0" />
                          {format(new Date(b.startTime), 'd MMM yyyy, HH:mm')}
                          {' → '}
                          {format(new Date(b.endTime), 'd MMM yyyy, HH:mm')}
                        </p>
                        {b.reason && <p className={`text-xs mt-0.5 opacity-75 ${cfg.text}`}>{b.reason}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      <button
                        onClick={() => { setEditBlock(b); setShowSchedForm(true); }}
                        className="rounded-lg p-1 hover:bg-white/70 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => delSchedMut.mutate(b.id)}
                        className="rounded-lg p-1 hover:bg-white/70 text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Flight Logs Tab ───────────────────────────────────────────────────────────

function FlightLogsTab() {
  return (
    <div className="px-6 py-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
          Flight Logs
        </p>
        <button
          disabled
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground cursor-not-allowed opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Log
        </button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              {['Date', 'Instructor', 'Student', 'Duration', 'Remarks'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                Flight log integration coming soon.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Maintenance Tab (Downtime / Availability audit history) ──────────────────

const DOWN_MAINT: Record<DownStatus, {
  label: string; dot: string; barSolid: string; badge: string; bg: string; text: string; icon: React.ElementType;
}> = {
  MAINTENANCE: { label: 'Maintenance', dot: 'bg-amber-500',  barSolid: 'bg-amber-500',  badge: 'bg-amber-50 border-amber-200 text-amber-700',   bg: 'bg-amber-50',  text: 'text-amber-700',  icon: Wrench       },
  GROUNDED:    { label: 'Grounded',    dot: 'bg-slate-500',  barSolid: 'bg-slate-500',  badge: 'bg-slate-100 border-slate-300 text-slate-700',   bg: 'bg-slate-50',  text: 'text-slate-700',  icon: Ban          },
  DEFECTED:    { label: 'AOG / Defect',dot: 'bg-red-500',    barSolid: 'bg-red-500',    badge: 'bg-red-50 border-red-200 text-red-700',         bg: 'bg-red-50',    text: 'text-red-700',    icon: AlertTriangle },
};

const DEFECT_TYPES_MAINT = [
  'Engine Defect', 'Avionics Fault', 'Airframe Damage', 'Fuel System',
  'Landing Gear', 'Hydraulics', 'Electrical Fault', 'Prop Damage',
  'Scheduled 100-hr', 'Annual Inspection', 'AD Compliance', 'Other',
];

function MaintenanceTab({ aircraft }: { aircraft: AircraftRecord }) {
  const qc = useQueryClient();

  type FormMode = 'none' | 'log' | 'edit' | 'resolve' | 'delete';
  const [formMode,    setFormMode]   = useState<FormMode>('none');
  const [activeRec,   setActiveRec]  = useState<AircraftAvailabilityRecord | null>(null);
  const [expandedId,  setExpandedId] = useState<number | null>(null);

  function toggleExpand(id: number) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  // Log-event form state
  const [evStatus,   setEvStatus]   = useState<DownStatus>('MAINTENANCE');
  const [evDefect,   setEvDefect]   = useState('');
  const [evDiag,     setEvDiag]     = useState('');
  const [evBrief,    setEvBrief]    = useState('');
  const [evDate,     setEvDate]     = useState(new Date().toISOString().slice(0, 10));
  const [evRemarks,  setEvRemarks]  = useState('');

  // Resolve form state
  const [resDate,    setResDate]    = useState(new Date().toISOString().slice(0, 10));
  const [resBy,      setResBy]      = useState('');
  const [resRemarks, setResRemarks] = useState('');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['aircraft-availability', aircraft.id] });
    qc.invalidateQueries({ queryKey: ['aircraft-availability'] });
    qc.invalidateQueries({ queryKey: ['aircraft-list'] });
  };

  const { data, isLoading } = useQuery({
    queryKey: ['aircraft-availability', aircraft.id],
    queryFn:  () => getAircraftAvailability({ aircraft_id: aircraft.id }),
  });
  const records: AircraftAvailabilityRecord[] = data?.records ?? [];

  const createMut  = useMutation({ mutationFn: createAvailabilityEvent,  onSuccess: () => { invalidate(); resetForm(); } });
  const updateMut  = useMutation({ mutationFn: ({ id, body }: { id: number; body: any }) => updateAvailabilityEvent(id, body), onSuccess: () => { invalidate(); setFormMode('none'); setActiveRec(null); } });
  const resolveMut = useMutation({ mutationFn: ({ id, body }: { id: number; body: any }) => resolveAvailabilityEvent(id, body), onSuccess: () => { invalidate(); setFormMode('none'); setActiveRec(null); } });
  const deleteMut  = useMutation({ mutationFn: deleteAvailabilityEvent,  onSuccess: () => { invalidate(); setFormMode('none'); setActiveRec(null); } });

  function resetForm() {
    setFormMode('none'); setActiveRec(null);
    setEvStatus('MAINTENANCE'); setEvDefect(''); setEvDiag(''); setEvBrief(''); setEvDate(new Date().toISOString().slice(0, 10)); setEvRemarks('');
  }

  function openEdit(rec: AircraftAvailabilityRecord) {
    setActiveRec(rec);
    setEvStatus(rec.status); setEvDefect(rec.defectType ?? ''); setEvDiag(rec.diagnosedBy ?? '');
    setEvBrief(rec.issueBrief ?? ''); setEvDate(rec.groundedDate ?? new Date().toISOString().slice(0, 10)); setEvRemarks(rec.remarks ?? '');
    setExpandedId(null);
    setFormMode('edit');
  }

  function submitLog(e: React.FormEvent) {
    e.preventDefault();
    if (formMode === 'edit' && activeRec) {
      updateMut.mutate({ id: activeRec.id, body: { status: evStatus, defect_type: evDefect || undefined, diagnosed_by: evDiag || undefined, issue_brief: evBrief || undefined, grounded_date: evDate || undefined, remarks: evRemarks || undefined } });
    } else {
      createMut.mutate({ aircraft_id: aircraft.id, status: evStatus, defect_type: evDefect || undefined, diagnosed_by: evDiag || undefined, issue_brief: evBrief || undefined, grounded_date: evDate || undefined, remarks: evRemarks || undefined });
    }
  }

  const isMutating = createMut.isPending || updateMut.isPending || resolveMut.isPending || deleteMut.isPending;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="px-5 py-4 space-y-3 bg-[#F8FAFC] min-h-full overflow-auto">

      {/* Status banner */}
      {(() => {
        const isDown = aircraft.status !== 'OPERATIONAL';
        const latest = records.find(r => r.isLatest && !r.fixedDate);
        return (
          <div className={`rounded-xl border flex items-center justify-between gap-3 px-4 py-2.5 ${isDown ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isDown ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span className={`text-xs font-semibold ${isDown ? 'text-amber-800' : 'text-emerald-800'}`}>
                {isDown ? `${aircraft.status}${latest?.defectType ? ` · ${latest.defectType}` : ''}` : 'Operational — available for scheduling'}
              </span>
              {isDown && latest?.groundedDate && (
                <span className="text-[10px] text-amber-600">since {format(new Date(latest.groundedDate), 'd MMM yyyy')}</span>
              )}
            </div>
            {formMode === 'none' && (
              <button onClick={() => { resetForm(); setFormMode('log'); }}
                className="flex items-center gap-1 rounded-lg border border-current bg-white px-2.5 py-1 text-[10px] font-semibold text-amber-700 hover:bg-amber-50 transition-colors shrink-0">
                <Plus className="h-3 w-3" />
                Log Event
              </button>
            )}
          </div>
        );
      })()}

      {/* Inline log / edit form */}
      {(formMode === 'log' || formMode === 'edit') && (
        <form onSubmit={submitLog}
          className="rounded-2xl border border-blue-200 bg-white shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-blue-500" />
              <p className="text-[10px] font-bold tracking-[0.18em] text-blue-700 uppercase">
                {formMode === 'edit' ? 'Edit Event' : 'Log Downtime Event'}
              </p>
            </div>
            <button type="button" onClick={resetForm} className="rounded-lg p-1 hover:bg-blue-100 text-blue-400 hover:text-blue-700">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {/* Status picker */}
            <div>
              <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1.5">Event Type</p>
              <div className="flex gap-2">
                {(Object.keys(DOWN_MAINT) as DownStatus[]).map(s => {
                  const cfg = DOWN_MAINT[s]; const Icon = cfg.icon; const sel = evStatus === s;
                  return (
                    <button key={s} type="button" onClick={() => setEvStatus(s)}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${sel ? `${cfg.bg} border-current ${cfg.text} ring-2 ring-offset-1 ring-current/30` : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      <Icon className="h-3 w-3" />{cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Row 1 */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1">Defect / Event Type</label>
                <select value={evDefect} onChange={e => setEvDefect(e.target.value)} className="form-input">
                  <option value="">— Select —</option>
                  {DEFECT_TYPES_MAINT.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1">Diagnosed / Reported By</label>
                <input value={evDiag} onChange={e => setEvDiag(e.target.value)} placeholder="e.g. Rajesh Kumar" className="form-input" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1">Grounded Date</label>
                <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)} className="form-input" />
              </div>
            </div>
            {/* Row 2 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1">Issue Brief</label>
                <textarea value={evBrief} onChange={e => setEvBrief(e.target.value)} rows={2} placeholder="Describe the defect or reason…" className="form-input resize-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1">Remarks</label>
                <textarea value={evRemarks} onChange={e => setEvRemarks(e.target.value)} rows={2} placeholder="Parts required, notes…" className="form-input resize-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={isMutating}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40 transition-colors">
                <Save className="h-3 w-3" />
                {isMutating ? 'Saving…' : formMode === 'edit' ? 'Update' : 'Log Event'}
              </button>
              <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </form>
      )}

      {/* Inline resolve form */}
      {formMode === 'resolve' && activeRec && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-800">Mark as Resolved</p>
            </div>
            <button onClick={() => { setFormMode('none'); setActiveRec(null); }} className="rounded-lg p-0.5 hover:bg-emerald-100 text-emerald-600"><X className="h-3.5 w-3.5" /></button>
          </div>
          <p className="text-xs text-emerald-700"><strong>{aircraft.registration}</strong> will be set back to <strong>OPERATIONAL</strong>.</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-emerald-700 uppercase mb-1">Fixed Date *</label>
              <input type="date" required value={resDate} onChange={e => setResDate(e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-emerald-700 uppercase mb-1">Fixed By</label>
              <input value={resBy} onChange={e => setResBy(e.target.value)} placeholder="AME name / licence" className="form-input" />
            </div>
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-emerald-700 uppercase mb-1">Closing Remarks</label>
              <input value={resRemarks} onChange={e => setResRemarks(e.target.value)} placeholder="e.g. Part replaced" className="form-input" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => resolveMut.mutate({ id: activeRec.id, body: { fixed_date: resDate, fixed_by: resBy || undefined, remarks: resRemarks || undefined } })}
              disabled={isMutating || !resDate}
              className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors">
              {isMutating ? 'Resolving…' : 'Confirm Resolution'}
            </button>
            <button onClick={() => { setFormMode('none'); setActiveRec(null); }} className="rounded-xl border border-emerald-200 px-4 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">Cancel</button>
          </div>
        </div>
      )}

      {/* History list */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] text-slate-400 uppercase mb-2">
          {isLoading ? 'Loading…' : records.length === 0 ? 'No events recorded' : `Downtime History — ${records.length} event${records.length !== 1 ? 's' : ''}`}
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <RefreshCw className="h-4 w-4 animate-spin" /> Loading history…
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 rounded-2xl border border-dashed border-slate-200 bg-white">
            <CheckCircle2 className="h-8 w-8 text-emerald-200" />
            <p className="text-sm font-semibold text-slate-500">No downtime events</p>
            <p className="text-xs text-slate-400">This aircraft has been continuously operational.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map(rec => {
              const cfg        = DOWN_MAINT[rec.status as DownStatus] ?? DOWN_MAINT['MAINTENANCE'];
              const Icon       = cfg.icon;
              const isActive   = rec.isLatest && !rec.fixedDate;
              const isExpanded = expandedId === rec.id;
              const isDeleteTarget = formMode === 'delete' && activeRec?.id === rec.id;

              if (isDeleteTarget) return (
                <div key={rec.id} className="rounded-xl border border-red-200 bg-red-50 p-3 animate-in fade-in duration-150">
                  <p className="text-sm font-semibold text-red-800 mb-0.5">Remove this event?</p>
                  <p className="text-xs text-red-600 mb-2.5">This permanently deletes the audit record.</p>
                  <div className="flex gap-2">
                    <button onClick={() => deleteMut.mutate(rec.id)} disabled={isMutating}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                      {isMutating ? 'Removing…' : 'Yes, Remove'}
                    </button>
                    <button onClick={() => { setFormMode('none'); setActiveRec(null); }}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white">
                      Cancel
                    </button>
                  </div>
                </div>
              );

              return (
                <div key={rec.id} className={`relative rounded-xl border bg-white overflow-hidden transition-shadow ${isActive ? 'shadow-sm' : 'opacity-80'} ${isExpanded ? 'shadow-md' : ''}`}>
                  {/* Left colour bar */}
                  <span className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.barSolid} ${!isActive ? 'opacity-30' : ''}`} />

                  {/* ── Clickable header row ── */}
                  <div
                    onClick={() => formMode === 'none' && toggleExpand(rec.id)}
                    className={`pl-4 pr-3 py-2.5 flex items-center gap-2 select-none ${formMode === 'none' ? 'cursor-pointer hover:bg-slate-50/70' : ''} transition-colors`}
                  >
                    {/* Icon */}
                    <div className={`shrink-0 rounded-lg p-1.5 ${cfg.bg}`}>
                      <Icon className={`h-3 w-3 ${cfg.text}`} />
                    </div>

                    {/* Badges + preview */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`shrink-0 inline-flex items-center gap-1 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        {rec.defectType && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{rec.defectType}</span>
                        )}
                        {isActive  && <span className="text-[9px] font-bold tracking-wider bg-red-100 text-red-700 rounded-full px-2 py-0.5">Active</span>}
                        {rec.fixedDate && <span className="text-[9px] font-bold tracking-wider bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">Resolved</span>}
                      </div>
                      {/* Collapsed: show brief preview + compact date meta */}
                      {!isExpanded && (
                        <div className="flex flex-wrap items-center gap-3 mt-0.5">
                          {rec.issueBrief && <p className="text-[11px] text-slate-400 line-clamp-1">{rec.issueBrief}</p>}
                          {rec.groundedDate && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Clock className="h-2.5 w-2.5" />
                              {format(new Date(rec.groundedDate), 'd MMM yyyy')}
                              {rec.fixedDate && <span className="text-slate-300 mx-0.5">→</span>}
                              {rec.fixedDate && <span className="text-emerald-600">{format(new Date(rec.fixedDate), 'd MMM yyyy')}</span>}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Edit+Delete (collapsed only) + chevron */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!isExpanded && formMode === 'none' && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); openEdit(rec); }}
                            className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setActiveRec(rec); setExpandedId(null); setFormMode('delete'); }}
                            className="rounded-lg p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                      <ChevronDown className={`h-3.5 w-3.5 text-slate-300 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* ── Expanded detail panel ── */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-4 pt-3 pb-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                      {/* Detail grid */}
                      <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                        {rec.groundedDate && (
                          <div>
                            <p className="text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-0.5">Grounded Date</p>
                            <p className="text-xs font-medium text-slate-700 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {format(new Date(rec.groundedDate), 'd MMM yyyy')}
                            </p>
                          </div>
                        )}
                        {rec.fixedDate ? (
                          <div>
                            <p className="text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-0.5">Fixed Date</p>
                            <p className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {format(new Date(rec.fixedDate), 'd MMM yyyy')}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-0.5">Fixed Date</p>
                            <p className="text-[10px] text-slate-300 italic">Not resolved yet</p>
                          </div>
                        )}
                        {rec.diagnosedBy && (
                          <div>
                            <p className="text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-0.5">Diagnosed By</p>
                            <p className="text-xs font-medium text-slate-700 flex items-center gap-1">
                              <UserCheck className="h-3 w-3 text-slate-400" />
                              {rec.diagnosedBy}
                            </p>
                          </div>
                        )}
                        {rec.fixedBy && (
                          <div>
                            <p className="text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-0.5">Fixed By</p>
                            <p className="text-xs font-medium text-slate-700">{rec.fixedBy}</p>
                          </div>
                        )}
                      </div>
                      {rec.issueBrief && (
                        <div>
                          <p className="text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-0.5">Issue Brief</p>
                          <p className="text-xs text-slate-600 whitespace-pre-wrap">{rec.issueBrief}</p>
                        </div>
                      )}
                      {rec.remarks && (
                        <div>
                          <p className="text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-0.5">Remarks</p>
                          <p className="text-xs text-slate-500 italic">{rec.remarks}</p>
                        </div>
                      )}

                      {/* Expanded actions */}
                      {formMode === 'none' && (
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                          {isActive && (
                            <button
                              onClick={() => { setActiveRec(rec); setResDate(new Date().toISOString().slice(0,10)); setResBy(''); setResRemarks(''); setFormMode('resolve'); }}
                              className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                            >
                              <CheckCircle2 className="h-3 w-3" />Resolve
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(rec)}
                            className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            <Pencil className="h-3 w-3" />Edit
                          </button>
                          <button
                            onClick={() => { setActiveRec(rec); setExpandedId(null); setFormMode('delete'); }}
                            className="ml-auto flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-semibold text-red-600 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type PanelMode = 'empty' | 'add' | 'view' | 'delete-confirm';

export default function AircraftPage() {
  const qc = useQueryClient();

  const [selectedId,   setSelectedId]   = useState<number | null>(null);
  const [panelMode,    setPanelMode]     = useState<PanelMode>('empty');
  const [search,       setSearch]        = useState('');
  const [formError,    setFormError]     = useState('');

  // ── Data ─────────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['aircraft-list'],
    queryFn:  () => listAircraft(),
  });

  const allAircraft: AircraftRecord[] = data?.aircraft ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return allAircraft;
    const q = search.toLowerCase();
    return allAircraft.filter(a =>
      (a.name ?? '').toLowerCase().includes(q) ||
      a.registration.toLowerCase().includes(q) ||
      (a.model ?? '').toLowerCase().includes(q),
    );
  }, [allAircraft, search]);

  const selected = allAircraft.find(a => a.id === selectedId) ?? null;
  const hasSelection = panelMode === 'view' || panelMode === 'delete-confirm';

  // ── Stats ─────────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:       allAircraft.length,
    operational: allAircraft.filter(a => a.status === 'OPERATIONAL').length,
    maintenance: allAircraft.filter(a => a.status === 'MAINTENANCE').length,
    grounded:    allAircraft.filter(a => a.status === 'GROUNDED').length,
  }), [allAircraft]);

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: createAircraft,
    onSuccess: (ac) => {
      qc.invalidateQueries({ queryKey: ['aircraft-list'] });
      setSelectedId(ac.id);
      setPanelMode('view');
      setFormError('');
    },
    onError: (e: any) => setFormError(e?.response?.data?.detail ?? 'Failed to create aircraft.'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteAircraft,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aircraft-list'] });
      setSelectedId(null);
      setPanelMode('empty');
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleSelectAircraft(id: number) {
    if (selectedId === id && panelMode === 'view') {
      setSelectedId(null);
      setPanelMode('empty');
    } else {
      setSelectedId(id);
      setPanelMode('view');
    }
  }

  function handleAddClick() {
    setSelectedId(null);
    setPanelMode('add');
    setFormError('');
  }

  function handleCancelAdd() {
    setPanelMode(selectedId !== null ? 'view' : 'empty');
  }

  function handleDeleteRequest() {
    setPanelMode('delete-confirm');
  }

  function handleCancelDelete() {
    setPanelMode('view');
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── White page header ───────────────────────────────────── */}
      <PageHeader
        module="Fleet Management"
        title="Aircraft Registry"
        icon={Plane}
        description="Manage aircraft records, availability blocks, and maintenance status"
      >
        {/* Fleet stats */}
        <div className="flex items-center gap-2 border-r border-slate-200 pr-6">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center min-w-[56px] border-t-2 border-t-slate-400 shadow-sm">
            <p className="text-lg font-bold leading-none text-slate-900">{stats.total}</p>
            <p className="text-[9px] font-semibold tracking-widest mt-1 text-slate-400">TOTAL</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center min-w-[56px] border-t-2 border-t-emerald-500 shadow-sm">
            <p className="text-lg font-bold leading-none text-emerald-600">{stats.operational}</p>
            <p className="text-[9px] font-semibold tracking-widest mt-1 text-slate-400">AVAIL</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center min-w-[56px] border-t-2 border-t-amber-400 shadow-sm">
            <p className="text-lg font-bold leading-none text-amber-500">{stats.maintenance}</p>
            <p className="text-[9px] font-semibold tracking-widest mt-1 text-slate-400">MAINT</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center min-w-[56px] border-t-2 border-t-red-500 shadow-sm">
            <p className="text-lg font-bold leading-none text-red-500">{stats.grounded}</p>
            <p className="text-[9px] font-semibold tracking-widest mt-1 text-slate-400">GRNDED</p>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {}}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={handleAddClick}
            className="group flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors shadow-sm shadow-blue-500/25"
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-200" />
            Add Aircraft
          </button>
        </div>
      </PageHeader>

      {/* ── Main split layout ───────────────────────────────────── */}
      <div className={`flex-1 overflow-hidden grid gap-4 p-4 transition-all duration-300
        ${hasSelection ? 'grid-cols-[minmax(0,3fr)_minmax(0,9fr)]' : 'grid-cols-[minmax(0,4fr)_minmax(0,8fr)]'}`}>

        {/* ── LEFT: Aircraft list ──────────────────────────────── */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">

          {/* List header */}
          <div className="px-4 pt-4 pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2 mb-2.5">
              <BarChart3 className="h-3.5 w-3.5 text-slate-400" />
              <SectionLabel>Aircraft Roster</SectionLabel>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search aircraft…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-colors"
              />
            </div>
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {isLoading ? (
              <>
                {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
              </>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <Plane className="h-6 w-6 opacity-20" />
                <p className="text-xs text-center">
                  {search ? 'No aircraft match your search' : 'No aircraft on record'}
                </p>
              </div>
            ) : (
              filtered.map(ac => (
                <AircraftCard
                  key={ac.id}
                  aircraft={ac}
                  selected={ac.id === selectedId && hasSelection}
                  onClick={() => handleSelectAircraft(ac.id)}
                />
              ))
            )}
          </div>

          {/* Add button */}
          <div className="p-3 border-t border-slate-100 shrink-0">
            <button
              onClick={handleAddClick}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Aircraft
            </button>
          </div>
        </div>

        {/* ── RIGHT: Work area ─────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/50 flex flex-col">

          {/* Empty / loading state */}
          {panelMode === 'empty' && (
            isLoading ? (
              <AircraftLoader />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <AircraftHologram />
              </div>
            )
          )}

          {/* Add aircraft form */}
          {panelMode === 'add' && (
            <AircraftForm
              title="Add New Aircraft"
              saving={createMut.isPending}
              error={formError}
              onSave={body => { setFormError(''); createMut.mutate(body); }}
              onCancel={handleCancelAdd}
            />
          )}

          {/* Aircraft detail + tabs */}
          {(panelMode === 'view' || panelMode === 'delete-confirm') && selected && (
            <div className="flex flex-col h-full overflow-hidden">

              {/* Aircraft header card */}
              {panelMode !== 'delete-confirm' && (() => {
                const cfg = STATUS_CFG[selected.status];
                return (
                  <div className="relative px-6 py-4 border-b border-slate-100 shrink-0 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 to-white overflow-hidden">
                    <span className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.barSolid}`} />
                    <div className="pl-3">
                      <p className="font-bold text-base text-slate-900">
                        {selected.name || selected.registration}
                      </p>
                      <p className="text-sm text-slate-500 font-mono">
                        {selected.registration}
                        {selected.type ? ` · ${selected.type}` : ''}
                        {selected.model ? ` ${selected.model}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>
                );
              })()}

              {/* Delete confirmation */}
              {panelMode === 'delete-confirm' && (
                <div className="m-4 rounded-2xl border border-red-200 bg-red-50 p-5 space-y-4 shrink-0 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-red-100 p-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-red-900">Remove Aircraft</p>
                      <p className="text-xs text-red-700 mt-0.5">This action can be undone by support.</p>
                    </div>
                  </div>
                  <p className="text-sm text-red-800">
                    <strong>{selected.name || selected.registration}</strong>
                    {' '}({selected.registration}) will be marked inactive and hidden from all scheduling.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => deleteMut.mutate(selected.id)}
                      disabled={deleteMut.isPending}
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {deleteMut.isPending ? 'Removing…' : 'Yes, Remove Aircraft'}
                    </button>
                    <button
                      onClick={handleCancelDelete}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Tabs */}
              {panelMode === 'view' && (
                <Tabs defaultValue="info" className="flex flex-col flex-1 overflow-hidden">
                  <div className="px-6 pt-3 shrink-0 border-b border-slate-100">
                    <TabsList className="h-9 bg-transparent p-0 gap-0">
                      <TabsTrigger
                        value="info"
                        className="flex items-center gap-1.5 rounded-none border-b-[3px] border-transparent px-4 py-2 text-xs font-medium text-slate-400 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        Info
                      </TabsTrigger>
                      <TabsTrigger
                        value="flightlogs"
                        className="flex items-center gap-1.5 rounded-none border-b-[3px] border-transparent px-4 py-2 text-xs font-medium text-slate-400 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all"
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                        Flight Logs
                      </TabsTrigger>
                      <TabsTrigger
                        value="maintenance"
                        className="flex items-center gap-1.5 rounded-none border-b-[3px] border-transparent px-4 py-2 text-xs font-medium text-slate-400 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        Maintenance
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="info" className="flex-1 overflow-hidden m-0">
                    <InfoTab
                      key={selected.id}
                      aircraft={selected}
                      onDelete={handleDeleteRequest}
                    />
                  </TabsContent>
                  <TabsContent value="flightlogs" className="flex-1 overflow-auto m-0">
                    <FlightLogsTab />
                  </TabsContent>
                  <TabsContent value="maintenance" className="flex-1 overflow-auto m-0">
                    <MaintenanceTab key={selected.id} aircraft={selected} />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
