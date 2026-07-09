import { render, screen } from '@testing-library/react';
import { LiveQueryTicker } from './LiveQueryTicker';

test('renders all logs when no filter', () => {
  render(<LiveQueryTicker gateFilter={null} />);
  expect(screen.getByText('Passenger flow smooth')).toBeInTheDocument();
  expect(screen.getByText('Congestion detected')).toBeInTheDocument();
});

test('filters logs based on gate', () => {
  render(<LiveQueryTicker gateFilter="Gate B" />);
  expect(screen.queryByText('Passenger flow smooth')).not.toBeInTheDocument();
  expect(screen.getByText('Congestion detected')).toBeInTheDocument();
});
