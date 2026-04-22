import type { AsphaltTripInput, AsphaltTripRecord, ProjectTotal } from "@asfaltflyt/domain";

const trips: AsphaltTripRecord[] = [];

export function addTrip(input: AsphaltTripInput): AsphaltTripRecord {
  const record: AsphaltTripRecord = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: new Date().toISOString(),
  };

  trips.unshift(record);
  return record;
}

export function listTrips(): AsphaltTripRecord[] {
  return [...trips];
}

export function summarizeByProject(): ProjectTotal[] {
  const totals = new Map<string, ProjectTotal>();

  for (const trip of trips) {
    const existing = totals.get(trip.projectName) ?? {
      projectName: trip.projectName,
      totalLoads: 0,
      totalTons: 0,
    };

    existing.totalLoads += 1;
    existing.totalTons = Number((existing.totalTons + trip.quantityTons).toFixed(2));
    totals.set(trip.projectName, existing);
  }

  return [...totals.values()].sort((a, b) => b.totalTons - a.totalTons);
}
