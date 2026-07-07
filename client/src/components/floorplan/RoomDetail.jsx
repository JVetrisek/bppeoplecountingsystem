import { useState, useRef } from 'react';
import Icon from '../Icon';

function initialDraft(room) {
  return {
    name: room?.name || '',
    capacity: room?.capacity ?? '',
    sensorId: room?.sensorId || '',
  };
}

export default function RoomDetail({ room, sensors, onClose, onChange, onDelete }) {
  const [draft, setDraft] = useState(() => initialDraft(room));
  const debounceRef = useRef(null);

  const handleChange = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(room.id, { [field]: field === 'capacity' ? Number(value) : value });
    }, 500);
  };

  if (!room) return null;

  return (
    <div className="card bg-base-100 p-4 h-full flex flex-col gap-4 min-h-0 overflow-y-auto">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-lg">Detail místnosti</h2>
        <button className="btn btn-sm btn-ghost btn-square" onClick={onClose} aria-label="Zavřít">
          <Icon name="x-circle" className="size-5" />
        </button>
      </div>

      <div className="form-control flex flex-col">
        <label className="label"><span className="label-text">Název</span></label>
        <input
          className="input input-bordered input-sm"
          value={draft.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />
      </div>

      <div className="form-control flex flex-col">
        <label className="label"><span className="label-text">Kapacita</span></label>
        <input
          className="input input-bordered input-sm"
          type="number"
          min={1}
          value={draft.capacity}
          onChange={(e) => handleChange('capacity', e.target.value)}
        />
      </div>

      <div className="form-control flex flex-col">
        <label className="label"><span className="label-text">Senzor</span></label>
        <select
            className="select select-bordered select-sm"
            value={draft.sensorId}
            onChange={(e) => handleChange('sensorId', e.target.value)}
            >
            <option value="">— bez senzoru —</option>
            {sensors
            .slice()
            .sort((a, b) => {
                const aAssigned = a.room && a.room.id !== room.id;
                const bAssigned = b.room && b.room.id !== room.id;
                return aAssigned - bAssigned;
            })
            .map(s => {
                const isAssigned = s.room && s.room.id !== room.id;
                return (
                <option key={s.id} value={s.id} disabled={isAssigned}>
                    {s.name}{isAssigned ? ' · přiřazen' : ''}
                </option>
                );
            })}
        </select>
      </div>

      <div className="form-control flex flex-col">
        <label className="label"><span className="label-text">Rozměry</span></label>
        <div className="flex gap-2">
            <input
            className="input input-bordered input-sm w-full"
            type="number"
            value={room.geometry?.width ?? ''}
            onChange={(e) => onChange(room.id, { geometry: { ...room.geometry, width: Number(e.target.value) } })}
            placeholder="Šířka"
            />
            <input
            className="input input-bordered input-sm w-full"
            type="number"
            value={room.geometry?.height ?? ''}
            onChange={(e) => onChange(room.id, { geometry: { ...room.geometry, height: Number(e.target.value) } })}
            placeholder="Výška"
            />
        </div>
        </div>

      <div className="mt-auto">
        <button
          className="btn btn-error btn-outline w-full gap-2"
          onClick={() => onDelete(room.id)}
        >
          <Icon name="x-circle" className="size-5" />
          Smazat místnost
        </button>
      </div>
    </div>
  );
}