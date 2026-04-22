import type { CreateTripRequest, TripsOverview } from "@asfaltflyt/domain";

export type NewTripFormData = CreateTripRequest;
export type TripsResponse = TripsOverview;
export type ProjectTotal = TripsOverview["projectTotals"][number];
