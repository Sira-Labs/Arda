import { NavLink, Outlet } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import type { Messages } from '@/i18n/messages';
import { Icon, type IconName } from './Icon';
import { LogoLockup } from './Logo';

/**
 * One navigation for both layouts (docs/spec/04-design-system.md): a floating bottom bar on
 * phones, a sidebar from 960 px. Five destinations, the same order as the learning loop. In
 * Arabic the whole shell mirrors (dir="rtl").
 */
export const NAVIGATION: readonly {
  to: string;
  label: keyof Omit<Messages['nav'], 'label' | 'brand'>;
  icon: IconName;
}[] = [
  { to: '/', label: 'today', icon: 'today' },
  { to: '/pfad', label: 'path', icon: 'path' },
  { to: '/mushaf', label: 'mushaf', icon: 'mushaf' },
  { to: '/labor', label: 'lab', icon: 'lab' },
  { to: '/sheikh', label: 'sheikh', icon: 'sheikh' },
];

export function AppShell() {
  const { m } = useI18n();
  return (
    <div className="app">
      <nav className="app-nav" aria-label={m.nav.label}>
        {/* The brand tops the sidebar; the phone's bottom bar has room for the five places only. */}
        <span className="app-brand">
          <LogoLockup name={m.nav.brand} />
        </span>
        {NAVIGATION.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            <Icon name={item.icon} />
            <span>{m.nav[item.label]}</span>
          </NavLink>
        ))}
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
