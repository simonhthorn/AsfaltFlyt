const DEFAULT_DELIVERY_CONFIRMATIONS_TABLE = "driver_delivery_confirmations";
const DEFAULT_DELIVERY_SCHEMA = "public";
const DEFAULT_MGMT_API_BASE = "https://api.supabase.com";

type DeliveryConfirmationInsert = {
  trip_number: number;
  flow_step: string;
  action_label: string;
  confirmed_at: string;
  gps_online: boolean;
  last_deviation: string | null;
};

type SupabaseCredentials = {
  apiKey: string;
  bearerToken: string;
};

type DeliveryTarget = {
  schema: string;
  table: string;
  qualified: string;
  quotedQualified: string;
};

type SupabaseErrorPayload = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

type SupabaseResponseError = {
  status: number;
  text: string;
  parsed: SupabaseErrorPayload | null;
};

type ManagementApiConfig = {
  endpoint: string;
  token: string;
};

function isLikelyJwt(token: string): boolean {
  const parts = token.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

function isValidSqlIdentifierPart(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function quoteIdentifierPart(value: string): string {
  if (!isValidSqlIdentifierPart(value)) {
    throw new Error(`Ugyldig SQL-identifikator: '${value}'`);
  }

  return `"${value}"`;
}

function parseDeliveryTarget(): DeliveryTarget {
  const tableRaw = process.env.SUPABASE_DELIVERY_TABLE?.trim() || DEFAULT_DELIVERY_CONFIRMATIONS_TABLE;
  let schemaRaw = process.env.SUPABASE_DELIVERY_SCHEMA?.trim() || "";
  let tableNameRaw = tableRaw;

  if (tableRaw.includes(".")) {
    const parts = tableRaw.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error("SUPABASE_DELIVERY_TABLE må være '<table>' eller '<schema>.<table>'.");
    }
    if (!schemaRaw) {
      schemaRaw = parts[0];
    }
    tableNameRaw = parts[1];
  }

  const schema = schemaRaw || DEFAULT_DELIVERY_SCHEMA;
  const table = tableNameRaw;

  if (!isValidSqlIdentifierPart(schema) || !isValidSqlIdentifierPart(table)) {
    throw new Error(
      "SUPABASE_DELIVERY_TABLE/SUPABASE_DELIVERY_SCHEMA kan kun inneholde bokstaver, tall og underscore.",
    );
  }

  return {
    schema,
    table,
    qualified: `${schema}.${table}`,
    quotedQualified: `${quoteIdentifierPart(schema)}.${quoteIdentifierPart(table)}`,
  };
}

function pickSupabaseCredential(): SupabaseCredentials {
  const secretAccessKey =
    process.env.SUPABASE_SECRET_ACCESS_KEY?.trim() || process.env.SUPABASE_API_SECRET_KEY?.trim() || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  const genericApiKey = process.env.SUPABASE_API_KEY?.trim() || "";
  const publicAccessKey =
    process.env.SUPABASE_PUBLIC_ACCESS_KEY?.trim() || process.env.SUPABASE_API_PUBLIC_KEY?.trim() || "";
  const accessToken =
    process.env.SUPABASE_ACCESS_TOKEN?.trim() ||
    process.env.SUPABASE_MANAGEMENT_TOKEN?.trim() ||
    process.env.SUPABASE_PAT?.trim() ||
    "";

  const apiKey = secretAccessKey || serviceRoleKey || genericApiKey || publicAccessKey || accessToken;
  const bearerToken = [accessToken, serviceRoleKey, genericApiKey, publicAccessKey].find(isLikelyJwt) || "";

  return { apiKey, bearerToken };
}

function getSupabaseBaseUrl(): string {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || "";
  if (!supabaseUrl) {
    throw new Error("Mangler SUPABASE_URL.");
  }
  return supabaseUrl.replace(/\/+$/, "");
}

function extractProjectRefFromSupabaseUrl(baseUrl: string): string {
  let hostname = "";
  try {
    hostname = new URL(baseUrl).hostname;
  } catch {
    return "";
  }

  const parts = hostname.split(".");
  if (parts.length < 3) {
    return "";
  }

  if (parts.at(-2) !== "supabase" || parts.at(-1) !== "co") {
    return "";
  }

  return parts[0] ?? "";
}

function buildSupabaseRestEndpoint(baseUrl: string, target: DeliveryTarget): string {
  return `${baseUrl}/rest/v1/${encodeURIComponent(target.table)}`;
}

function buildManagementApiConfig(baseUrl: string): ManagementApiConfig {
  const token =
    process.env.SUPABASE_ACCESS_TOKEN?.trim() ||
    process.env.SUPABASE_MANAGEMENT_TOKEN?.trim() ||
    process.env.SUPABASE_PAT?.trim() ||
    "";

  if (!token) {
    throw new Error(
      "Mangler tabell i Supabase og ingen management token er satt. Sett SUPABASE_ACCESS_TOKEN, SUPABASE_MANAGEMENT_TOKEN eller SUPABASE_PAT, eller kjør schema.sql manuelt før opplasting.",
    );
  }

  const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || extractProjectRefFromSupabaseUrl(baseUrl);
  if (!projectRef) {
    throw new Error(
      "Mangler SUPABASE_PROJECT_REF (og kunne ikke utlede fra SUPABASE_URL). Kan ikke opprette tabell via Management API.",
    );
  }

  const mgmtApiBase = process.env.SUPABASE_MANAGEMENT_API_BASE?.trim() || DEFAULT_MGMT_API_BASE;
  const endpoint = `${mgmtApiBase.replace(/\/+$/, "")}/v1/projects/${projectRef}/database/query`;

  return { endpoint, token };
}

function buildSupabaseHeaders(credentials: SupabaseCredentials, schema: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: credentials.apiKey,
    Prefer: "return=minimal",
    "Content-Profile": schema,
    "Accept-Profile": schema,
  };

  if (credentials.bearerToken) {
    headers.Authorization = `Bearer ${credentials.bearerToken}`;
  }

  return headers;
}

function parseSupabaseError(text: string): SupabaseErrorPayload | null {
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as SupabaseErrorPayload;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function isMissingTableError(error: SupabaseResponseError, target: DeliveryTarget): boolean {
  if (error.status !== 404) {
    return false;
  }

  if (error.parsed?.code === "PGRST205") {
    return true;
  }

  const errorText = `${error.parsed?.message ?? ""} ${error.text}`.toLowerCase();
  return (
    errorText.includes("could not find the table") &&
    (errorText.includes(target.table.toLowerCase()) || errorText.includes(target.qualified.toLowerCase()))
  );
}

function formatSupabaseError(error: SupabaseResponseError): string {
  const details = error.text || "Ukjent feil";
  return `Supabase avviste opplasting (${error.status}): ${details}`;
}

async function postDeliveryConfirmation(
  endpoint: string,
  headers: Record<string, string>,
  payload: DeliveryConfirmationInsert,
): Promise<SupabaseResponseError | null> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    return null;
  }

  const text = await response.text().catch(() => "");
  return {
    status: response.status,
    text,
    parsed: parseSupabaseError(text),
  };
}

function buildCreateTableSql(target: DeliveryTarget): string {
  return `
CREATE SCHEMA IF NOT EXISTS ${quoteIdentifierPart(target.schema)};

CREATE TABLE IF NOT EXISTS ${target.quotedQualified} (
    confirmation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trip_number INTEGER NOT NULL CHECK (trip_number > 0),
    flow_step TEXT NOT NULL,
    action_label TEXT NOT NULL,
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gps_online BOOLEAN NOT NULL DEFAULT TRUE,
    last_deviation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

NOTIFY pgrst, 'reload schema';
`.trim();
}

async function ensureDeliveryTableExists(
  baseUrl: string,
  target: DeliveryTarget,
  _credentials: SupabaseCredentials,
): Promise<void> {
  const { endpoint, token } = buildManagementApiConfig(baseUrl);
  const sql = buildCreateTableSql(target);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (response.ok) {
    return;
  }

  const body = await response.text().catch(() => "");
  throw new Error(
    `Klarte ikke opprette manglende tabell '${target.qualified}' automatisk via Supabase Management API (HTTP ${response.status}): ${body || "Ukjent feil"}`,
  );
}

export async function uploadDeliveryConfirmationToSupabase(payload: DeliveryConfirmationInsert): Promise<void> {
  const credentials = pickSupabaseCredential();
  if (!credentials.apiKey) {
    throw new Error(
      "Mangler Supabase-nøkkel. Sett en av SUPABASE_SECRET_ACCESS_KEY, SUPABASE_API_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_API_KEY, SUPABASE_PUBLIC_ACCESS_KEY, SUPABASE_API_PUBLIC_KEY eller SUPABASE_ACCESS_TOKEN.",
    );
  }

  const target = parseDeliveryTarget();
  const baseUrl = getSupabaseBaseUrl();
  const endpoint = buildSupabaseRestEndpoint(baseUrl, target);
  const headers = buildSupabaseHeaders(credentials, target.schema);

  const firstFailure = await postDeliveryConfirmation(endpoint, headers, payload);
  if (!firstFailure) {
    return;
  }

  if (isMissingTableError(firstFailure, target)) {
    await ensureDeliveryTableExists(baseUrl, target, credentials);

    const retryFailure = await postDeliveryConfirmation(endpoint, headers, payload);
    if (!retryFailure) {
      return;
    }

    throw new Error(formatSupabaseError(retryFailure));
  }

  throw new Error(formatSupabaseError(firstFailure));
}
