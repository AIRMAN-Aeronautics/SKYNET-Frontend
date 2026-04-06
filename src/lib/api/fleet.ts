import { apiClient } from './client';

export interface AircraftRecord {
  id:              number;
  registration:    string;
  type:            string | null;
  model:           string | null;
  baseAirportIcao: string | null;
  status:          string;
  photoUrl:        string | null;
  notes:           string | null;
  createdAt:       string | null;
}

export interface FleetResponse {
  aircraft: AircraftRecord[];
}

export const getFleet = async (params: {
  status?: string;
}): Promise<FleetResponse> => {
  const { data } = await apiClient.get('/fleet/aircraft', { params });
  return data;
};

export const getAircraftById = async (id: number): Promise<AircraftRecord> => {
  const { data } = await apiClient.get(`/fleet/aircraft/${id}`);
  return data;
};
