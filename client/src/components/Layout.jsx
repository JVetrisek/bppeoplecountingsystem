import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex flex-col bg-base-200 overflow-hidden">
      <div className="navbar bg-base-100 shadow-sm px-6 flex-shrink-0">
        <div className="navbar-start gap-4">
          <span className="font-bold text-lg">People Counter</span>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
          >
            Dashboard
          </NavLink>
          {isAdmin && (
            <>
              <NavLink
                to="/floorPlan"
                className={({ isActive }) => `btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
              >
                Plánek
              </NavLink>
              <NavLink
                to="/sensors"
                className={({ isActive }) => `btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
              >
                Senzory
              </NavLink>
              <NavLink
                to="/users"
                className={({ isActive }) => `btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
              >
                Přístupy
              </NavLink>
            </>
          )}
        </div>
        <div className="navbar-end gap-3">
          <span className="text-sm text-base-content/70">{user?.name}</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={handleLogout}>
            Odhlásit se
          </button>
        </div>
      </div>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
