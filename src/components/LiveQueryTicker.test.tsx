import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LiveQueryTicker } from './LiveQueryTicker';
import { DataProvider } from '@/data/DataContext';

beforeEach(() => {
  global.EventSource = jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn(),
    close: jest.fn(),
  })) as unknown as typeof EventSource;
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
  render(
    <DataProvider isDemo={true}>
      <LiveQueryTicker gateFilter={null} />
    </DataProvider>
  );
  expect(await screen.findByText(/Fan Query Stream/i)).toBeInTheDocument();
});
