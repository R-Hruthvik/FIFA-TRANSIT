import { render, screen } from '@testing-library/react';
import Page from './page';

test('renders dashboard layout structure', () => {
  render(<Page />);
  expect(screen.getByRole('main')).toBeInTheDocument();
});
