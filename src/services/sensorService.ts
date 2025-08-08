export interface Angles {
  pitch: number; // X-axis rotation (beta)
  roll: number;  // Y-axis rotation (gamma)
  yaw: number;   // Z-axis rotation (alpha)
}

export interface CalibrationOffsets {
  pitch: number;
  roll: number;
  yaw: number;
}

type AngleSubscriber = (angles: Angles) => void;

export class SensorService {
  private angles: Angles = { pitch: 0, roll: 0, yaw: 0 };
  private calibrationOffsets: CalibrationOffsets = { pitch: 0, roll: 0, yaw: 0 };
  private rawAngles: Angles = { pitch: 0, roll: 0, yaw: 0 };
  private subscribers: Set<AngleSubscriber> = new Set();
  private isListening: boolean = false;

  constructor() {
    this.handleDeviceOrientation = this.handleDeviceOrientation.bind(this);
    this.handleDeviceMotion = this.handleDeviceMotion.bind(this);
  }

  getAngles(): Angles {
    return { ...this.angles };
  }

  getCalibrationOffsets(): CalibrationOffsets {
    return { ...this.calibrationOffsets };
  }

  setCalibrationOffsets(offsets: CalibrationOffsets): void {
    this.calibrationOffsets = { ...offsets };
    this.updateAngles();
  }

  calibrate(): void {
    this.calibrationOffsets = { ...this.rawAngles };
    this.updateAngles();
  }

  areSensorsAvailable(): boolean {
    return typeof window.DeviceOrientationEvent !== 'undefined';
  }

  startListening(): void {
    if (this.isListening) return;
    
    window.addEventListener('deviceorientation', this.handleDeviceOrientation);
    window.addEventListener('devicemotion', this.handleDeviceMotion);
    this.isListening = true;
  }

  stopListening(): void {
    if (!this.isListening) return;
    
    window.removeEventListener('deviceorientation', this.handleDeviceOrientation);
    window.removeEventListener('devicemotion', this.handleDeviceMotion);
    this.isListening = false;
  }

  subscribe(callback: AngleSubscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private handleDeviceOrientation(event: DeviceOrientationEvent): void {
    if (event.beta !== null && event.gamma !== null && event.alpha !== null) {
      this.rawAngles = {
        pitch: event.beta,
        roll: event.gamma,
        yaw: event.alpha
      };
      this.updateAngles();
    }
  }

  private handleDeviceMotion(event: DeviceMotionEvent): void {
    // Additional processing from accelerometer if needed
  }

  private updateAngles(): void {
    this.angles = {
      pitch: this.normalizeAngle(this.rawAngles.pitch - this.calibrationOffsets.pitch),
      roll: this.normalizeAngle(this.rawAngles.roll - this.calibrationOffsets.roll),
      yaw: this.normalizeAngle(this.rawAngles.yaw - this.calibrationOffsets.yaw)
    };
    
    this.notifySubscribers();
  }

  private normalizeAngle(angle: number): number {
    // Normalize angle to be between -180 and 180
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.getAngles()));
  }
}