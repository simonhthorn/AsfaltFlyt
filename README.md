# AsfaltFlyt

Webapp for bygg- og anleggsjaaforer som registrerer asfaltlass per kjoring, slik at prosjektleder kan folge med pa volum og status.

## Kjør SQL-skjema mot Supabase (via API)

Prosjektet har et script som leser miljøvariabler og kjører `schema.sql` mot Supabase.
Scriptet støtter to flyter:

- **Management API** (anbefalt): bruker `https://api.supabase.com/v1/projects/<ref>/database/query`
- **Project endpoint** (fallback): bruker prosjekt-URL + `SUPABASE_SQL_PATH` (default `/sql/v1`)

Kjøring:

```bash
python3 scripts/apply_supabase_schema.py
```

Du kan også velge modus eksplisitt:

```bash
python3 scripts/apply_supabase_schema.py --mode auto        # default
python3 scripts/apply_supabase_schema.py --mode management  # kun Management API
python3 scripts/apply_supabase_schema.py --mode project     # kun project endpoint
```

Dry run (viser SQL uten å sende til Supabase):

```bash
python3 scripts/apply_supabase_schema.py --dry-run
```

Legg til en kolonne i en tabell (idempotent med `IF NOT EXISTS`):

```bash
python3 scripts/apply_supabase_schema.py \
  --add-column-table trips \
  --add-column-name delivery_temperature_c \
  --add-column-type NUMERIC(5,2) \
  --add-column-default 0 \
  --add-column-only
```

Dry run av kun kolonne-endring:

```bash
python3 scripts/apply_supabase_schema.py \
  --add-column-table trips \
  --add-column-name delivery_temperature_c \
  --add-column-type NUMERIC(5,2) \
  --add-column-default 0 \
  --add-column-only \
  --dry-run
```

Hent en kolonne fra en tabell (returnerer inntil 20 rader som default):

```bash
python3 scripts/apply_supabase_schema.py \
  --fetch-column-table trips \
  --fetch-column-name ticket_number \
  --fetch-column-only
```

Du kan styre antall rader:

```bash
python3 scripts/apply_supabase_schema.py \
  --fetch-column-table trips \
  --fetch-column-name ticket_number \
  --fetch-column-limit 50 \
  --fetch-column-only
```

### Miljøvariabler

- **Management API (anbefalt i auto/mode=management):**
  - `SUPABASE_ACCESS_TOKEN` (førsteprioritet) eller `SUPABASE_MANAGEMENT_TOKEN` eller `SUPABASE_PAT` (PAT/OAuth token)
  - `SUPABASE_PROJECT_REF` (valgfri hvis den kan utledes fra `SUPABASE_URL`)
  - `SUPABASE_MANAGEMENT_API_BASE` (valgfri, default `https://api.supabase.com`)
- **Project endpoint (brukes i mode=project eller som fallback):**
  - `SUPABASE_URL` (påkrevd for project-flyt) - f.eks. `https://<project-ref>.supabase.co`
  - API key (påkrevd), scriptet støtter disse i prioritert rekkefølge:
    - `SUPABASE_SECRET_ACCESS_KEY` eller `SUPABASE_API_SECRET_KEY` (anbefalt)
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `SUPABASE_API_KEY`
    - `SUPABASE_PUBLIC_ACCESS_KEY` eller `SUPABASE_API_PUBLIC_KEY` (kun fallback, kan mangle rettigheter)
  - `SUPABASE_SQL_PATH` (valgfri, default `/sql/v1`)
  - `SUPABASE_SQL_ENDPOINT` (valgfri full URL, overstyrer `SUPABASE_URL + SUPABASE_SQL_PATH`)
  - `SUPABASE_SQL_PAYLOAD_KEY` (valgfri, default `query`)

I project-flyt sender scriptet API-key både som `apikey` og `Authorization: Bearer ...`.

> Merk: Secrets fra Cursor Cloud blir eksponert som miljøvariabler ved agent-oppstart.
> Hvis du nettopp har lagt til eller endret secrets, restart agenten før du kjører scriptet.

Eksempel: Management API (anbefalt):

```bash
SUPABASE_PROJECT_REF="<project-ref>" \
SUPABASE_MANAGEMENT_TOKEN="<supabase-pat-eller-oauth-token>" \
python3 scripts/apply_supabase_schema.py --mode management --sql-file schema.sql
```

Eksempel: project endpoint:

```bash
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_API_SECRET_KEY="<sb_secret_...>" \
python3 scripts/apply_supabase_schema.py --sql-file schema.sql
```

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

### Bekreft levering -> Supabase (via API, ingen Vite-variabler)

Når sjåfør trykker **Bekreft levering**, sender frontend data til API-et (`POST /api/trips/delivery-confirmations`).
API-et laster deretter opp til Supabase server-side.

Sett disse miljøvariablene på API/server (ikke i frontend):

- `SUPABASE_URL` - prosjekt-URL, f.eks. `https://<project-ref>.supabase.co`
- ett av disse credentials-feltene:
  - `SUPABASE_SECRET_ACCESS_KEY` (anbefalt) eller `SUPABASE_API_SECRET_KEY`
  - `SUPABASE_PUBLIC_ACCESS_KEY` eller `SUPABASE_API_PUBLIC_KEY`
  - `SUPABASE_ACCESS_TOKEN` (støttes også)
  - `SUPABASE_MANAGEMENT_TOKEN` / `SUPABASE_PAT` (støttes også)

Valgfritt:

- `SUPABASE_DELIVERY_TABLE` - overstyr tabellnavn (default `driver_delivery_confirmations`)

Tabellen `driver_delivery_confirmations` er lagt til i `schema.sql` og brukes som standard.

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
- `POST /api/trips/delivery-confirmations` - laster opp leveringsbekreftelse til Supabase via API-server

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
