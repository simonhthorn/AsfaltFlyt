import type { AsphaltTrip, ProjectTotal } from "@asfaltflyt/domain";

interface TripTableProps {
  trips: AsphaltTrip[];
  projectTotals: ProjectTotal[];
  loading: boolean;
}

export function TripTable({ trips, projectTotals, loading }: TripTableProps) {
  if (loading) {
    return (
      <div className="card table-wrap">
        <h2>Registrerte kjøringer</h2>
        <p>Laster data...</p>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="card table-wrap">
        <h2>Registrerte kjøringer</h2>
        <p>Ingen registrerte kjøringer ennå.</p>
      </div>
    );
  }

  return (
    <>
      <div className="card table-wrap">
        <h2>Registrerte kjøringer</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Sjåfør</th>
              <th>Prosjekt</th>
              <th>Hentested</th>
              <th>Tonn</th>
              <th>Tid</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((trip) => (
              <tr key={trip.id}>
                <td>{trip.driverName}</td>
                <td>{trip.projectName}</td>
                <td>{trip.pickupSite}</td>
                <td>{trip.quantityTons.toFixed(2)}</td>
                <td>{new Date(trip.registeredAt).toLocaleString("nb-NO")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card table-wrap">
        <h2>Prosjektsummer</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Prosjekt</th>
              <th>Antall kjøringer</th>
              <th>Sum tonn</th>
            </tr>
          </thead>
          <tbody>
            {projectTotals.map((project) => (
              <tr key={project.projectName}>
                <td>{project.projectName}</td>
                <td>{project.totalLoads}</td>
                <td>{project.totalTons.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
