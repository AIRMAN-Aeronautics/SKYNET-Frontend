import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import {
  Plus, Pencil, Trash2, X, Check, RefreshCw,
  ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';
import {
  getAircraftAvailability,
  createAircraftAvailability,
  updateAircraftAvailability,
  deleteAircraftAvailability,
  type AircraftAvailabilityRecord,
  type AvailStatus,
  type TimeSlot,
} from '@/lib/api/aircraftAvailability';
import { getFleet } from '@/lib/api/fleet';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AvailStatus, { label: string; bg: string; text: string; dot: string }> = {
  AVAILABLE:   { label: 'Available',    bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  MAINTENANCE: { label: 'Maintenance',  bg: 'bg-amber-50',   text: 'text-amber-800',   dot: 'bg-amber-400'   },
  DEFECTED:    { label: 'Grounded',     bg: 'bg-red-50',     text: 'text-red-800',     dot: 'bg-red-500'     },
};

const SLOT_LABELS: Record<TimeSlot, string> = {
  ALL:    'All Day',
  SLOT_1: 'Slot 1 · 06–09',
  SLOT_2: 'Slot 2 · 09–12',
  SLOT_3: 'Slot 3 · 12–15',
};

function isoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AvailStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Form Modal ────────────────────────────────────────────────────────────────

interface Aircraft { id: number; registration: string; type?: string; model?: string; }

interface FormModalProps {
  aircraft: Aircraft[];
  initial?: AircraftAvailabilityRecord | null;
  onSave:  (data: {
    aircraft_id: number; avail_date: string;
    time_slot: TimeSlot; status: AvailStatus; remarks: string;
  }) => void;
  onClose: () => void;
  saving:  boolean;
}

function FormModal({ aircraft, initial, onSave, onClose, saving }: FormModalProps) {
  const [aircraftId, setAircraftId] = useState<number | ''>(initial?.aircraftId ?? '');
  const [availDate,  setAvailDate]  = useState(initial?.availDate  ?? isoDate(new Date()));
  const [timeSlot,   setTimeSlot]   = useState<TimeSlot>(initial?.timeSlot ?? 'ALL');
  const [status,     setStatus]     = useState<AvailStatus>(initial?.status ?? 'AVAILABLE');
  const [remarks,    setRemarks]    = useState(initial?.remarks ?? '');

  const isEdit = !!initial;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aircraftId) return;
    onSave({ aircraft_id: aircraftId as number, avail_date: availDate, time_slot: timeSlot, status, remarks });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">
            {isEdit ? 'Update Availability' : 'Add Aircraft Availability'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Aircraft */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Aircraft</label>
              <select
                required
                value={aircraftId}
                onChange={e => setAircraftId(e.target.value ? parseInt(e.target.value, 10) : '')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">— Select aircraft —</option>
                {aircraft.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.registration}{a.type ? ` · ${a.type}${a.model ? ' ' + a.model : ''}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Aircraft</label>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {initial?.aircraftCode} {initial?.aircraftType ? `· ${initial.aircraftType}` : ''}
              </div>
            </div>
          )}

          {/* Date */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input
                type="date"
                required
                value={availDate}
                onChange={e => setAvailDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          )}
          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {format(new Date(initial!.availDate), 'EEEE, d MMMM yyyy')}
              </div>
            </div>
          )}

          {/* Time Slot */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Time Slot</label>
              <select
                value={timeSlot}
                onChange={e => setTimeSlot(e.target.value as TimeSlot)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {(Object.keys(SLOT_LABELS) as TimeSlot[]).map(s => (
                  <option key={s} value={s}>{SLOT_LABELS[s]}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(STATUS_CONFIG) as AvailStatus[]).map(s => {
                const cfg = STATUS_CONFIG[s];
                const selected = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                      selected
                        ? `${cfg.bg} ${cfg.text} border-current ring-2 ring-offset-1`
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                    {selected && <Check className="h-3 w-3 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={2}
              placeholder="e.g. 100-hour inspection scheduled, AOG — awaiting part"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Add Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ record, onConfirm, onCancel, deleting }:
  { record: AircraftAvailabilityRecord; onConfirm: () => void; onCancel: () => void; deleting: boolean }
) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Remove Availability Record</h3>
        <p className="text-sm text-gray-600 mb-5">
          Remove <strong>{record.aircraftCode}</strong> availability for{' '}
          <strong>{format(new Date(record.availDate), 'd MMM yyyy')}</strong>{' '}
          ({SLOT_LABELS[record.timeSlot]})?
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            {deleting ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AircraftAvailabilityPage() {
  const qc = useQueryClient();
  const today = new Date();

  const [fromDate, setFromDate] = useState(isoDate(today));
  const [toDate,   setToDate]   = useState(isoDate(addDays(today, 13)));
  const [filterAc, setFilterAc] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showForm,  setShowForm]  = useState(false);
  const [editRecord, setEditRecord] = useState<AircraftAvailabilityRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AircraftAvailabilityRecord | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: availData, isLoading, isFetching } = useQuery({
    queryKey: ['aircraft-availability', fromDate, toDate, filterAc, filterStatus],
    queryFn: () => getAircraftAvailability({
      from_date:   fromDate,
      to_date:     toDate,
      aircraft_id: filterAc   || undefined,
      status:      (filterStatus as any) || undefined,
    }),
  });

  const { data: fleetData } = useQuery({
    queryKey: ['fleet-list'],
    queryFn:  () => getFleet({}),
  });

  const aircraft: Aircraft[] = useMemo(
    () => (fleetData?.aircraft ?? []).filter((a: any) => a.status !== 'GROUNDED'),
    [fleetData]
  );

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: createAircraftAvailability,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['aircraft-availability'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => updateAircraftAvailability(id, body),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['aircraft-availability'] }); setEditRecord(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAircraftAvailability,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['aircraft-availability'] }); setDeleteTarget(null); },
  });

  // ── Date navigation ────────────────────────────────────────────────────────

  function shiftWindow(days: number) {
    setFromDate(isoDate(addDays(new Date(fromDate), days)));
    setToDate(isoDate(addDays(new Date(toDate), days)));
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSave(body: any) {
    if (editRecord) {
      updateMutation.mutate({ id: editRecord.id, body: { status: body.status, remarks: body.remarks } });
    } else {
      createMutation.mutate(body);
    }
  }

  const records = availData?.records ?? [];

  // Summary counts
  const summary = useMemo(() => ({
    available:   records.filter(r => r.status === 'AVAILABLE').length,
    maintenance: records.filter(r => r.status === 'MAINTENANCE').length,
    defected:    records.filter(r => r.status === 'DEFECTED').length,
  }), [records]);

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Aircraft Availability</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Date-level availability overrides — integrated with roster scheduling
            </p>
          </div>
          <button
            onClick={() => { setEditRecord(null); setShowForm(true); }}
            className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            Add Record
          </button>
        </div>

        {/* Summary chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(STATUS_CONFIG) as AvailStatus[]).map(s => {
            const cfg = STATUS_CONFIG[s];
            const count = s === 'AVAILABLE' ? summary.available : s === 'MAINTENANCE' ? summary.maintenance : summary.defected;
            return (
              <span key={s} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {count} {cfg.label}
              </span>
            );
          })}
          {isFetching && <RefreshCw className="h-3.5 w-3.5 animate-spin text-gray-400 self-center" />}
        </div>
      </div>

      {/* Filters + date navigation */}
      <div className="border-b border-gray-100 bg-white px-6 py-2 flex flex-wrap items-center gap-3">
        {/* Date window */}
        <div className="flex items-center gap-1">
          <button onClick={() => shiftWindow(-7)} className="rounded-md p-1.5 hover:bg-gray-100">
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button onClick={() => shiftWindow(7)} className="rounded-md p-1.5 hover:bg-gray-100">
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        <div className="h-5 w-px bg-gray-200" />

        {/* Aircraft filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-gray-400" />
          <select
            value={filterAc}
            onChange={e => setFilterAc(e.target.value)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Aircraft</option>
            {aircraft.map(a => (
              <option key={a.id} value={a.id}>{a.registration}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Statuses</option>
            {(Object.keys(STATUS_CONFIG) as AvailStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>

          {(filterAc || filterStatus) && (
            <button
              onClick={() => { setFilterAc(''); setFilterStatus(''); }}
              className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-300" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-sm font-medium text-gray-500">No availability records found</p>
            <p className="text-xs text-gray-400 mt-1">
              Without records, all OPERATIONAL aircraft are available for scheduling.
            </p>
            <button
              onClick={() => { setEditRecord(null); setShowForm(true); }}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-sky-50 border border-sky-200 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100"
            >
              <Plus className="h-4 w-4" />
              Add First Record
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Aircraft', 'Date', 'Time Slot', 'Status', 'Remarks', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {records.map(rec => (
                  <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm text-gray-900">{rec.aircraftCode}</div>
                      {rec.aircraftType && (
                        <div className="text-xs text-gray-400">{rec.aircraftType}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {format(new Date(rec.availDate), 'EEE, d MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {SLOT_LABELS[rec.timeSlot]}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={rec.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {rec.remarks ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditRecord(rec); setShowForm(true); }}
                          className="rounded-md p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(rec)}
                          className="rounded-md p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="border-t border-gray-100 bg-gray-50 px-6 py-2">
        <div className="flex flex-wrap items-center gap-5 text-xs text-gray-500">
          <span className="font-medium text-gray-400 uppercase tracking-wide">Status key</span>
          {(Object.keys(STATUS_CONFIG) as AvailStatus[]).map(s => {
            const cfg = STATUS_CONFIG[s];
            return (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                <span className={cfg.text}>{cfg.label}</span>
                {s === 'DEFECTED' && <span className="text-gray-400">(AOG)</span>}
              </span>
            );
          })}
          <span className="ml-auto text-gray-400">
            MAINTENANCE / DEFECTED aircraft are excluded from roster generation
          </span>
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <FormModal
          aircraft={aircraft}
          initial={editRecord}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditRecord(null); }}
          saving={isMutating}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          record={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
