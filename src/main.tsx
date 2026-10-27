import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  EntryLoopDB,
  scannerProfile,
} from './features/check-in/persistence/database';
import { Workbench } from './features/workbench/Workbench';
import './styles.css';
const root = createRoot(document.getElementById('root')!);
try {
  const db = new EntryLoopDB(scannerProfile(window.location.search));
  root.render(
    <StrictMode>
      <Workbench db={db} />
    </StrictMode>,
  );
} catch (failure) {
  root.render(
    <main>
      <h1>EntryLoop could not start</h1>
      <p role="alert">
        {failure instanceof Error
          ? failure.message
          : 'Unexpected initialization error.'}
      </p>
      <a href="/">Open default profile</a>
    </main>,
  );
}
