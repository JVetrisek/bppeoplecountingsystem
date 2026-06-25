import { useState } from 'react';
import Icon from '../Icon';

export default function AddRoomModal({ onSave, onClose }) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave(name.trim());
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box w-80">
        <h3 className="font-bold text-lg mb-4">Přidat místnost</h3>
        <div className="form-control flex flex-col">
          <label className="label"><span className="label-text">Název místnosti</span></label>
          <input
            className="input input-bordered"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="např. Zasedací místnost"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </div>
        <div className="modal-action mt-6">
          <button className="btn btn-neutral flex-1 gap-2" onClick={onClose}>
            <Icon name="x-circle" className="size-5" />
            Zrušit
          </button>
          <button className="btn btn-primary flex-1 gap-2" onClick={handleSubmit}>
            <Icon name="plus-circle" className="size-5" />
            Přidat
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}