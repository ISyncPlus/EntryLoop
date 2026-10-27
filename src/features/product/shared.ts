import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import type { KeyboardEvent } from 'react';
export function href(path: string): string {
  const source = new URLSearchParams(window.location.search);
  const params = new URLSearchParams();
  for (const key of ['scanner', 'theme']) {
    const value = source.get(key);
    if (value) params.set(key, value);
  }
  return path + (params.size ? '?' + params.toString() : '');
}
export function useLiveData<T>(query: () => Promise<T>): {
  data: T | undefined;
  error: string;
} {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: setData,
      error: (failure: unknown) => setError(message(failure)),
    });
    return () => subscription.unsubscribe();
  }, [query]);
  return { data, error };
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
