import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { scannerProfile } from '../check-in/persistence/database';
import type { KeyboardEvent } from 'react';
export function href(path: string): string {
  const source = new URLSearchParams(window.location.search);
  const params = new URLSearchParams();
  params.set('scanner', scannerProfile(window.location.search));
  for (const key of ['theme']) {
    const value = source.get(key);
    if (value) params.set(key, value);
  }
  return path + (params.size ? '?' + params.toString() : '');
}
export function useLiveData<T>(query: () => Promise<T>): {
  data: T | undefined;
  error: string;
} {
  const [state, setState] = useState<{
    query: () => Promise<T>;
    data: T | undefined;
    error: string;
  }>();
  useEffect(() => {
    let active = true;
    const subscription = liveQuery(query).subscribe({
      next: (data) => {
        if (active) setState({ query, data, error: '' });
      },
      error: (failure: unknown) => {
        if (active)
          setState({ query, data: undefined, error: message(failure) });
      },
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [query]);
  return state?.query === query
    ? { data: state.data, error: state.error }
    : { data: undefined, error: '' };
}

export function message(failure: unknown): string {
  return failure instanceof Error
    ? failure.message || failure.name
    : 'The operation could not be completed.';
}
export function eventDate(date: string): string {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date + 'T12:00:00Z'));
}

export function navigateTabs(event: KeyboardEvent<HTMLDivElement>): void {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
  const tabs = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  );
  if (!tabs.length) return;
  const current = Math.max(
    0,
    tabs.indexOf(document.activeElement as HTMLButtonElement),
  );
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) %
          tabs.length;
  event.preventDefault();
  tabs[next]?.focus();
  tabs[next]?.click();
}
