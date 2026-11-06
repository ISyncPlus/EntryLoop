import { it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StorageFailure } from './StorageFailure';
import { downloadText } from '../tickets/export';
vi.mock('../tickets/export', () => ({ downloadText: vi.fn() }));
vi.mock('../storage/workspaces', () => ({
  workspaceInventory: vi.fn().mockResolvedValue([]),
}));
it('keeps an actionable local error but excludes possibly sensitive error text from diagnostic downloads', async () => {
  render(
    <StorageFailure
      error="Read failed for Alice Guest, alice@example.com"
      database="entryloop-v1-organizer"
    />,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Read failed');
  await userEvent.setup().click(
    screen.getByRole('button', {
      name: 'Download read-only storage diagnostic',
    }),
  );
  await waitFor(() => expect(downloadText).toHaveBeenCalled());
  const text = vi.mocked(downloadText).mock.calls[0]![1];
  expect(text).not.toContain('Alice');
  expect(text).not.toContain('@');
  expect(JSON.parse(text)).toMatchObject({
    database: 'entryloop-v1-organizer',
    status: 'storage-unavailable',
    workspaces: [],
  });
});
