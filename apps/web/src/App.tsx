import { useCallback, useEffect, useState } from "react";
import { createTrip, fetchTrips } from "./api/trips";
import { TripForm } from "./components/TripForm";
import { TripTable } from "./components/TripTable";
import type { NewTripFormData, TripsResponse } from "./types/trips";
import "./App.css";

const EMPTY_OVERVIEW: TripsResponse = {
  trips: [],
  projectTotals: [],
};

function App() {
  const [overview, setOverview] = useState<TripsResponse>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchTrips();
      setOverview(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Kunne ikke hente data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const handleRegisterTrip = async (input: NewTripFormData) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await createTrip(input);
      setSuccess("Kjøring ble registrert.");

      const data = await fetchTrips();
      setOverview(data);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Kunne ikke registrere kjøring.");
    } finally {
      setSaving(false);
    }
  };

  const totalLoads = overview.trips.length;
  const totalTons = overview.projectTotals.reduce((sum, project) => sum + project.totalTons, 0);

  return (
    <main className="app">
      <header className="app__header">
        <p className="app__subtitle">AsfaltFlyt</p>
        <h1>Registrering av asfaltlass</h1>
        <p className="app__subtitle">
          Sjåfører registrerer hvert lass, og prosjektleder får løpende kontroll på tonnasje per prosjekt.
        </p>
      </header>

      <section className="overview">
        <article className="kpi">
          <p className="kpi__label">Registrerte kjøringer</p>
          <p className="kpi__value">{totalLoads}</p>
        </article>
        <article className="kpi">
          <p className="kpi__label">Totalt asfalt (tonn)</p>
          <p className="kpi__value">{totalTons.toFixed(2)}</p>
        </article>
      </section>

      {error ? <p className="message message--error">{error}</p> : null}
      {success ? <p className="message message--success">{success}</p> : null}

      <TripForm onSubmit={handleRegisterTrip} loading={saving} />
      <TripTable trips={overview.trips} projectTotals={overview.projectTotals} loading={loading} />
    </main>
  );
}

export default App;
