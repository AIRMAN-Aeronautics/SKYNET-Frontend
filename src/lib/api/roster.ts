import { apiClient } from './client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RosterSlot {
  id: string;
  flightDate: string;           // ISO date
  flightSlot: string;           // SLOT_1 | SLOT_2 | SLOT_3
  flightSlotDisplay: string;    // "Slot 1 (06:00–09:00)"
  flightType: string;           // DUAL | SOLO | CROSS_COUNTRY
  status: SlotStatus;
  cadetName: string | null;
  cadetProfileId: string | null;
  instructorName: string | null;
  instructorUserId: string | null;
  aircraftCode: string | null;
  aircraftId: string | null;
  wxCondition: string | null;
  cancellationReason: string | null;
}

export type SlotStatus =
  | 'SCHEDULED'
  | 'PENDING_DISPATCH'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'WX_CANCELLED';

export interface RosterSlotDetail {
  id: string;
  flightDate: string;
  flightSlot: string;
  flightSlotDisplay: string;
  flightType: string;
  status: SlotStatus;
  wxCondition: string | null;
  cancellationReason: string | null;
  sortieId: string | null;
  cadet: {
    profileId: string | null;
    fullName: string | null;
    programCode: string | null;
    regulatoryId: string | null;
  };
  instructor: {
    userId: string | null;
    fullName: string | null;
    instructorCode: string | null;
    licenseNumber: string | null;
  };
  aircraft: {
    id: string | null;
    registration: string | null;
    type: string | null;
    model: string | null;
    status: string | null;
  };
  cadetHours: {
    skynetHours: number;
    maverickHours: number;
    totalHours: number;
  };
}

export interface RosterResponse {
  fromDate: string;
  toDate: string;
  slots: RosterSlot[];
}

export interface RosterRunResult {
  runId: string | null;
  runType: 'GENERATE' | 'RECOMPUTE';
  fromDate?: string;
  toDate?: string;
  slotsCreated?: number;
  slotsPending?: number;
  slotsReassigned?: number;
  message?: string;
}

export interface CadetAvailabilityRecord {
  id: string;
  studentProfileId: string;
  availDate: string;
  flightSlot: string;
  isAvailable: boolean;
  notes: string | null;
}

export interface InstructorAttendanceRecord {
  id: string;
  instructorUserId: string;
  attendDate: string;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE';
  notes: string | null;
}

// ── Roster Calendar ───────────────────────────────────────────────────────────

export const getRoster = async (params: {
  from_date?: string;
  to_date?: string;
  student_profile_id?: string;
  instructor_user_id?: string;
  aircraft_id?: string;
}): Promise<RosterResponse> => {
  const { data } = await apiClient.get('/roster/', { params });
  return data;
};

export const getRosterSlot = async (slotId: string): Promise<RosterSlotDetail> => {
  const { data } = await apiClient.get(`/roster/slots/${slotId}`);
  return data;
};

// ── Roster Generation ─────────────────────────────────────────────────────────

export const generateRoster = async (body?: {
  from_date?: string;
  to_date?: string;
}): Promise<RosterRunResult> => {
  const { data } = await apiClient.post('/roster/generate', body ?? {});
  return data;
};

export const recomputeRoster = async (): Promise<RosterRunResult> => {
  const { data } = await apiClient.post('/roster/recompute');
  return data;
};

// ── Cadet Availability ────────────────────────────────────────────────────────

export const getCadetAvailability = async (params: {
  from_date?: string;
  to_date?: string;
  student_profile_id?: string;
}): Promise<{ availability: CadetAvailabilityRecord[] }> => {
  const { data } = await apiClient.get('/roster/availability', { params });
  return data;
};

export const setCadetAvailability = async (body: {
  student_profile_id: string;
  avail_date: string;
  flight_slot?: string;
  is_available?: boolean;
  notes?: string;
}): Promise<CadetAvailabilityRecord> => {
  const { data } = await apiClient.post('/roster/availability', body);
  return data;
};

export const deleteCadetAvailability = async (id: string) => {
  const { data } = await apiClient.delete(`/roster/availability/${id}`);
  return data;
};

// ── Instructor Attendance ─────────────────────────────────────────────────────

export const getInstructorAttendance = async (params: {
  from_date?: string;
  to_date?: string;
  instructor_user_id?: string;
}): Promise<{ attendance: InstructorAttendanceRecord[] }> => {
  const { data } = await apiClient.get('/roster/attendance', { params });
  return data;
};

export const markInstructorAttendance = async (body: {
  instructor_user_id: string;
  attend_date: string;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE';
  notes?: string;
}): Promise<InstructorAttendanceRecord> => {
  const { data } = await apiClient.post('/roster/attendance', body);
  return data;
};

export const updateInstructorAttendance = async (
  id: string,
  body: { status: 'PRESENT' | 'ABSENT' | 'LEAVE'; notes?: string }
) => {
  const { data } = await apiClient.put(`/roster/attendance/${id}`, body);
  return data;
};
