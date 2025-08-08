export interface Angles {
  pitch: number; // X-axis rotation (beta)
  roll: number;  // Y-axis rotation (gamma)
  yaw: number;   // Z-axis rotation (alpha)
}

export interface Position {
  x: number; // X position in meters (estimated)
  y: number; // Y position in meters (estimated)
  z: number; // Z position in meters (estimated)
}

export interface CalibrationOffsets {
  pitch: number;
  roll: number;
  yaw: number;
}

type AngleSubscriber = (angles: Angles) => void;
type PositionSubscriber = (position: Position) => void;

export class SensorService {
  private angles: Angles = { pitch: 0, roll: 0, yaw: 0 };
  private position: Position = { x: 0, y: 0, z: 0 };
  private calibrationOffsets: CalibrationOffsets = { pitch: 0, roll: 0, yaw: 0 };
  private rawAngles: Angles = { pitch: 0, roll: 0, yaw: 0 };
  private subscribers: Set<AngleSubscriber> = new Set();
  private positionSubscribers: Set<PositionSubscriber> = new Set();
  private isListening: boolean = false;
  
  // Position tracking variables
  private velocity: Position = { x: 0, y: 0, z: 0 };
  private lastAcceleration: Position = { x: 0, y: 0, z: 0 };
  private lastTimestamp: number = 0;

  constructor() {
    this.handleDeviceOrientation = this.handleDeviceOrientation.bind(this);
    this.handleDeviceMotion = this.handleDeviceMotion.bind(this);
  }

  getAngles(): Angles {
    return { ...this.angles };
  }

  getPosition(): Position {
    return { ...this.position };
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
    // Reset position to origin on calibration
    this.position = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.lastAcceleration = { x: 0, y: 0, z: 0 };
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

  subscribePosition(callback: PositionSubscriber): () => void {
    this.positionSubscribers.add(callback);
    return () => {
      this.positionSubscribers.delete(callback);
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
    if (event.acceleration && event.acceleration.x !== null && 
        event.acceleration.y !== null && event.acceleration.z !== null) {
      
      const currentTime = Date.now();
      const dt = this.lastTimestamp ? (currentTime - this.lastTimestamp) / 1000 : 0;
      
      if (dt > 0 && dt < 1) { // Only process if reasonable time interval
        // Get acceleration in m/s²
        const ax = event.acceleration.x;
        const ay = event.acceleration.y;
        const az = event.acceleration.z;
        
        // Apply simple high-pass filter to remove gravity and low-frequency noise
        const alpha = 0.8;
        const filteredAx = alpha * (ax - this.lastAcceleration.x);
        const filteredAy = alpha * (ay - this.lastAcceleration.y);
        const filteredAz = alpha * (az - this.lastAcceleration.z);
        
        // Update velocity (integrate acceleration)
        this.velocity.x += filteredAx * dt;
        this.velocity.y += filteredAy * dt;
        this.velocity.z += filteredAz * dt;
        
        // Apply velocity damping to prevent drift
        const damping = 0.98;
        this.velocity.x *= damping;
        this.velocity.y *= damping;
        this.velocity.z *= damping;
        
        // Update position (integrate velocity)
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;
        
        this.lastAcceleration = { x: ax, y: ay, z: az };
        
        this.notifyPositionSubscribers();
      }
      
      this.lastTimestamp = currentTime;
    }
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

  private notifyPositionSubscribers(): void {
    this.positionSubscribers.forEach(callback => callback(this.getPosition()));
  }
}