export interface TripInput {
  driverName: string;
  projectName: string;
  pickupSite: string;
  quantityTons: number;
  note?: string;
}

export interface CreateTripRequest extends TripInput {
  registeredAt?: string;
}

export interface AsphaltTripInput extends TripInput {
  registeredAt: string;
}

export interface AsphaltTripRecord extends AsphaltTripInput {
  id: string;
  createdAt: string;
}

export type AsphaltTrip = AsphaltTripRecord;

export interface ProjectTotal {
  projectName: string;
  totalLoads: number;
  totalTons: number;
}

export interface TripsOverview {
  trips: AsphaltTripRecord[];
  projectTotals: ProjectTotal[];
}
