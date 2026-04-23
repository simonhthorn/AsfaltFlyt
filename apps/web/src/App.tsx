import { useState } from "react";
import {
  SUPABASE_DELIVERY_TABLE,
  type DeliveryConfirmationInsert,
  getSupabaseClient,
} from "./supabase";

const FLOW_STEPS = ["På fabrikk", "Underveis", "Ankommet utlegger", "Levert"] as const;

const ACTION_STYLES = [
  "bg-emerald-500 text-slate-950 active:bg-emerald-400",
  "bg-yellow-400 text-slate-950 active:bg-yellow-300",
  "bg-yellow-400 text-slate-950 active:bg-yellow-300",
  "bg-emerald-500 text-slate-950 active:bg-emerald-400",
] as const;

const ACTION_LABELS = [
  "Start tur",
  "Registrer ankomst",
  "Bekreft levering",
  "Start ny tur",
] as const;
const DELIVERY_CONFIRMATION_STEP_INDEX = 2;

type UploadState =
  | {
      type: "success" | "error";
      message: string;
    }
  | null;

function App() {
  const [tripNumber, setTripNumber] = useState(1234);
  const [currentStep, setCurrentStep] = useState(0);
  const gpsOnline = true;
  const [lastDeviation, setLastDeviation] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isDeliveryConfirmationStep = currentStep === DELIVERY_CONFIRMATION_STEP_INDEX;

  async function uploadDeliveryConfirmation() {
    const supabase = getSupabaseClient();
    const confirmedAt = new Date().toISOString();
    const payload: DeliveryConfirmationInsert = {
      trip_number: tripNumber,
      flow_step: FLOW_STEPS[currentStep],
      action_label: ACTION_LABELS[currentStep],
      confirmed_at: confirmedAt,
      gps_online: gpsOnline,
      last_deviation: lastDeviation,
    };

    const { error } = await supabase.from(SUPABASE_DELIVERY_TABLE).insert(payload);

    if (error) {
      throw new Error(`Klarte ikke laste opp til Supabase: ${error.message}`);
    }
  }

  async function handleMainAction() {
    if (isUploading) {
      return;
    }

    if (currentStep === FLOW_STEPS.length - 1) {
      setCurrentStep(0);
      setTripNumber((previous) => previous + 1);
      setLastDeviation(null);
      setUploadState(null);
      return;
    }

    if (isDeliveryConfirmationStep) {
      setIsUploading(true);
      setUploadState(null);

      try {
        await uploadDeliveryConfirmation();
        setCurrentStep((previous) => previous + 1);
        setUploadState({
          type: "success",
          message: "Levering lastet opp til Supabase.",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Klarte ikke laste opp levering til Supabase.";
        setUploadState({
          type: "error",
          message,
        });
      } finally {
        setIsUploading(false);
      }

      return;
    }

    setCurrentStep((previous) => previous + 1);
  }

  function registerDeviation() {
    const timestamp = new Date().toLocaleTimeString("nb-NO", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setLastDeviation(`Avvik registrert kl. ${timestamp}`);
  }

  return (
    <main className="h-[100dvh] bg-slate-900 text-slate-50">
      <div className="mx-auto flex h-full w-full max-w-md flex-col px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),0.75rem)]">
        <header className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4 shadow-lg shadow-black/30">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold tracking-wide text-slate-100">Tur #{tripNumber}</p>
            <div className="flex items-center gap-2 rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1">
              <span className={`h-2.5 w-2.5 rounded-full ${gpsOnline ? "bg-emerald-400" : "bg-red-500"}`} />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-100">
                {gpsOnline ? "GPS OK" : "GPS Feil"}
              </span>
            </div>
          </div>
          <p className="mt-3 text-2xl font-black leading-tight text-white">{FLOW_STEPS[currentStep]}</p>
        </header>

        <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-800/60 px-3 py-4">
          <div className="grid grid-cols-4 gap-2">
            {FLOW_STEPS.map((step, index) => (
              <div
                key={step}
                className={`h-2 rounded-full ${index <= currentStep ? "bg-yellow-400" : "bg-slate-700"}`}
              />
            ))}
          </div>
          <ol className="mt-3 grid grid-cols-4 gap-2">
            {FLOW_STEPS.map((step, index) => (
              <li
                key={step}
                className={`text-center text-xs font-semibold leading-tight ${
                  index <= currentStep ? "text-slate-100" : "text-slate-500"
                }`}
              >
                {index + 1}. {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-1 flex-col justify-center">
          <p className="mb-3 text-center text-base font-semibold text-slate-200">Neste handling</p>
          <button
            type="button"
            onClick={handleMainAction}
            disabled={isUploading}
            className={`select-none touch-manipulation rounded-3xl border-2 border-transparent px-6 py-8 text-3xl font-black leading-tight shadow-2xl shadow-black/50 transition min-h-[64px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60 ${ACTION_STYLES[currentStep]}`}
          >
            {isDeliveryConfirmationStep && isUploading ? "Laster opp..." : ACTION_LABELS[currentStep]}
          </button>
          <p className="mt-4 text-center text-sm font-medium text-slate-300">
            Trykk kun når steget er fullført.
          </p>
          <p
            className={`mt-2 min-h-6 text-center text-sm ${
              uploadState?.type === "error" ? "text-red-300" : "text-emerald-300"
            }`}
          >
            {uploadState?.message ?? " "}
          </p>
        </section>

        <footer className="space-y-2 pb-1">
          <button
            type="button"
            onClick={registerDeviation}
            className="min-h-[64px] w-full select-none touch-manipulation rounded-2xl border border-slate-600 bg-slate-800 px-6 py-4 text-base font-semibold text-slate-200 transition active:bg-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300/40"
          >
            Registrer avvik / venting
          </button>
          <p className="min-h-6 text-center text-sm text-slate-400">{lastDeviation ?? " "}</p>
        </footer>
      </div>
    </main>
  );
}

export default App;
