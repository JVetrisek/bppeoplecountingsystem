import Icon from '../Icon';

export default function SensorTable({ sensors, onDelete, onEdit }) {
    if (!sensors.length) {
      return <p className="text-base-content/50">Žádné senzory</p>;
    }

    return (
      <div className="flex-1 min-h-0 overflow-hidden rounded-box border border-base-content/5 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <table className="table table-pin-rows">
            <thead>
              <tr>
                <th>Název</th>
                <th>DevEUI</th>
                <th>Přiřazeno k</th>
                <th>Poslední data</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sensors.map((sensor) => (
                <tr key={sensor.id} className="hover">
                  <td>{sensor.name}</td>
                  <td><span className="badge badge-soft badge-primary">{sensor.devEui}</span></td>
                  <td>{sensor.room?.name || '—'}</td>
                  <td>{sensor.lastSeenAt ? new Date(sensor.lastSeenAt).toLocaleString('cs-CZ') : '—'}</td>
                  <td>
                    <div className="flex gap-2 justify-end">
                      <button className="btn btn-sm btn-ghost gap-1" onClick={() => onEdit(sensor)}>
                        <Icon name="pencil-square" className="size-4" />
                        Upravit
                      </button>
                      <button className="btn btn-sm btn-error btn-outline gap-1" onClick={() => onDelete(sensor)}>
                        <Icon name="x-circle" className="size-4" />
                        Smazat
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }