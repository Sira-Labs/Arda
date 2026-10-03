/** The few line icons the shell needs (24 px grid, currentColor), bundled for offline use. */
const PATHS = {
  today:
    'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8z',
  path: 'M5 19c4 0 3-6 7-6s3-6 7-6M5 19a1.5 1.5 0 1 0 0 .01M19 7a1.5 1.5 0 1 0 0 .01',
  mushaf:
    'M3 5c3-1.5 6-1.5 9 0v14c-3-1.5-6-1.5-9 0zM21 5c-3-1.5-6-1.5-9 0v14c3-1.5 6-1.5 9 0z',
  lab: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7.5 15h9',
  sheikh: 'M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8zM4 21c1-4 4.5-6 8-6s7 2 8 6',
  account:
    'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18zM12 12a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM6.2 18.4c1.2-2 3.3-3.4 5.8-3.4s4.6 1.4 5.8 3.4',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
