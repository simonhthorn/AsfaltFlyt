import type { CreateTripRequest, TripsOverview } from "@asfaltflyt/domain";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const TRIPS_ENDPOINT = `${API_BASE_URL}/api/trips`;

export async function fetchTrips(): Promise<TripsOverview> {
  const response = await fetch(TRIPS_ENDPOINT);

  if (!response.ok) {
    throw new Error("Klarte ikke hente kjøringer fra server.");
  }

  return (await response.json()) as TripsOverview;
}

export async function createTrip(payload: CreateTripRequest) {
  const response = await fetch(TRIPS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Klarte ikke registrere kjøring.");
  }

  return (await response.json()) as { message: string };
}
