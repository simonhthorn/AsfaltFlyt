# AsfaltFlyt

Webapp for bygg- og anleggsjaaforer som registrerer asfaltlass per kjoring, slik at prosjektleder kan folge med pa volum og status.

## Mappestruktur

```text
.
|- apps/
|  |- api/            # Express API for registrering og oversikt
|  \- web/            # React/Vite frontend
|- packages/
|  \- domain/         # Delte domene-typer mellom frontend/backend
|- .cursor/
|  \- environment.json
\- tsconfig.base.json # Felles TypeScript-oppsett
```

## Lokal utvikling

Krav: Node.js 20+ og npm 10+.

```bash
npm install
npm run dev
```

Dette starter:

- API paa `http://localhost:4000`
- Frontend paa `http://localhost:5173`

## Nyttige kommandoer

```bash
npm run dev         # API + web samtidig
npm run dev:api     # Bare backend
npm run dev:web     # Bare frontend
npm run build       # Bygger alle workspaces
npm run lint        # Linter alle workspaces som har lint-script
npm run typecheck   # Typecheck i alle workspaces
```

## Deploy paa Railway

Dette repoet er satt opp for en enkel Railway-service som kj0rer baade API og frontend fra samme Node-prosess.

### Viktige scripts

- `npm run build` - bygger domain + api + web
- `npm run start` - starter API og serverer frontend fra `apps/web/dist`

### Anbefalt oppsett i Railway

- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Port**: Railway setter `PORT` automatisk (appen bruker `process.env.PORT`)

Alternativt kan Railway bruke `railway.json` i repoet, som allerede setter:

- build command: `npm run build`
- start command: `npm run start`

Merk: frontend er satt opp med Vite-versjon som er kompatibel med Railway sitt vanlige Node 22.11-miljo for a unnga native binding-feil i build.

## API-endepunkter

- `GET /health` - helsesjekk
- `GET /api/trips` - henter alle registrerte kjoringer + summer per prosjekt
- `POST /api/trips` - registrerer ny kjoring

Eksempel payload:

```json
{
  "driverName": "Ola Nordmann",
  "projectName": "E18 Asfaltering",
  "pickupSite": "NCC Asfaltverk Alnabru",
  "quantityTons": 18.5,
  "registeredAt": "2026-04-22T09:12:00.000Z"
}
```
