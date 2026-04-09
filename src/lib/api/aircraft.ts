import { apiClient } from './client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AircraftStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'GROUNDED';
export type ScheduleStatus = 'AVAILABLE' | 'MAINTENANCE' | 'BLOCKED';

export interface AircraftRecord {
  id:                   number;
  name:                 string | null;
  registration:         string;
  manufacturer:         string | null;
  type:                 string | null;
  aircraftType:         string | null;
  model:                string | null;
  seatingCapacity:      number | null;
  status:               AircraftStatus;
  statusDisplay:        string;
  baseAirportIcao:      string | null;
  fuelType:             string | null;
  totalHours:           number | null;
  engineHours:          number | null;
  lastFlightDate:       string | null;
  lastHobbs:            number | null;
  nextServiceDueHours:  number | null;
  nextServiceDueDate:   string | null;
  airworthinessStatus:  string | null;
  insuranceExpiry:      string | null;
  isIfrCapable:         boolean;
  isNightAllowed:       boolean;
  notes:                string | null;
  // Last issue (denormalised from availability audit)
  lastDefectType:       string | null;
  lastDiagnosedBy:      string | null;
  lastIssueBrief:       string | null;
  lastIssueFixedDate:   string | null;
  isActive:             boolean;
  createdAt:            string | null;
  updatedAt:            string | null;
}

export interface AircraftScheduleRecord {
  id:         number;
  aircraftId: number;
  startTime:  string;
  endTime:    string;
  status:     ScheduleStatus;
  reason:     string | null;
  createdAt:  string | null;
  updatedAt:  string | null;
}

export type AircraftFormData = {
  name:             string;
  registration:     string;
  manufacturer?:    string;
  type?:            string;
  aircraft_type?:   string;
  model?:           string;
  seating_capacity?: number;
  status:           AircraftStatus;
  base_airport_icao?: string;
  fuel_type?:       string;
  total_hours?:     number;
  engine_hours?:    number;
  last_flight_date?: string;
  last_hobbs?:      number;
  next_service_due_hours?: number;
  next_service_due_date?:  string;
  airworthiness_status?:   string;
  insurance_expiry?:       string;
  is_ifr_capable:   boolean;
  is_night_allowed: boolean;
  notes?:           string;
};

// ── Aircraft CRUD ─────────────────────────────────────────────────────────────

export const listAircraft = async (params?: { status?: AircraftStatus }): Promise<{ aircraft: AircraftRecord[] }> => {
  const { data } = await apiClient.get('/aircraft/', { params });
  return data;
};

export const createAircraft = async (body: AircraftFormData): Promise<AircraftRecord> => {
  const { data } = await apiClient.post('/aircraft/', body);
  return data;
};

export const getAircraft = async (id: number): Promise<AircraftRecord> => {
  const { data } = await apiClient.get(`/aircraft/${id}`);
  return data;
};

export const updateAircraft = async (id: number, body: AircraftFormData): Promise<AircraftRecord> => {
  const { data } = await apiClient.put(`/aircraft/${id}`, body);
  return data;
};

export const deleteAircraft = async (id: number): Promise<void> => {
  await apiClient.delete(`/aircraft/${id}`);
};

// ── Schedule ──────────────────────────────────────────────────────────────────

export const listSchedule = async (aircraftId: number): Promise<{ schedule: AircraftScheduleRecord[] }> => {
  const { data } = await apiClient.get(`/aircraft/${aircraftId}/schedule`);
  return data;
};

export const addSchedule = async (
  aircraftId: number,
  body: { start_time: string; end_time: string; status: ScheduleStatus; reason?: string }
): Promise<AircraftScheduleRecord> => {
  const { data } = await apiClient.post(`/aircraft/${aircraftId}/schedule`, body);
  return data;
};

export const updateSchedule = async (
  aircraftId: number,
  scheduleId: number,
  body: { start_time?: string; end_time?: string; status?: ScheduleStatus; reason?: string }
): Promise<AircraftScheduleRecord> => {
  const { data } = await apiClient.put(`/aircraft/${aircraftId}/schedule/${scheduleId}`, body);
  return data;
};

export const deleteSchedule = async (aircraftId: number, scheduleId: number): Promise<void> => {
  await apiClient.delete(`/aircraft/${aircraftId}/schedule/${scheduleId}`);
};
