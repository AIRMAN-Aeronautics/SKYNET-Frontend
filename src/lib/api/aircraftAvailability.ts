import { apiClient } from './client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AvailStatus = 'AVAILABLE' | 'MAINTENANCE' | 'DEFECTED';
export type TimeSlot    = 'ALL' | 'SLOT_1' | 'SLOT_2' | 'SLOT_3';

export interface AircraftAvailabilityRecord {
  id:          number;
  aircraftId:  number;
  aircraftCode: string | null;
  aircraftType: string | null;
  availDate:   string;      // ISO date
  timeSlot:    TimeSlot;
  status:      AvailStatus;
  remarks:     string | null;
  createdAt:   string | null;
  updatedAt:   string | null;
}

export interface AircraftAvailabilityResponse {
  fromDate: string;
  toDate:   string;
  records:  AircraftAvailabilityRecord[];
}

// ── API functions ─────────────────────────────────────────────────────────────

export const getAircraftAvailability = async (params: {
  from_date?:   string;
  to_date?:     string;
  aircraft_id?: number;
  status?:      AvailStatus;
}): Promise<AircraftAvailabilityResponse> => {
  const { data } = await apiClient.get('/aircraft-availability/', { params });
  return data;
};

export const createAircraftAvailability = async (body: {
  aircraft_id: number;
  avail_date:  string;
  time_slot?:  TimeSlot;
  status:      AvailStatus;
  remarks?:    string;
}): Promise<AircraftAvailabilityRecord> => {
  const { data } = await apiClient.post('/aircraft-availability/', body);
  return data;
};

export const updateAircraftAvailability = async (
  id: number,
  body: { status: AvailStatus; remarks?: string }
): Promise<AircraftAvailabilityRecord> => {
  const { data } = await apiClient.put(`/aircraft-availability/${id}`, body);
  return data;
};

export const deleteAircraftAvailability = async (id: number): Promise<void> => {
  await apiClient.delete(`/aircraft-availability/${id}`);
};
