import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';

/**
 * A learning screen (a station, a game, a recording): no navigation bar, a close button and
 * the progress through the unit (docs/spec/04-design-system.md §5).
 */
export function LearningShell({
  closeTo,
  progress,
  children,
}: {
  closeTo: string;
  /** Fraction done, 0 to 1. */
  progress: number;
  children: ReactNode;
}) {
  const { m } = useI18n();
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div className="learning">
      <header className="learning-bar">
        <Link className="btn-round" to={closeTo} aria-label={m.ruleCard.close}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </Link>
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div style={{ inlineSize: `${percent}%` }} />
        </div>
      </header>
      <main className="learning-main">{children}</main>
    </div>
  );
}
