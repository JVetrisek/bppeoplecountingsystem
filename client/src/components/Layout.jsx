import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';

function navLinkClass(isActive, mobile = false) {
  return `btn btn-sm ${mobile ? 'justify-start' : ''} ${isActive ? 'btn-primary' : 'btn-ghost'}`;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = user?.role === 'admin';

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    ...(isAdmin
      ? [
          { to: '/floorPlan', label: 'Plánek' },
          { to: '/sensors', label: 'Senzory' },
          { to: '/users', label: 'Přístupy' },
        ]
      : []),
  ];

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="h-screen flex flex-col bg-base-200 overflow-hidden">
      <header className="relative z-50 flex-shrink-0 bg-base-100 shadow-sm">
        <div className="navbar min-h-14 px-3 sm:px-6">
          {/* Mobil */}
          <div className="flex w-full items-center justify-between lg:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <img src="/logo.svg" alt="" className="size-8 shrink-0" />
              <span className="truncate font-bold text-base">People Counter</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-square btn-sm"
              aria-label={mobileMenuOpen ? 'Zavřít menu' : 'Otevřít menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              <Icon name="burgermenu" className="size-6" />
            </button>
          </div>

          {/* Desktop — logo | navigace | uživatel */}
          <div className="hidden w-full grid-cols-3 items-center gap-4 lg:grid">
            <div className="flex min-w-0 items-center gap-2 justify-self-start">
              <img src="/logo.svg" alt="" className="size-9 shrink-0" />
              <span className="truncate font-bold text-lg">People Counter</span>
            </div>

            <nav className="flex justify-center gap-1 justify-self-center" aria-label="Hlavní navigace">
              {navLinks.map(({ to, label }) => (
                <NavLink key={to} to={to} className={({ isActive }) => navLinkClass(isActive)}>
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center justify-end gap-3 justify-self-end min-w-0">
              <span className="max-w-[160px] truncate text-sm leading-none text-base-content/70">{user?.name}</span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={handleLogout}>
                Odhlásit se
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            className="border-t border-base-300 px-3 py-2 lg:hidden"
            aria-label="Mobilní navigace"
          >
            <div className="flex flex-col gap-1">
              {navLinks.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={closeMobileMenu}
                  className={({ isActive }) => navLinkClass(isActive, true)}
                >
                  {label}
                </NavLink>
              ))}
            </div>
            <div className="divider my-2" />
            <div className="px-3 py-1 text-sm text-base-content/70">{user?.name}</div>
            <button type="button" className="btn btn-ghost btn-sm justify-start" onClick={handleLogout}>
              Odhlásit se
            </button>
          </nav>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-3 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
