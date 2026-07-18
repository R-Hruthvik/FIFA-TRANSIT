import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Page from './page';

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { role: 'staff', name: 'Test Staff' } },
    status: 'authenticated',
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

test('renders dashboard layout structure', () => {
  render(<Page />);
  expect(screen.getByRole('main')).toBeInTheDocument();
});
