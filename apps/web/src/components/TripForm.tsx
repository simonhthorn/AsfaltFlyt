import { useState } from "react";
import type { NewTripFormData } from "../types/trips";

const initialForm: NewTripFormData = {
  driverName: "",
  projectName: "",
  pickupSite: "",
  quantityTons: 0,
};

interface TripFormProps {
  onSubmit: (payload: NewTripFormData) => Promise<void>;
  loading: boolean;
}

export function TripForm({ onSubmit, loading }: TripFormProps) {
  const [form, setForm] = useState<NewTripFormData>(initialForm);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof NewTripFormData>(field: K, value: NewTripFormData[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.driverName || !form.projectName || !form.pickupSite || form.quantityTons <= 0) {
      setError("Fyll ut alle felter og oppgi et gyldig antall tonn.");
      return;
    }

    await onSubmit(form);
    setForm(initialForm);
  }

  return (
    <form className="panel trip-form" onSubmit={handleSubmit}>
      <h2>Registrer ny kjøring</h2>
      <label>
        Sjåfør
        <input
          value={form.driverName}
          onChange={(event) => updateField("driverName", event.target.value)}
          placeholder="Navn på sjåfør"
          required
        />
      </label>
      <label>
        Prosjekt
        <input
          value={form.projectName}
          onChange={(event) => updateField("projectName", event.target.value)}
          placeholder="F.eks. E39-utvidelse"
          required
        />
      </label>
      <label>
        Hentested
        <input
          value={form.pickupSite}
          onChange={(event) => updateField("pickupSite", event.target.value)}
          placeholder="Asfaltverk / stasjon"
          required
        />
      </label>
      <label>
        Mengde (tonn)
        <input
          value={form.quantityTons === 0 ? "" : form.quantityTons}
          onChange={(event) => updateField("quantityTons", Number(event.target.value))}
          type="number"
          min="0.1"
          step="0.1"
          placeholder="0.0"
          required
        />
      </label>
      {error ? <p className="message message--error">{error}</p> : null}
      <div className="trip-form__actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Lagrer..." : "Registrer kjøring"}
        </button>
      </div>
    </form>
  );
}
