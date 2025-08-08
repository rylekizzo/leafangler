import React from 'react';
import { render, screen } from '@testing-library/react';
import AngleDisplay from './AngleDisplay';

describe('AngleDisplay', () => {
  it('should display angle value with label', () => {
    render(<AngleDisplay label="Pitch" value={45.5} unit="°" />);
    
    expect(screen.getByText('Pitch')).toBeInTheDocument();
    expect(screen.getByText('45.5')).toBeInTheDocument();
    expect(screen.getByText('°')).toBeInTheDocument();
  });

  it('should format angle to one decimal place', () => {
    render(<AngleDisplay label="Roll" value={123.456789} unit="°" />);
    
    expect(screen.getByText('123.5')).toBeInTheDocument();
  });

  it('should handle negative angles', () => {
    render(<AngleDisplay label="Yaw" value={-45.2} unit="°" />);
    
    expect(screen.getByText('-45.2')).toBeInTheDocument();
  });

  it('should apply color based on angle type', () => {
    const { container: pitchContainer } = render(<AngleDisplay label="Pitch" value={0} unit="°" />);
    const { container: rollContainer } = render(<AngleDisplay label="Roll" value={0} unit="°" />);
    const { container: yawContainer } = render(<AngleDisplay label="Yaw" value={0} unit="°" />);
    
    expect(pitchContainer.querySelector('.text-blue-600')).toBeInTheDocument();
    expect(rollContainer.querySelector('.text-green-600')).toBeInTheDocument();
    expect(yawContainer.querySelector('.text-purple-600')).toBeInTheDocument();
  });

  it('should display zero correctly', () => {
    render(<AngleDisplay label="Test" value={0} unit="°" />);
    
    expect(screen.getByText('0.0')).toBeInTheDocument();
  });

  it('should handle very large angles', () => {
    render(<AngleDisplay label="Test" value={359.9} unit="°" />);
    
    expect(screen.getByText('359.9')).toBeInTheDocument();
  });
});