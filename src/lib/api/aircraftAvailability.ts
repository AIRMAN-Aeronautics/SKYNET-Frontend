import { apiClient } from './client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DownStatus = 'MAINTENANCE' | 'GROUNDED' | 'DEFECTED';

export interface AircraftAvailabilityRecord {
  id:           number;
  aircraftId:   number;
  aircraftCode: string | null;
  aircraftName: string | null;
  aircraftType: string | null;
  status:       DownStatus;
  defectType:   string | null;
  issueBrief:   string | null;
  diagnosedBy:  string | null;
  groundedDate: string | null;  // ISO date — when aircraft went down
  fixedDate:    string | null;  // ISO date — null = still down
  fixedBy:      string | null;
  isLatest:     boolean;
  remarks:      string | null;
  createdAt:    string | null;
  updatedAt:    string | null;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const getAircraftAvailability = async (params?: {
  aircraft_id?: number;
  is_latest?:   boolean;
  status?:      DownStatus;
}): Promise<{ records: AircraftAvailabilityRecord[] }> => {
  const { data } = await apiClient.get('/aircraft-availability/', { params });
  return data;
};

export const createAvailabilityEvent = async (body: {
  aircraft_id:    number;
  status:         DownStatus;
  defect_type?:   string;
  issue_brief?:   string;
  diagnosed_by?:  string;
  grounded_date?: string;
  remarks?:       string;
}): Promise<AircraftAvailabilityRecord> => {
  const { data } = await apiClient.post('/aircraft-availability/', body);
  return data;
};

export const updateAvailabilityEvent = async (
  id: number,
  body: {
    status?:        DownStatus;
    defect_type?:   string;
    issue_brief?:   string;
    diagnosed_by?:  string;
    grounded_date?: string;
    remarks?:       string;
  }
): Promise<AircraftAvailabilityRecord> => {
  const { data } = await apiClient.put(`/aircraft-availability/${id}`, body);
  return data;
};

export const resolveAvailabilityEvent = async (
  id: number,
  body: { fixed_date: string; fixed_by?: string; remarks?: string }
): Promise<AircraftAvailabilityRecord> => {
  const { data } = await apiClient.put(`/aircraft-availability/${id}/resolve`, body);
  return data;
};

export const deleteAvailabilityEvent = async (id: number): Promise<void> => {
  await apiClient.delete(`/aircraft-availability/${id}`);
};
