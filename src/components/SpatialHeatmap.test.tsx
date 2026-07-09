import { render, screen, fireEvent } from '@testing-library/react';
import { SpatialHeatmap } from './SpatialHeatmap';

test('renders all gates and handles click', () => {
  const onGateClick = jest.fn();
  render(<SpatialHeatmap onGateClick={onGateClick} />);
  
  const gateA = screen.getByText('Gate A');
  fireEvent.click(gateA);
  
  expect(onGateClick).toHaveBeenCalledWith('Gate A');
});
