import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { SensorService } from './services/sensorService';

jest.mock('./services/sensorService');

describe('App', () => {
  let mockSensorService: jest.Mocked<SensorService>;
  let mockSubscribe: jest.Mock;
  let mockStartListening: jest.Mock;
  let mockStopListening: jest.Mock;
  let mockCalibrate: jest.Mock;

  beforeEach(() => {
    mockSubscribe = jest.fn().mockReturnValue(() => {});
    mockStartListening = jest.fn();
    mockStopListening = jest.fn();
    mockCalibrate = jest.fn();

    mockSensorService = {
      getAngles: jest.fn().mockReturnValue({ pitch: 0, roll: 0, yaw: 0 }),
      getCalibrationOffsets: jest.fn().mockReturnValue({ pitch: 0, roll: 0, yaw: 0 }),
      setCalibrationOffsets: jest.fn(),
      calibrate: mockCalibrate,
      areSensorsAvailable: jest.fn().mockReturnValue(true),
      startListening: mockStartListening,
      stopListening: mockStopListening,
      subscribe: mockSubscribe,
    } as any;

    (SensorService as jest.MockedClass<typeof SensorService>).mockImplementation(() => mockSensorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render app title', () => {
    render(<App />);
    expect(screen.getByText('🍃 Leaf Angle Measurement')).toBeInTheDocument();
  });

  it('should display three angle measurements', () => {
    render(<App />);
    expect(screen.getByText('Pitch')).toBeInTheDocument();
    expect(screen.getByText('Roll')).toBeInTheDocument();
    expect(screen.getByText('Yaw')).toBeInTheDocument();
  });

  it('should show start button initially', () => {
    render(<App />);
    const startButton = screen.getByRole('button', { name: /start measuring/i });
    expect(startButton).toBeInTheDocument();
  });

  it('should start sensor listening when start button is clicked', () => {
    render(<App />);
    const startButton = screen.getByRole('button', { name: /start measuring/i });
    
    fireEvent.click(startButton);
    
    expect(mockStartListening).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('should show stop button when measuring', () => {
    render(<App />);
    const startButton = screen.getByRole('button', { name: /start measuring/i });
    
    fireEvent.click(startButton);
    
    expect(screen.getByRole('button', { name: /stop measuring/i })).toBeInTheDocument();
  });

  it('should stop sensor listening when stop button is clicked', () => {
    render(<App />);
    const startButton = screen.getByRole('button', { name: /start measuring/i });
    
    fireEvent.click(startButton);
    const stopButton = screen.getByRole('button', { name: /stop measuring/i });
    fireEvent.click(stopButton);
    
    expect(mockStopListening).toHaveBeenCalled();
  });

  it('should update angles when sensor data changes', async () => {
    render(<App />);
    const startButton = screen.getByRole('button', { name: /start measuring/i });
    
    fireEvent.click(startButton);
    
    // Get the subscriber callback and call it with new angles
    const subscriberCallback = mockSubscribe.mock.calls[0][0];
    subscriberCallback({ pitch: 45.5, roll: 30.2, yaw: 90.1 });
    
    await waitFor(() => {
      expect(screen.getByText('45.5')).toBeInTheDocument();
      expect(screen.getByText('30.2')).toBeInTheDocument();
      expect(screen.getByText('90.1')).toBeInTheDocument();
    });
  });

  it('should calibrate when calibrate button is clicked', () => {
    render(<App />);
    const calibrateButton = screen.getByRole('button', { name: /calibrate/i });
    
    fireEvent.click(calibrateButton);
    
    expect(mockCalibrate).toHaveBeenCalled();
  });

  it('should show error message when sensors are not available', () => {
    mockSensorService.areSensorsAvailable.mockReturnValue(false);
    
    render(<App />);
    
    expect(screen.getByText(/sensor access not available/i)).toBeInTheDocument();
  });

  it('should enable freeze/unfreeze functionality', () => {
    render(<App />);
    const startButton = screen.getByRole('button', { name: /start measuring/i });
    fireEvent.click(startButton);
    
    const freezeButton = screen.getByRole('button', { name: /freeze/i });
    expect(freezeButton).toBeInTheDocument();
    
    fireEvent.click(freezeButton);
    expect(screen.getByRole('button', { name: /unfreeze/i })).toBeInTheDocument();
  });

  it('should not update display when frozen', async () => {
    render(<App />);
    const startButton = screen.getByRole('button', { name: /start measuring/i });
    fireEvent.click(startButton);
    
    const subscriberCallback = mockSubscribe.mock.calls[0][0];
    subscriberCallback({ pitch: 10, roll: 20, yaw: 30 });
    
    await waitFor(() => {
      expect(screen.getByText('10.0')).toBeInTheDocument();
    });
    
    const freezeButton = screen.getByRole('button', { name: /freeze/i });
    fireEvent.click(freezeButton);
    
    subscriberCallback({ pitch: 50, roll: 60, yaw: 70 });
    
    // Should still show old values
    expect(screen.getByText('10.0')).toBeInTheDocument();
    expect(screen.queryByText('50.0')).not.toBeInTheDocument();
  });
});
