# AsfaltFlyt
Tracking av asfalttransport

## Kjør SQL-skjema mot Supabase (via secrets)

Prosjektet har nå et script som leser secrets fra miljøvariabler og kjører `schema.sql` mot Supabase:

```bash
python3 scripts/apply_supabase_schema.py
```

### Secrets / miljøvariabler

- `SUPABASE_URL` (påkrevd) - f.eks. `https://<project-ref>.supabase.co`
- API key (påkrevd), scriptet støtter disse i prioritert rekkefølge:
  - `SUPABASE_SECRET_ACCESS_KEY` (anbefalt for schema-endringer)
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_API_KEY`
  - `SUPABASE_PUBLIC_ACCESS_KEY` (kun fallback, kan mangle rettigheter)
- `SUPABASE_SQL_PATH` (valgfri, default `/sql/v1`)
- `SUPABASE_SQL_PAYLOAD_KEY` (valgfri, default `query`)

Scriptet sender API-key både som `apikey` og `Authorization: Bearer ...`.

Eksempel med eksplisitte variabler:

```bash
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
python3 scripts/apply_supabase_schema.py --sql-file schema.sql
```

## Cursor Cloud (cursor.com)

Repoet er koblet til GitHub og har [`AGENTS.md`](AGENTS.md) samt [`.cursor/environment.json`](.cursor/environment.json) for [Cloud Agents](https://cursor.com/docs/cloud-agent).

1. Logg inn på [cursor.com](https://cursor.com) og koble **GitHub**-kontoen din (trengs for at agenter skal kunne klone og pushe endringer).
2. Åpne [cursor.com/agents](https://cursor.com/agents), velg dette repoet og start en agent.
3. Du trenger **skrivetilgang** til `simonhthorn/AsfaltFlyt` på GitHub (eller eget fork med remote du kontrollerer).

Cloud Agents krever betalt Cursor-plan ifølge [dokumentasjonen](https://cursor.com/docs/cloud-agent#troubleshooting).
