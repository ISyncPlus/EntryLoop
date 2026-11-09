import { lazy, Suspense } from 'react';
const LandingPage = lazy(() => import('./LandingPage'));
export function WebsiteEntry() {
  return (
    <Suspense
      fallback={
        <main>
          <h1>EntryLoop</h1>
          <p role="status">Opening EntryLoop…</p>
        </main>
      }
    >
      <LandingPage />
    </Suspense>
  );
}
