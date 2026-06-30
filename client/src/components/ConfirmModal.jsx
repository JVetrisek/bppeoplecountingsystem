import Icon from './Icon';

export default function ConfirmModal({ title, itemName, onConfirm, onClose }) {
  return (
    <div className="modal modal-open">
      <div className="modal-box w-100">
        <h3 className="font-bold text-lg mb-4">{title}</h3>
        <p className="font-semibold">{itemName}</p>
        <div className="modal-action mt-6">
          <button className="btn btn-neutral flex-1 gap-2" onClick={onClose}>
            <Icon name="x-circle" className="size-5" />
            Zrušit
          </button>
          <button className="btn btn-error flex-1 gap-2" onClick={onConfirm}>
            <Icon name="x-circle" className="size-5" />
            Smazat
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
