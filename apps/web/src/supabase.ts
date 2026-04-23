import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_DELIVERY_TABLE = "driver_delivery_confirmations" as const;

interface Database {
  public: {
    Tables: {
      driver_delivery_confirmations: {
        Row: {
          confirmation_id: number;
          trip_number: number;
          flow_step: string;
          action_label: string;
          confirmed_at: string;
          gps_online: boolean;
          last_deviation: string | null;
          created_at: string;
        };
        Insert: {
          trip_number: number;
          flow_step: string;
          action_label: string;
          confirmed_at: string;
          gps_online: boolean;
          last_deviation?: string | null;
        };
        Update: {
          trip_number?: number;
          flow_step?: string;
          action_label?: string;
          confirmed_at?: string;
          gps_online?: boolean;
          last_deviation?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type DeliveryConfirmationInsert =
  Database["public"]["Tables"]["driver_delivery_confirmations"]["Insert"];

let cachedClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Mangler Supabase-oppsett. Sett VITE_SUPABASE_URL og VITE_SUPABASE_ANON_KEY i miljøvariabler.",
    );
  }

  cachedClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  return cachedClient;
}
