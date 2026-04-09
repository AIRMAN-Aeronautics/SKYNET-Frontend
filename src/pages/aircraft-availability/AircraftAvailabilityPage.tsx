import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Plus, Pencil, Trash2, X, Plane, Wrench, Ban, AlertTriangle,
  CheckCircle2, Clock, Search, ChevronRight, BarChart3, Save,
  UserCheck, ClipboardList,
} from 'lucide-react';
import {
  getAircraftAvailability, createAvailabilityEvent,
  updateAvailabilityEvent, resolveAvailabilityEvent, deleteAvailabilityEvent,
  type AircraftAvailabilityRecord, type DownStatus,
} from '@/lib/api/aircraftAvailability';
import { listAircraft, type AircraftRecord } from '@/lib/api/aircraft';

// ── Constants ──────────────────────────────────────────────────────────────────

const DOWN_CFG: Record<DownStatus, {
  label: string; dot: string; barSolid: string;
  badge: string; bg: string; text: string; icon: React.ElementType;
}> = {
  MAINTENANCE: {
    label: 'Maintenance', dot: 'bg-amber-500', barSolid: 'bg-amber-500',
    badge: 'bg-amber-50 border-amber-200 text-amber-700',
    bg: 'bg-amber-50', text: 'text-amber-700', icon: Wrench,
  },
  GROUNDED: {
    label: 'Grounded', dot: 'bg-slate-500', barSolid: 'bg-slate-500',
    badge: 'bg-slate-100 border-slate-300 text-slate-700',
    bg: 'bg-slate-50', text: 'text-slate-700', icon: Ban,
  },
  DEFECTED: {
    label: 'AOG / Defect', dot: 'bg-red-500', barSolid: 'bg-red-500',
    badge: 'bg-red-50 border-red-200 text-red-700',
    bg: 'bg-red-50', text: 'text-red-700', icon: AlertTriangle,
  },
};

const DEFECT_TYPES = [
  'Engine Defect', 'Avionics Fault', 'Airframe Damage', 'Fuel System',
  'Landing Gear', 'Hydraulics', 'Electrical Fault', 'Prop Damage',
  'Scheduled 100-hr', 'Annual Inspection', 'AD Compliance', 'Other',
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DownStatus }) {
  const cfg = DOWN_CFG[status];
  return (
    <span className={`shrink-0 inline-flex items-center gap-1 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full border ${cfg.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Log Event Form ─────────────────────────────────────────────────────────────

function EventForm({
  aircraft,
  initial,
  onSave,
  onCancel,
  saving,
}: {
  aircraft: AircraftRecord[];
  initial?: AircraftAvailabilityRecord | null;
  onSave: (data: any) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [aircraftId,   setAircraftId]   = useState<number | ''>(initial?.aircraftId ?? '');
  const [status,       setStatus]       = useState<DownStatus>(initial?.status ?? 'MAINTENANCE');
  const [defectType,   setDefectType]   = useState(initial?.defectType ?? '');
  const [issueBrief,   setIssueBrief]   = useState(initial?.issueBrief ?? '');
  const [diagnosedBy,  setDiagnosedBy]  = useState(initial?.diagnosedBy ?? '');
  const [groundedDate, setGroundedDate] = useState(initial?.groundedDate ?? new Date().toISOString().slice(0, 10));
  const [remarks,      setRemarks]      = useState(initial?.remarks ?? '');

  const isEdit = !!initial;
  const canSave = isEdit || aircraftId !== '';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    onSave({
      aircraft_id:   isEdit ? initial!.aircraftId : aircraftId as number,
      status,
      defect_type:   defectType  || undefined,
      issue_brief:   issueBrief  || undefined,
      diagnosed_by:  diagnosedBy || undefined,
      grounded_date: groundedDate || undefined,
      remarks:       remarks     || undefined,
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white shrink-0">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-slate-400 uppercase mb-0.5">Aircraft Availability</p>
          <h2 className="text-base font-bold text-slate-900">
            {isEdit ? 'Edit Downtime Event' : 'Log Downtime Event'}
          </h2>
        </div>
        <button onClick={onCancel} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4 bg-[#F8FAFC]">

        {/* Aircraft + Date */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <Plane className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Aircraft & Date</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
            <Field label="Aircraft *">
              {isEdit ? (
                <div className="form-input bg-slate-50 text-slate-600 cursor-not-allowed">
                  {initial!.aircraftCode}{initial!.aircraftType ? ` · ${initial!.aircraftType}` : ''}
                </div>
              ) : (
                <select required value={aircraftId} onChange={e => setAircraftId(e.target.value ? parseInt(e.target.value, 10) : '')} className="form-input">
                  <option value="">— Select aircraft —</option>
                  {aircraft.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.registration}{a.name ? ` · ${a.name}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Grounded Date">
              <input type="date" value={groundedDate} onChange={e => setGroundedDate(e.target.value)} className="form-input" />
            </Field>
          </div>
        </div>

        {/* Downtime type */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Downtime Type</p>
          </div>
          <div className="grid grid-cols-3 gap-3 p-4">
            {(Object.keys(DOWN_CFG) as DownStatus[]).map(s => {
              const cfg = DOWN_CFG[s];
              const Icon = cfg.icon;
              const sel = status === s;
              return (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                    sel ? `${cfg.bg} border-current ${cfg.text} ring-2 ring-offset-1 ring-current/30` : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}>
                  <Icon className="h-3.5 w-3.5" />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Defect details */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Defect Details</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
            <Field label="Defect / Event Type">
              <select value={defectType} onChange={e => setDefectType(e.target.value)} className="form-input">
                <option value="">— Select —</option>
                {DEFECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Diagnosed / Reported By">
              <input value={diagnosedBy} onChange={e => setDiagnosedBy(e.target.value)} placeholder="e.g. Rajesh Kumar (AME)" className="form-input" />
            </Field>
            <div className="col-span-2">
              <Field label="Issue Brief">
                <textarea value={issueBrief} onChange={e => setIssueBrief(e.target.value)} rows={2}
                  placeholder="Describe the defect or reason for grounding…" className="form-input resize-none" />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Remarks">
                <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
                  placeholder="Additional notes, parts required, etc." className="form-input resize-none" />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1 pb-1 sticky bottom-0 bg-[#F8FAFC]">
          <button type="submit" disabled={saving || !canSave}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-blue-200 transition-colors">
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : isEdit ? 'Update Event' : 'Log Event'}
          </button>
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Resolve Form ───────────────────────────────────────────────────────────────

function ResolveForm({
  record, onSave, onCancel, saving,
}: {
  record: AircraftAvailabilityRecord;
  onSave: (data: any) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [fixedDate, setFixedDate] = useState(new Date().toISOString().slice(0, 10));
  const [fixedBy,   setFixedBy]   = useState('');
  const [remarks,   setRemarks]   = useState('');

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <p className="text-sm font-semibold text-emerald-800">Mark as Resolved</p>
        </div>
        <button onClick={onCancel} className="rounded-lg p-0.5 hover:bg-emerald-100 text-emerald-600">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-xs text-emerald-700">
        <strong>{record.aircraftCode}</strong> will be set back to <strong>OPERATIONAL</strong>.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold tracking-wider text-emerald-700 uppercase mb-1">Fixed Date *</label>
          <input type="date" required value={fixedDate} onChange={e => setFixedDate(e.target.value)} className="form-input" />
        </div>
        <div>
          <label className="block text-[11px] font-bold tracking-wider text-emerald-700 uppercase mb-1">Fixed By</label>
          <input value={fixedBy} onChange={e => setFixedBy(e.target.value)} placeholder="e.g. AME Name / Lic. No." className="form-input" />
        </div>
        <div className="col-span-2">
          <label className="block text-[11px] font-bold tracking-wider text-emerald-700 uppercase mb-1">Closing Remarks</label>
          <input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Part replaced, test flight completed" className="form-input" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave({ fixed_date: fixedDate, fixed_by: fixedBy || undefined, remarks: remarks || undefined })}
          disabled={saving || !fixedDate}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors">
          {saving ? 'Resolving…' : 'Confirm Resolution'}
        </button>
        <button onClick={onCancel} className="rounded-xl border border-emerald-200 px-4 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── History Row ────────────────────────────────────────────────────────────────

function HistoryRow({ record, onEdit, onDelete, onResolve }: {
  record: AircraftAvailabilityRecord;
  onEdit: () => void; onDelete: () => void; onResolve: () => void;
}) {
  const cfg = DOWN_CFG[record.status];
  const Icon = cfg.icon;
  const isActive = record.isLatest && !record.fixedDate;

  return (
    <div className={`relative rounded-xl border bg-white overflow-hidden transition-all ${isActive ? 'shadow-sm' : 'opacity-80'}`}>
      <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${cfg.barSolid} ${!isActive ? 'opacity-30' : ''}`} />
      <div className="pl-5 pr-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`shrink-0 rounded-lg p-1.5 ${cfg.bg}`}>
              <Icon className={`h-3.5 w-3.5 ${cfg.text}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={record.status} />
                {record.defectType && (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{record.defectType}</span>
                )}
                {isActive && (
                  <span className="text-[9px] font-bold tracking-wider bg-red-100 text-red-700 rounded-full px-2 py-0.5 uppercase">Active</span>
                )}
                {record.fixedDate && (
                  <span className="text-[9px] font-bold tracking-wider bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 uppercase">Resolved</span>
                )}
              </div>
              {record.issueBrief && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{record.issueBrief}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isActive && (
              <button onClick={onResolve}
                className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                <CheckCircle2 className="h-3 w-3" />
                Resolve
              </button>
            )}
            <button onClick={onEdit} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
              <Pencil className="h-3 w-3" />
            </button>
            <button onClick={onDelete} className="rounded-lg p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-2 pl-9">
          {record.groundedDate && (
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock className="h-2.5 w-2.5" />
              <span>Grounded: <strong className="text-slate-600">{format(new Date(record.groundedDate), 'd MMM yyyy')}</strong></span>
            </div>
          )}
          {record.fixedDate && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-600">
              <CheckCircle2 className="h-2.5 w-2.5" />
              <span>Fixed: <strong>{format(new Date(record.fixedDate), 'd MMM yyyy')}</strong>
                {record.fixedBy && <span className="text-slate-400"> by {record.fixedBy}</span>}
              </span>
            </div>
          )}
          {record.diagnosedBy && (
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <UserCheck className="h-2.5 w-2.5" />
              <span>By: <strong className="text-slate-600">{record.diagnosedBy}</strong></span>
            </div>
          )}
          {record.remarks && (
            <span className="text-[10px] text-slate-400 italic truncate max-w-xs">{record.remarks}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Aircraft Summary Card ──────────────────────────────────────────────────────

function AircraftSummaryCard({ aircraft, latestEvent, selected, onClick }: {
  aircraft: AircraftRecord;
  latestEvent: AircraftAvailabilityRecord | undefined;
  selected: boolean;
  onClick: () => void;
}) {
  const isDown = aircraft.status !== 'OPERATIONAL';
  const barColor = isDown
    ? aircraft.status === 'MAINTENANCE' ? 'bg-amber-500' : 'bg-red-500'
    : 'bg-emerald-500';

  return (
    <button onClick={onClick}
      className={`group w-full text-left relative rounded-xl border bg-white overflow-hidden transition-all duration-150 ${
        selected ? 'border-blue-400 shadow-md ring-1 ring-blue-400/30 -translate-y-0.5' : 'border-slate-200 hover:border-blue-300 hover:-translate-y-0.5 hover:shadow-md'
      }`}>
      <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${barColor}`} />
      <div className="flex items-center justify-between gap-2 pl-5 pr-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-foreground truncate">
            {aircraft.registration}
            {aircraft.name ? <span className="text-slate-400 font-normal"> · {aircraft.name}</span> : ''}
          </p>
          <p className="text-[10px] mt-0.5 truncate">
            {isDown
              ? <span className={aircraft.status === 'MAINTENANCE' ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {aircraft.status}{latestEvent?.defectType ? ` · ${latestEvent.defectType}` : ''}
                </span>
              : <span className="text-emerald-600 font-semibold">Operational</span>
            }
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full border ${
            isDown
              ? aircraft.status === 'MAINTENANCE' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isDown ? (aircraft.status === 'MAINTENANCE' ? 'bg-amber-500' : 'bg-red-500') : 'bg-emerald-500'}`} />
            {isDown ? (aircraft.status === 'MAINTENANCE' ? 'Maint.' : 'Down') : 'OK'}
          </span>
          <ChevronRight className={`h-3.5 w-3.5 text-slate-300 transition-all ${selected ? 'opacity-100 text-blue-400' : 'opacity-0 group-hover:opacity-100'}`} />
        </div>
      </div>
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

type PanelMode = 'empty' | 'log' | 'edit' | 'view';

export default function AircraftAvailabilityPage() {
  const qc = useQueryClient();

  const [selectedAcId, setSelectedAcId] = useState<number | null>(null);
  const [panelMode,    setPanelMode]     = useState<PanelMode>('empty');
  const [editRecord,   setEditRecord]    = useState<AircraftAvailabilityRecord | null>(null);
  const [resolveRec,   setResolveRec]    = useState<AircraftAvailabilityRecord | null>(null);
  const [deleteTarget, setDeleteTarget]  = useState<AircraftAvailabilityRecord | null>(null);
  const [search,       setSearch]        = useState('');

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: acData, isLoading: acLoading } = useQuery({
    queryKey: ['aircraft-list'],
    queryFn:  () => listAircraft(),
  });
  const allAircraft: AircraftRecord[] = acData?.aircraft ?? [];

  const { data: historyData, isLoading: histLoading } = useQuery({
    queryKey: ['aircraft-availability'],
    queryFn:  () => getAircraftAvailability(),
  });
  const allRecords = historyData?.records ?? [];

  // ── Derived ────────────────────────────────────────────────────────────────

  const latestByAc = useMemo(() => {
    const map = new Map<number, AircraftAvailabilityRecord>();
    allRecords.forEach(r => { if (r.isLatest) map.set(r.aircraftId, r); });
    return map;
  }, [allRecords]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allAircraft;
    const q = search.toLowerCase();
    return allAircraft.filter(a =>
      a.registration.toLowerCase().includes(q) || (a.name ?? '').toLowerCase().includes(q)
    );
  }, [allAircraft, search]);

  const selectedAc = allAircraft.find(a => a.id === selectedAcId) ?? null;
  const selectedHistory = useMemo(
    () => allRecords.filter(r => r.aircraftId === selectedAcId),
    [allRecords, selectedAcId]
  );

  const stats = useMemo(() => ({
    total:       allAircraft.length,
    operational: allAircraft.filter(a => a.status === 'OPERATIONAL').length,
    maintenance: allAircraft.filter(a => a.status === 'MAINTENANCE').length,
    grounded:    allAircraft.filter(a => a.status === 'GROUNDED').length,
  }), [allAircraft]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: createAvailabilityEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aircraft-availability'] });
      qc.invalidateQueries({ queryKey: ['aircraft-list'] });
      setPanelMode(selectedAcId ? 'view' : 'empty');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => updateAvailabilityEvent(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aircraft-availability'] });
      qc.invalidateQueries({ queryKey: ['aircraft-list'] });
      setPanelMode('view'); setEditRecord(null);
    },
  });

  const resolveMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => resolveAvailabilityEvent(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aircraft-availability'] });
      qc.invalidateQueries({ queryKey: ['aircraft-list'] });
      setResolveRec(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteAvailabilityEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aircraft-availability'] });
      qc.invalidateQueries({ queryKey: ['aircraft-list'] });
      setDeleteTarget(null);
    },
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden p-5 space-y-4 bg-[#F8FAFC]">

      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
        <div className="absolute top-0 left-1/4 w-64 h-32 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-48 h-24 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="relative px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-blue-400 uppercase mb-0.5">Fleet Operations</p>
            <h2 className="text-white font-bold text-base tracking-wide">Aircraft Availability</h2>
            <p className="text-blue-300/70 text-xs mt-0.5">
              Status derived from aircraft record · Audit trail of all downtime events
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="grid grid-cols-4 gap-5 text-center border-r border-white/10 pr-6">
              <div><p className="text-white text-xl font-bold leading-none">{stats.total}</p><p className="text-blue-400 text-[9px] font-semibold tracking-widest mt-1">TOTAL</p></div>
              <div><p className="text-emerald-400 text-xl font-bold leading-none">{stats.operational}</p><p className="text-blue-400 text-[9px] font-semibold tracking-widest mt-1">OPERATIONAL</p></div>
              <div><p className="text-amber-400 text-xl font-bold leading-none">{stats.maintenance}</p><p className="text-blue-400 text-[9px] font-semibold tracking-widest mt-1">MAINT.</p></div>
              <div><p className="text-red-400 text-xl font-bold leading-none">{stats.grounded}</p><p className="text-blue-400 text-[9px] font-semibold tracking-widest mt-1">GROUNDED</p></div>
            </div>
            <button onClick={() => { setEditRecord(null); setPanelMode('log'); setSelectedAcId(null); }}
              className="group flex items-center gap-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-lg shadow-blue-900/40">
              <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-200" />
              Log Event
            </button>
          </div>
        </div>
      </div>

      {/* Split layout */}
      <div className={`flex-1 overflow-hidden grid gap-4 transition-all duration-300
        ${panelMode !== 'empty' ? 'grid-cols-[minmax(0,3fr)_minmax(0,9fr)]' : 'grid-cols-[minmax(0,4fr)_minmax(0,8fr)]'}`}>

        {/* LEFT: aircraft list */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="px-4 pt-4 pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2 mb-2.5">
              <BarChart3 className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">Fleet Status</p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search aircraft…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-colors" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {acLoading
              ? [1,2,3].map(i => (
                  <div key={i} className="relative rounded-xl border border-slate-200 bg-white px-4 py-3 animate-pulse overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 rounded-l-xl" />
                    <div className="pl-1 space-y-1.5">
                      <div className="h-3 bg-slate-100 rounded w-3/4" />
                      <div className="h-2.5 bg-slate-100 rounded w-2/5" />
                    </div>
                  </div>
                ))
              : filtered.map(ac => (
                  <AircraftSummaryCard key={ac.id} aircraft={ac} latestEvent={latestByAc.get(ac.id)}
                    selected={ac.id === selectedAcId && panelMode === 'view'}
                    onClick={() => { setSelectedAcId(ac.id); setPanelMode('view'); setEditRecord(null); setResolveRec(null); }} />
                ))
            }
          </div>
          <div className="p-3 border-t border-slate-100 shrink-0">
            <button onClick={() => { setEditRecord(null); setPanelMode('log'); setSelectedAcId(null); }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
              <Plus className="h-3.5 w-3.5" />
              Log Downtime Event
            </button>
          </div>
        </div>

        {/* RIGHT: work area */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/50 flex flex-col">

          {panelMode === 'empty' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 flex flex-col items-center gap-3">
                <Plane className="h-10 w-10 opacity-10" />
                <p className="text-sm font-semibold text-slate-500">Select an aircraft</p>
                <p className="text-xs text-center max-w-xs text-slate-400">
                  Click an aircraft to view its downtime history, or use Log Event to record a new grounding.
                </p>
              </div>
            </div>
          )}

          {panelMode === 'log' && (
            <EventForm aircraft={allAircraft}
              onSave={body => createMut.mutate(body)}
              onCancel={() => setPanelMode(selectedAcId ? 'view' : 'empty')}
              saving={createMut.isPending} />
          )}

          {panelMode === 'edit' && editRecord && (
            <EventForm aircraft={allAircraft} initial={editRecord}
              onSave={body => updateMut.mutate({ id: editRecord.id, body })}
              onCancel={() => { setPanelMode('view'); setEditRecord(null); }}
              saving={updateMut.isPending} />
          )}

          {panelMode === 'view' && selectedAc && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Aircraft header */}
              {(() => {
                const isDown = selectedAc.status !== 'OPERATIONAL';
                const barColor = isDown
                  ? selectedAc.status === 'MAINTENANCE' ? 'bg-amber-500' : 'bg-red-500'
                  : 'bg-emerald-500';
                return (
                  <div className="relative px-6 py-4 border-b border-slate-100 shrink-0 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 to-white overflow-hidden">
                    <span className={`absolute left-0 top-0 bottom-0 w-1 ${barColor}`} />
                    <div className="pl-3">
                      <p className="font-bold text-base text-slate-900">
                        {selectedAc.registration}
                        {selectedAc.name ? <span className="text-slate-400 font-normal text-sm"> · {selectedAc.name}</span> : ''}
                      </p>
                      <p className="text-sm text-slate-500">{selectedAc.type}{selectedAc.model ? ` ${selectedAc.model}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                        isDown
                          ? selectedAc.status === 'MAINTENANCE' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isDown ? (selectedAc.status === 'MAINTENANCE' ? 'bg-amber-500' : 'bg-red-500') : 'bg-emerald-500'}`} />
                        {selectedAc.status}
                      </span>
                      <button onClick={() => { setEditRecord(null); setPanelMode('log'); }}
                        className="flex items-center gap-1 rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors">
                        <Plus className="h-3 w-3" />
                        Log Event
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* History */}
              <div className="h-full min-h-0 overflow-y-auto px-5 py-4 space-y-3 bg-[#F8FAFC]">
                {histLoading ? (
                  <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Loading history…</div>
                ) : selectedHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <CheckCircle2 className="h-10 w-10 text-emerald-200" />
                    <p className="text-sm font-semibold text-slate-500">No downtime events recorded</p>
                    <p className="text-xs text-slate-400">This aircraft has been continuously operational.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] font-bold tracking-[0.18em] text-slate-400 uppercase">
                      Downtime History — {selectedHistory.length} event{selectedHistory.length !== 1 ? 's' : ''}
                    </p>
                    {selectedHistory.map(rec => (
                      <div key={rec.id}>
                        {resolveRec?.id === rec.id ? (
                          <ResolveForm record={rec}
                            onSave={body => resolveMut.mutate({ id: rec.id, body })}
                            onCancel={() => setResolveRec(null)}
                            saving={resolveMut.isPending} />
                        ) : deleteTarget?.id === rec.id ? (
                          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <p className="text-sm font-semibold text-red-900 mb-1">Remove this event?</p>
                            <p className="text-xs text-red-700 mb-3">This will permanently delete the audit record.</p>
                            <div className="flex gap-2">
                              <button onClick={() => deleteMut.mutate(rec.id)} disabled={deleteMut.isPending}
                                className="rounded-xl bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                                {deleteMut.isPending ? 'Removing…' : 'Yes, Remove'}
                              </button>
                              <button onClick={() => setDeleteTarget(null)} className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <HistoryRow record={rec}
                            onEdit={() => { setEditRecord(rec); setPanelMode('edit'); }}
                            onDelete={() => setDeleteTarget(rec)}
                            onResolve={() => setResolveRec(rec)} />
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
