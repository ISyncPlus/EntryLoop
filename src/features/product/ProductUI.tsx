import type { ReactNode } from 'react';
import { navigateTabs } from './shared';
export function Icon({
  name,
  size = 20,
}: {
  name:
    | 'events'
    | 'scan'
    | 'exchange'
    | 'arrow'
    | 'help'
    | 'sun'
    | 'moon'
    | 'check';
  size?: number;
}) {
  const paths = {
    events: 'M4 5h16v15H4z M8 3v4 M16 3v4 M4 10h16',
    scan: 'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5 M7 12h10',
    exchange: 'M3 7h17l-4-4 M21 17H4l4 4 M20 7l-4 4 M4 17l4-4',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-1 .5-1 1.2-1 2.2 M12 17h.01',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.4 1.4 M17.6 17.6L19 19 M5 19l1.4-1.4 M17.6 6.4L19 5',
    moon: 'M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14z',
    check: 'M5 12l4 4L19 6',
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function ViewTabs({
  label,
  items,
  value,
  onChange,
  prefix,
}: {
  label: string;
  items: readonly string[];
  value: string;
  onChange: (value: string) => void;
  prefix: string;
}) {
  return (
    <div
      className="view-tabs"
      role="tablist"
      aria-label={label}
      onKeyDown={navigateTabs}
    >
      {items.map((item, index) => (
        <button
          key={item}
          role="tab"
          aria-selected={value === item}
          tabIndex={value === item ? 0 : -1}
          aria-controls={`${prefix}-panel`}
          id={`${prefix}-${index}`}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
export function LoadingState({ children }: { children: ReactNode }) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-block" aria-hidden="true" />
      {children}
    </div>
  );
}
