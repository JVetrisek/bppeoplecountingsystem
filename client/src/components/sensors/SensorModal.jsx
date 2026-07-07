import { useState } from 'react';
import Icon from '../Icon';

function getFieldError(message, field) {
  if (!message) return null;
  const lower = message.toLowerCase();
  if (lower.includes('name') && lower.includes('deveui')) return null;
  if (field === 'devEui' && lower.includes('deveui')) return message;
  if (field === 'name' && (lower.includes(' name') || lower.endsWith(': name'))) return message;
  return null;
}

export default function SensorModal({ sensor, onSave, onClose, error, onClearError }) {
  const [name, setName] = useState(() => sensor?.name ?? '');
  const [devEui, setDevEui] = useState(() => sensor?.devEui ?? '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !devEui.trim()) return;
    setSubmitting(true);
    try {
      await onSave({ name: name.trim(), devEui: devEui.trim() });
    } finally {
      setSubmitting(false);
    }
  };

  const generalError = error && !error.field ? error.message : null;
  const nameError = error ? getFieldError(error.message, 'name') : null;
  const devEuiError = error ? getFieldError(error.message, 'devEui') : null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-100">
        <h3 className="font-bold text-lg mb-4">
            {sensor ? 'Uprava senzoru' : 'Nový senzor'}
        </h3>

        {generalError && (
          <div role="alert" className="alert alert-error alert-soft border border-current text-sm mb-4">
            <Icon name="exclamation-circle" className="size-5" />
            <span>{generalError}</span>
          </div>
        )}

        <div className="flex flex-col gap-4">
            <div className="form-control flex flex-col">
            <label className="label"><span className="label-text">Název</span></label>
            <input
                className={`input input-bordered w-full ${nameError ? 'input-error' : ''}`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  onClearError?.();
                }}
                placeholder="Název senzoru"
            />
            {nameError && <p className="text-error text-sm mt-1">{nameError}</p>}
            </div>
            <div className="form-control flex flex-col">
            <label className="label"><span className="label-text">DevEUI</span></label>
            <input
                className={`input input-bordered w-full ${devEuiError ? 'input-error' : ''}`}
                value={devEui}
                onChange={(e) => {
                  setDevEui(e.target.value);
                  onClearError?.();
                }}
                placeholder="např. 24E124767F020849"
            />
            {devEuiError && <p className="text-error text-sm mt-1">{devEuiError}</p>}
            </div>
        </div>
        <div className="modal-action mt-6">
            <button className="btn btn-neutral flex-1 gap-2" onClick={onClose} disabled={submitting}>
              <Icon name="x-circle" className="size-5" />
              Zrušit
            </button>
            <button className="btn btn-primary flex-1 gap-2" onClick={handleSubmit} disabled={submitting}>
              <Icon name={sensor ? 'pencil-square' : 'plus-circle'} className="size-5" />
              {sensor ? 'Uložit' : 'Přidat'}
            </button>
        </div>
        </div>
    </div>
  );
}