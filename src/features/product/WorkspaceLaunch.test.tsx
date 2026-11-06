import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkspaceLaunch } from './WorkspaceLaunch';
it('does not report an empty storage context when workspace enumeration failed', () => {
  render(<WorkspaceLaunch profiles={[]} error="IndexedDB listing failed" />);
  expect(screen.getByRole('alert')).toHaveTextContent(
    'IndexedDB listing failed',
  );
  expect(screen.getByText(/No conclusion about stored events/)).toBeVisible();
  expect(
    screen.queryByText(/No existing workspace was detected/),
  ).not.toBeInTheDocument();
});
