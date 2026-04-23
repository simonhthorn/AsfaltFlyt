import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tripsRouter } from "./routes/trips.js";

const PORT = Number(process.env.PORT ?? 4000);
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDistPath = path.resolve(__dirname, "../../web/dist");

app.use(express.json());
app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "asfaltflyt-api" });
});

app.use("/api/trips", tripsRouter);

app.use(express.static(webDistPath));
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  return res.sendFile(path.join(webDistPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`AsfaltFlyt API kjører på http://localhost:${PORT}`);
});
