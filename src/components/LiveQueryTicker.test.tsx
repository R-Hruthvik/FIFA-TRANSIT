import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LiveQueryTicker } from './LiveQueryTicker';

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      logs: [
        { _id: '1', text: 'Gate A - Entry slow', timestamp: '2026-07-12T10:00:00Z' },
      ],
    }),
  } as Response);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders ticker with initial queries', async () => {
  render(<LiveQueryTicker gateFilter={null} />);
  expect(await screen.findByText(/Gate A/)).toBeInTheDocument();
  expect(await screen.findByText(/Entry slow/)).toBeInTheDocument();
});
