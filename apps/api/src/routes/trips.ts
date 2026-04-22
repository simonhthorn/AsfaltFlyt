import { Router } from "express";
import type { CreateTripRequest } from "@asfaltflyt/domain";
import { addTrip, listTrips, summarizeByProject } from "../store/tripsStore.js";

export const tripsRouter = Router();

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
