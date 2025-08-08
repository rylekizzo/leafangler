import { SensorService } from './sensorService';

describe('SensorService', () => {
  let sensorService: SensorService;
  let mockDeviceOrientationHandler: (event: DeviceOrientationEvent) => void;
  let mockDeviceMotionHandler: (event: DeviceMotionEvent) => void;

  beforeEach(() => {
    sensorService = new SensorService();
    
    // Mock addEventListener
    jest.spyOn(window, 'addEventListener').mockImplementation((event: string, handler: any) => {
      if (event === 'deviceorientation') {
        mockDeviceOrientationHandler = handler;
      } else if (event === 'devicemotion') {
        mockDeviceMotionHandler = handler;
      }
    });

    jest.spyOn(window, 'removeEventListener').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with zero angles', () => {
      const angles = sensorService.getAngles();
      expect(angles.pitch).toBe(0);
      expect(angles.roll).toBe(0);
      expect(angles.yaw).toBe(0);
    });

    it('should have calibration offsets at zero initially', () => {
      const calibration = sensorService.getCalibrationOffsets();
      expect(calibration.pitch).toBe(0);
      expect(calibration.roll).toBe(0);
      expect(calibration.yaw).toBe(0);
    });
  });

  describe('sensor event handling', () => {
    it('should update angles from device orientation event', () => {
      sensorService.startListening();
      
      const mockEvent = new Event('deviceorientation') as DeviceOrientationEvent;
      Object.defineProperty(mockEvent, 'beta', { value: 45, writable: false });
      Object.defineProperty(mockEvent, 'gamma', { value: 30, writable: false });
      Object.defineProperty(mockEvent, 'alpha', { value: 90, writable: false });
      
      mockDeviceOrientationHandler(mockEvent);
      
      const angles = sensorService.getAngles();
      expect(angles.pitch).toBe(45);
      expect(angles.roll).toBe(30);
      expect(angles.yaw).toBe(90);
    });

    it('should apply calibration offsets to angles', () => {
      sensorService.startListening();
      sensorService.setCalibrationOffsets({ pitch: 10, roll: 5, yaw: 15 });
      
      const mockEvent = new Event('deviceorientation') as DeviceOrientationEvent;
      Object.defineProperty(mockEvent, 'beta', { value: 45, writable: false });
      Object.defineProperty(mockEvent, 'gamma', { value: 30, writable: false });
      Object.defineProperty(mockEvent, 'alpha', { value: 90, writable: false });
      
      mockDeviceOrientationHandler(mockEvent);
      
      const angles = sensorService.getAngles();
      expect(angles.pitch).toBe(35); // 45 - 10
      expect(angles.roll).toBe(25);  // 30 - 5
      expect(angles.yaw).toBe(75);   // 90 - 15
    });
  });

  describe('calibration', () => {
    it('should calibrate to current angles', () => {
      sensorService.startListening();
      
      const mockEvent = new Event('deviceorientation') as DeviceOrientationEvent;
      Object.defineProperty(mockEvent, 'beta', { value: 10, writable: false });
      Object.defineProperty(mockEvent, 'gamma', { value: 5, writable: false });
      Object.defineProperty(mockEvent, 'alpha', { value: 20, writable: false });
      
      mockDeviceOrientationHandler(mockEvent);
      sensorService.calibrate();
      
      const angles = sensorService.getAngles();
      expect(angles.pitch).toBe(0);
      expect(angles.roll).toBe(0);
      expect(angles.yaw).toBe(0);
      
      const offsets = sensorService.getCalibrationOffsets();
      expect(offsets.pitch).toBe(10);
      expect(offsets.roll).toBe(5);
      expect(offsets.yaw).toBe(20);
    });
  });

  describe('sensor availability', () => {
    it('should check if sensors are available', () => {
      const isAvailable = sensorService.areSensorsAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should handle missing sensor support gracefully', () => {
      const originalOrientation = window.DeviceOrientationEvent;
      (window as any).DeviceOrientationEvent = undefined;
      
      const service = new SensorService();
      expect(service.areSensorsAvailable()).toBe(false);
      
      (window as any).DeviceOrientationEvent = originalOrientation;
    });
  });

  describe('listener management', () => {
    it('should start and stop listening to sensor events', () => {
      sensorService.startListening();
      expect(window.addEventListener).toHaveBeenCalledWith('deviceorientation', expect.any(Function));
      
      sensorService.stopListening();
      expect(window.removeEventListener).toHaveBeenCalledWith('deviceorientation', expect.any(Function));
    });

    it('should notify subscribers when angles change', () => {
      const callback = jest.fn();
      sensorService.subscribe(callback);
      sensorService.startListening();
      
      const mockEvent = new Event('deviceorientation') as DeviceOrientationEvent;
      Object.defineProperty(mockEvent, 'beta', { value: 45, writable: false });
      Object.defineProperty(mockEvent, 'gamma', { value: 30, writable: false });
      Object.defineProperty(mockEvent, 'alpha', { value: 90, writable: false });
      
      mockDeviceOrientationHandler(mockEvent);
      
      expect(callback).toHaveBeenCalledWith({
        pitch: 45,
        roll: 30,
        yaw: 90
      });
    });

    it('should unsubscribe callbacks', () => {
      const callback = jest.fn();
      const unsubscribe = sensorService.subscribe(callback);
      sensorService.startListening();
      
      unsubscribe();
      
      const mockEvent = new Event('deviceorientation') as DeviceOrientationEvent;
      Object.defineProperty(mockEvent, 'beta', { value: 45, writable: false });
      Object.defineProperty(mockEvent, 'gamma', { value: 30, writable: false });
      Object.defineProperty(mockEvent, 'alpha', { value: 90, writable: false });
      
      mockDeviceOrientationHandler(mockEvent);
      
      expect(callback).not.toHaveBeenCalled();
    });
  });
});