import type { CSSProperties } from 'react';

/** The name, written the same in every interface language. */
export const BRAND_NAME = 'ʿArḍa';
/** The Arabic name, in the IndoPak muṣḥaf script. */
export const BRAND_NAME_AR = 'العَرْضة';

/**
 * How the mark is drawn (docs/spec/04-design-system.md §11):
 * - `tile`: the app icon and favicon (public/favicon.svg): the star and its teal centre on a
 *   rounded ink square, for paper surfaces;
 * - `star`: the star and its centre alone, for ink surfaces (the sidebar);
 * - `rings`: the large mark, the star inside two teal rings, for ink surfaces (sign-in).
 */
export type LogoVariant = 'tile' | 'star' | 'rings';

const saffron: CSSProperties = { stroke: 'var(--brand-saffron)', fill: 'none' };
const teal: CSSProperties = { fill: 'var(--brand-teal)' };
const ring: CSSProperties = { stroke: 'var(--brand-teal)', fill: 'none' };

/**
 * The ʿArḍa mark: an eight-pointed star of two squares, the second turned by 45°. Decorative
 * unless it has a `label`; then it is an image with that name.
 */
export function Logo({
  size = 32,
  variant = 'tile',
  label,
  className,
}: {
  size?: number;
  variant?: LogoVariant;
  label?: string;
  className?: string;
}) {
  const a11y = label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ 'aria-hidden': true } as const);
  if (variant === 'rings') {
    // 560 units: the inner ring passes through the star's points.
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 560 560"
        className={className}
        focusable="false"
        {...a11y}
      >
        <circle cx="280" cy="280" r="226" strokeWidth="10" style={ring} />
        <circle
          cx="280"
          cy="280"
          r="160"
          strokeWidth="10"
          style={{ ...ring, opacity: 0.6 }}
        />
        <g strokeWidth="20" style={saffron}>
          <rect x="167" y="167" width="226" height="226" />
          <rect x="167" y="167" width="226" height="226" transform="rotate(45 280 280)" />
        </g>
      </svg>
    );
  }
  // 64 units, as the favicon; the star alone is cropped to its own extent.
  return (
    <svg
      width={size}
      height={size}
      viewBox={variant === 'tile' ? '0 0 64 64' : '9 9 46 46'}
      className={className}
      focusable="false"
      {...a11y}
    >
      {variant === 'tile' && (
        <rect width="64" height="64" rx="14" style={{ fill: 'var(--ink)' }} />
      )}
      <g strokeWidth="2.5" style={saffron}>
        <rect x="18" y="18" width="28" height="28" />
        <rect x="18" y="18" width="28" height="28" transform="rotate(45 32 32)" />
      </g>
      <circle cx="32" cy="32" r="6" style={teal} />
    </svg>
  );
}

/** The mark beside the name, as the sidebar's brand. */
export function LogoLockup({
  name = BRAND_NAME,
  size = 32,
}: {
  name?: string;
  size?: number;
}) {
  return (
    <span className="logo-lockup">
      <Logo variant="star" size={size} />
      <span className="logo-wordmark">{name}</span>
    </span>
  );
}

/**
 * The brand header of the sign-in page (the design's "Anmelden"): on ink, the large mark,
 * the Arabic name, the name and the tagline.
 */
export function BrandHeader({ tagline }: { tagline: string }) {
  return (
    <div className="brand-header">
      <Logo variant="rings" size={80} />
      <p className="brand-header-arabic" lang="ar" dir="rtl">
        {BRAND_NAME_AR}
      </p>
      <p className="logo-wordmark brand-header-name">{BRAND_NAME}</p>
      <p className="brand-header-tagline">{tagline}</p>
    </div>
  );
}
