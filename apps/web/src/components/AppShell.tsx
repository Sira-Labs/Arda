import { NavLink, Outlet } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

/**
 * One navigation for both layouts (docs/spec/04-design-system.md): a floating bottom bar on
 * phones, a sidebar from 960 px. Five destinations, the same order as the learning loop.
 */
export const NAVIGATION: readonly { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Heute', icon: 'today' },
  { to: '/pfad', label: 'Pfad', icon: 'path' },
  { to: '/mushaf', label: 'Muṣḥaf', icon: 'mushaf' },
  { to: '/labor', label: 'Labor', icon: 'lab' },
  { to: '/sheikh', label: 'Sheikh', icon: 'sheikh' },
];

export function AppShell() {
  return (
    <div className="app">
      <nav className="app-nav" aria-label="Hauptnavigation">
        <span className="app-brand">ʿArḍa</span>
        {NAVIGATION.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
