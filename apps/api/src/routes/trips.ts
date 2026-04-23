import { Router } from "express";
import type { CreateTripRequest } from "@asfaltflyt/domain";
import { addTrip, listTrips, summarizeByProject } from "../store/tripsStore.js";
import { uploadDeliveryConfirmationToSupabase } from "../services/deliveryConfirmations.js";

export const tripsRouter = Router();

type DeliveryConfirmationRequest = {
  tripNumber: number;
  flowStep: string;
  actionLabel: string;
  confirmedAt?: string;
  gpsOnline: boolean;
  lastDeviation: string | null;
};

tripsRouter.get("/", (_req, res) => {
  res.json({
    trips: listTrips(),
    projectTotals: summarizeByProject(),
  });
});

tripsRouter.post("/", (req, res) => {
  const payload = req.body as Partial<CreateTripRequest>;

  if (!payload.driverName || !payload.projectName || !payload.quantityTons || !payload.pickupSite) {
    return res.status(400).json({
      error:
        "Mangler påkrevde felt: driverName, projectName, quantityTons og pickupSite må fylles ut.",
    });
  }

  const quantity = Number(payload.quantityTons);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({
      error: "quantityTons må være et positivt tall.",
    });
  }

  const trip = addTrip({
    driverName: payload.driverName,
    projectName: payload.projectName,
    pickupSite: payload.pickupSite,
    quantityTons: Number(quantity.toFixed(2)),
    registeredAt: payload.registeredAt ?? new Date().toISOString(),
  });

  return res.status(201).json({
    trip,
    message: "Kjøring registrert.",
  });
});

tripsRouter.post("/delivery-confirmations", async (req, res) => {
  const payload = req.body as Partial<DeliveryConfirmationRequest>;

  if (!payload.tripNumber || !Number.isFinite(Number(payload.tripNumber)) || Number(payload.tripNumber) <= 0) {
    return res.status(400).json({
      error: "tripNumber må være et positivt tall.",
    });
  }

  if (!payload.flowStep || !payload.actionLabel) {
    return res.status(400).json({
      error: "flowStep og actionLabel er påkrevd.",
    });
  }

  if (typeof payload.gpsOnline !== "boolean") {
    return res.status(400).json({
      error: "gpsOnline må være true eller false.",
    });
  }

  try {
    await uploadDeliveryConfirmationToSupabase({
      trip_number: Number(payload.tripNumber),
      flow_step: payload.flowStep,
      action_label: payload.actionLabel,
      confirmed_at: payload.confirmedAt ?? new Date().toISOString(),
      gps_online: payload.gpsOnline,
      last_deviation: payload.lastDeviation ?? null,
    });

    return res.status(201).json({
      message: "Leveringsbekreftelse lastet opp.",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Klarte ikke laste opp leveringsbekreftelse til Supabase.";
    return res.status(502).json({
      error: errorMessage,
    });
  }
});
