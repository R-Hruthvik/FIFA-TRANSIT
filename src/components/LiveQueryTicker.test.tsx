import { render, screen } from '@testing-library/react';
import { LiveQueryTicker } from './LiveQueryTicker';

test('renders ticker with initial queries', () => {
  render(<LiveQueryTicker gateFilter={null} />);
  expect(screen.getByText(/Gate A/)).toBeInTheDocument();
  expect(screen.getByText(/10:00/)).toBeInTheDocument();
  expect(screen.getByText(/Entry slow/)).toBeInTheDocument();
});
