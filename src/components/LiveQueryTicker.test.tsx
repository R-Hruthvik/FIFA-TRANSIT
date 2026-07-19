import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LiveQueryTicker } from './LiveQueryTicker';

// Mock the hook to isolate test scope and avoid missing context provider errors
jest.mock('@/data/hooks/useFanQueries', () => ({
  useFanQueries: () => [
    { _id: '1', text: 'Gate A - Entry slow', timestamp: '2026-07-12T10:00:00Z' },
  ],
}));

test('renders ticker with initial queries', async () => {
  render(<LiveQueryTicker gateFilter={null} />);
  expect(await screen.findByText(/Gate A/)).toBeInTheDocument();
  expect(await screen.findByText(/Entry slow/)).toBeInTheDocument();
});
