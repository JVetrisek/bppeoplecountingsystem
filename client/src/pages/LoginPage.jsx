import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      const message = err.response?.data?.error || 'Přihlášení se nezdařilo';
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-6">
      <div className="card bg-base-100 border border-base-300 w-full max-w-md">
        <div className="card-body">
          <h1 className="font-bold text-lg">People Counter</h1>
          <p className="text-base-content/60 text-sm mb-2">Přihlaste se do systému</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="form-control">
              <span className="label-text mb-1">E-mail</span>
              <input
                type="email"
                className="input input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>

            <label className="form-control">
              <span className="label-text mb-1">Heslo</span>
              <input
                type="password"
                className="input input-bordered w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>

            <button type="submit" className="btn btn-primary mt-2" disabled={submitting}>
              {submitting ? <span className="loading loading-spinner loading-sm" /> : 'Přihlásit se'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
