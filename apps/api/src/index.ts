import express from "express";
import cors from "cors";
import { tripsRouter } from "./routes/trips.js";

const PORT = Number(process.env.PORT ?? 4000);
const app = express();

app.use(express.json());
app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "asfaltflyt-api" });
});

app.use("/api/trips", tripsRouter);

app.listen(PORT, () => {
  console.log(`AsfaltFlyt API kjører på http://localhost:${PORT}`);
});
