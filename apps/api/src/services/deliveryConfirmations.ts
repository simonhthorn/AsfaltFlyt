const DEFAULT_DELIVERY_CONFIRMATIONS_TABLE = "driver_delivery_confirmations";

type DeliveryConfirmationInsert = {
  trip_number: number;
  flow_step: string;
  action_label: string;
  confirmed_at: string;
  gps_online: boolean;
  last_deviation: string | null;
};

function pickSupabaseCredential() {
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
  const bearerToken = accessToken || apiKey;

  return { apiKey, bearerToken };
}

function getSupabaseRestEndpoint() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || "";
  const tableName = process.env.SUPABASE_DELIVERY_TABLE?.trim() || DEFAULT_DELIVERY_CONFIRMATIONS_TABLE;

  if (!supabaseUrl) {
    throw new Error("Mangler SUPABASE_URL.");
  }

  const normalizedBaseUrl = supabaseUrl.replace(/\/+$/, "");
  const encodedTableName = encodeURIComponent(tableName);

  return `${normalizedBaseUrl}/rest/v1/${encodedTableName}`;
}

export async function uploadDeliveryConfirmationToSupabase(payload: DeliveryConfirmationInsert): Promise<void> {
  const endpoint = getSupabaseRestEndpoint();
  const { apiKey, bearerToken } = pickSupabaseCredential();

  if (!apiKey || !bearerToken) {
    throw new Error(
      "Mangler Supabase-nøkkel. Sett en av SUPABASE_SECRET_ACCESS_KEY, SUPABASE_API_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_API_KEY, SUPABASE_PUBLIC_ACCESS_KEY, SUPABASE_API_PUBLIC_KEY eller SUPABASE_ACCESS_TOKEN.",
    );
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
      Authorization: `Bearer ${bearerToken}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    return;
  }

  const errorBody = await response.text().catch(() => "");
  throw new Error(`Supabase avviste opplasting (${response.status}): ${errorBody || "Ukjent feil"}`);
}
