import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecordingPanel from './RecordingPanel';
import { Angles } from '../services/sensorService';

describe('RecordingPanel', () => {
  const mockRecordings = [
    {
      timestamp: new Date('2024-01-01T10:00:00'),
      angles: { pitch: 10, roll: 20, yaw: 30 } as Angles
    },
    {
      timestamp: new Date('2024-01-01T10:01:00'),
      angles: { pitch: 15, roll: 25, yaw: 35 } as Angles
    }
  ];

  const mockOnClear = jest.fn();
  const mockOnExport = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display recordings count', () => {
    render(
      <RecordingPanel
        recordings={mockRecordings}
        onClear={mockOnClear}
        onExport={mockOnExport}
      />
    );
    
    expect(screen.getByText(/2 Recordings/)).toBeInTheDocument();
  });

  it('should display each recording with timestamp and angles', () => {
    render(
      <RecordingPanel
        recordings={mockRecordings}
        onClear={mockOnClear}
        onExport={mockOnExport}
      />
    );
    
    expect(screen.getByText(/10.0°/)).toBeInTheDocument();
    expect(screen.getByText(/20.0°/)).toBeInTheDocument();
    expect(screen.getByText(/30.0°/)).toBeInTheDocument();
    
    expect(screen.getByText(/15.0°/)).toBeInTheDocument();
    expect(screen.getByText(/25.0°/)).toBeInTheDocument();
    expect(screen.getByText(/35.0°/)).toBeInTheDocument();
  });

  it('should call onClear when clear button is clicked', () => {
    render(
      <RecordingPanel
        recordings={mockRecordings}
        onClear={mockOnClear}
        onExport={mockOnExport}
      />
    );
    
    const clearButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearButton);
    
    expect(mockOnClear).toHaveBeenCalled();
  });

  it('should call onExport when export button is clicked', () => {
    render(
      <RecordingPanel
        recordings={mockRecordings}
        onClear={mockOnClear}
        onExport={mockOnExport}
      />
    );
    
    const exportButton = screen.getByRole('button', { name: /export json/i });
    fireEvent.click(exportButton);
    
    expect(mockOnExport).toHaveBeenCalled();
  });

  it('should display average angles', () => {
    render(
      <RecordingPanel
        recordings={mockRecordings}
        onClear={mockOnClear}
        onExport={mockOnExport}
      />
    );
    
    // Average pitch: (10 + 15) / 2 = 12.5
    // Average roll: (20 + 25) / 2 = 22.5
    // Average yaw: (30 + 35) / 2 = 32.5
    expect(screen.getByText(/Average:/)).toBeInTheDocument();
    expect(screen.getByText(/P: 12.5°/)).toBeInTheDocument();
    expect(screen.getByText(/R: 22.5°/)).toBeInTheDocument();
    expect(screen.getByText(/Y: 32.5°/)).toBeInTheDocument();
  });

  it('should handle empty recordings array', () => {
    render(
      <RecordingPanel
        recordings={[]}
        onClear={mockOnClear}
        onExport={mockOnExport}
      />
    );
    
    expect(screen.getByText(/0 Recordings/)).toBeInTheDocument();
  });

  it('should format time correctly', () => {
    const recording = {
      timestamp: new Date('2024-01-01T14:30:45'),
      angles: { pitch: 10, roll: 20, yaw: 30 } as Angles
    };
    
    render(
      <RecordingPanel
        recordings={[recording]}
        onClear={mockOnClear}
        onExport={mockOnExport}
      />
    );
    
    // Should show time in HH:MM:SS format
    expect(screen.getByText(/14:30:45/)).toBeInTheDocument();
  });
});