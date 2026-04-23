import { useState, type FormEvent } from "react";

const FLOW_STEPS = ["På fabrikk", "Underveis", "Ankommet utlegger", "Levert"] as const;
const EMPLOYEES = ["Ola Nordmann", "Kari Hansen", "Morten Nilsen", "Fatima Ali"] as const;

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

function App() {
  const [tripNumber, setTripNumber] = useState(1234);
  const [currentStep, setCurrentStep] = useState(0);
  const [employeeCandidate, setEmployeeCandidate] = useState("");
  const [loggedInEmployee, setLoggedInEmployee] = useState<string | null>(null);
  const [quantityTons, setQuantityTons] = useState("");
  const [tripError, setTripError] = useState<string | null>(null);
  const gpsOnline = true;
  const [lastDeviation, setLastDeviation] = useState<string | null>(null);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!employeeCandidate) {
      setTripError("Velg en ansatt for å logge inn.");
      return;
    }

    setLoggedInEmployee(employeeCandidate);
    setTripError(null);
  }

  function parseQuantity(input: string) {
    return Number(input.replace(",", "."));
  }

  function handleMainAction() {
    if (!loggedInEmployee) {
      setTripError("Du må logge inn med en ansatt før tur kan registreres.");
      return;
    }

    if (currentStep === 0) {
      const quantity = parseQuantity(quantityTons);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        setTripError("Legg inn et gyldig antall tonn før turen starter.");
        return;
      }
    }

    if (currentStep === FLOW_STEPS.length - 1) {
      setCurrentStep(0);
      setTripNumber((previous) => previous + 1);
      setLastDeviation(null);
      setQuantityTons("");
      setTripError(null);
      return;
    }

    setCurrentStep((previous) => previous + 1);
    setTripError(null);
  }

  function registerDeviation() {
    const timestamp = new Date().toLocaleTimeString("nb-NO", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setLastDeviation(`Avvik registrert kl. ${timestamp}`);
  }

  if (!loggedInEmployee) {
    return (
      <main className="h-[100dvh] bg-slate-900 text-slate-50">
        <div className="mx-auto flex h-full w-full max-w-md flex-col justify-center px-4">
          <form
            onSubmit={handleLogin}
            className="rounded-2xl border border-slate-700 bg-slate-800/80 p-5 shadow-lg shadow-black/30"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-300">Påkrevd før registrering</p>
            <h1 className="mt-2 text-2xl font-black text-white">Logg inn som ansatt</h1>
            <p className="mt-2 text-sm text-slate-300">
              Velg ansattprofil før du kan registrere og starte tur.
            </p>

            <label className="mt-4 block text-sm font-semibold text-slate-200">
              Ansatt
              <select
                value={employeeCandidate}
                onChange={(event) => setEmployeeCandidate(event.target.value)}
                className="mt-2 min-h-[48px] w-full rounded-xl border border-slate-600 bg-slate-900 px-3 text-base text-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
                required
              >
                <option value="">Velg ansatt</option>
                {EMPLOYEES.map((employee) => (
                  <option key={employee} value={employee}>
                    {employee}
                  </option>
                ))}
              </select>
            </label>

            {tripError ? <p className="mt-3 text-sm font-semibold text-red-300">{tripError}</p> : null}

            <button
              type="submit"
              className="mt-5 min-h-[64px] w-full rounded-2xl bg-emerald-500 px-6 py-4 text-lg font-black text-slate-950 shadow-xl shadow-black/30 transition active:bg-emerald-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
            >
              Logg inn
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] bg-slate-900 text-slate-50">
      <div className="mx-auto flex h-full w-full max-w-md flex-col px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),0.75rem)]">
        <header className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4 shadow-lg shadow-black/30">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold tracking-wide text-slate-100">Tur #{tripNumber}</p>
              <p className="text-xs text-slate-300">Innlogget: {loggedInEmployee}</p>
            </div>
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

        <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
          <label className="block text-sm font-semibold text-slate-200">
            Antall tonn i lass
            <input
              type="number"
              min="0.1"
              step="0.1"
              inputMode="decimal"
              placeholder="F.eks. 18.5"
              value={quantityTons}
              onChange={(event) => setQuantityTons(event.target.value)}
              disabled={currentStep > 0}
              className="mt-2 min-h-[48px] w-full rounded-xl border border-slate-600 bg-slate-900 px-3 text-base text-slate-100 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
              required
            />
          </label>
          <p className="mt-2 text-xs text-slate-400">
            {currentStep === 0
              ? "Må fylles ut før turstart."
              : "Lassmengde låses mens turen pågår."}
          </p>
        </section>

        <section className="flex flex-1 flex-col justify-center">
          <p className="mb-3 text-center text-base font-semibold text-slate-200">Neste handling</p>
          <button
            type="button"
            onClick={handleMainAction}
            className={`select-none touch-manipulation rounded-3xl border-2 border-transparent px-6 py-8 text-3xl font-black leading-tight shadow-2xl shadow-black/50 transition min-h-[64px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60 ${ACTION_STYLES[currentStep]}`}
          >
            {ACTION_LABELS[currentStep]}
          </button>
          <p className="mt-4 text-center text-sm font-medium text-slate-300">
            Trykk kun når steget er fullført.
          </p>
          {tripError ? <p className="mt-3 text-center text-sm font-semibold text-red-300">{tripError}</p> : null}
        </section>

        <footer className="space-y-2 pb-1">
          <button
            type="button"
            onClick={() => {
              setLoggedInEmployee(null);
              setEmployeeCandidate("");
              setTripError(null);
            }}
            className="min-h-[56px] w-full select-none touch-manipulation rounded-2xl border border-slate-600 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-200 transition active:bg-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300/40"
          >
            Logg ut ansatt
          </button>
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
