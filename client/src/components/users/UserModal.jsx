import { useState, useEffect } from 'react';
import Icon from '../Icon';
import { createUser, updateUser } from '../../api/users.api';
import { useToast } from '../../context/ToastContext';

export default function UserModal({ user, onClose, onSaved }) {
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setPassword('');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRole('viewer');
    }
    setError(null);
  }, [user]);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    if (!user && !password.trim()) {
      setError('Heslo je povinné');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        role,
      };
      if (password.trim()) {
        payload.password = password;
      }

      if (user) {
        await updateUser(user.id, payload);
        addToast('Uživatel uložen', 'success');
      } else {
        await createUser({ ...payload, password: password.trim() });
        addToast('Uživatel vytvořen', 'success');
      }

      onSaved();
      onClose();
    } catch (err) {
      const message = err.response?.data?.error || 'Chyba při ukládání uživatele';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box w-100">
        <h3 className="font-bold text-lg mb-4">
          {user ? 'Upravit uživatele' : 'Nový uživatel'}
        </h3>

        {error && (
          <div role="alert" className="alert alert-error alert-soft border border-current text-sm mb-4">
            <Icon name="exclamation-circle" className="size-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="form-control flex flex-col">
            <label className="label"><span className="label-text">Jméno</span></label>
            <input
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jméno uživatele"
            />
          </div>

          <div className="form-control flex flex-col">
            <label className="label"><span className="label-text">E-mail</span></label>
            <input
              type="email"
              className="input input-bordered w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <div className="form-control flex flex-col">
            <label className="label">
              <span className="label-text">Heslo</span>
              {user && <span className="label-text-alt text-base-content/50">Nepovinné při úpravě</span>}
            </label>
            <input
              type="password"
              className="input input-bordered w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={user ? 'Ponechte prázdné pro zachování' : 'Heslo'}
            />
          </div>

          <div className="form-control flex flex-col">
            <label className="label"><span className="label-text">Role</span></label>
            <select
              className="select select-bordered w-full"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Administrátor</option>
            </select>
          </div>
        </div>

        <div className="modal-action mt-6">
          <button className="btn btn-neutral flex-1 gap-2" onClick={onClose} disabled={submitting}>
            <Icon name="x-circle" className="size-5" />
            Zrušit
          </button>
          <button className="btn btn-primary flex-1 gap-2" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <Icon name={user ? 'pencil-square' : 'plus-circle'} className="size-5" />
            )}
            {user ? 'Uložit' : 'Přidat'}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
