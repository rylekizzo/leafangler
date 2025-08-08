export interface Angles {
  pitch: number; // X-axis rotation (beta)
  roll: number;  // Y-axis rotation (gamma)
  yaw: number;   // Z-axis rotation (alpha)
}

export interface Position {
  x: number; // X displacement in meters (estimated from accelerometer, prone to drift)
  y: number; // Y displacement in meters (estimated from accelerometer, prone to drift)
  z: number; // Z displacement in meters (estimated from accelerometer, prone to drift)
  // Note: These are relative position changes from device movement, not GPS coordinates
  // They accumulate error over time due to sensor drift and should not be relied upon for accuracy
}

export interface SurfaceNormal {
  x: number; // X component of normal vector
  y: number; // Y component of normal vector
  z: number; // Z component of normal vector
}

export interface LeafOrientation {
  zenith: number;  // Angle from vertical (0-90°, 0° = horizontal leaf)
  azimuth: number; // Compass direction (0-360°, 0° = North)
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
  private permissionsGranted: boolean = false;
  
  // Position tracking variables
  private velocity: Position = { x: 0, y: 0, z: 0 };
  private lastAcceleration: Position = { x: 0, y: 0, z: 0 };
  private lastTimestamp: number = 0;
  
  // GPS coordinates
  private gpsCoordinates: { latitude: number; longitude: number; altitude: number | null } | null = null;
  private watchId: number | null = null;

  constructor() {
    this.handleDeviceOrientation = this.handleDeviceOrientation.bind(this);
    this.handleDeviceMotion = this.handleDeviceMotion.bind(this);
    this.handleGeolocation = this.handleGeolocation.bind(this);
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

  // Calculate surface normal vector from Euler angles
  calculateSurfaceNormal(angles: Angles): SurfaceNormal {
    // Convert degrees to radians
    const pitchRad = (angles.pitch * Math.PI) / 180;
    const rollRad = (angles.roll * Math.PI) / 180;
    const yawRad = (angles.yaw * Math.PI) / 180;

    // Calculate rotation matrix components
    // Using ZYX Euler angle convention (yaw-pitch-roll)
    const cp = Math.cos(pitchRad);
    const sp = Math.sin(pitchRad);
    const cr = Math.cos(rollRad);
    const sr = Math.sin(rollRad);
    const cy = Math.cos(yawRad);
    const sy = Math.sin(yawRad);

    // The normal vector is the Z-axis of the rotated coordinate system
    // For a leaf lying flat (pitch=0, roll=0), normal points up (0,0,1)
    const normal: SurfaceNormal = {
      x: sp * cy + cp * sr * sy,
      y: sp * sy - cp * sr * cy,
      z: cp * cr
    };

    // Normalize the vector
    const magnitude = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
    if (magnitude > 0) {
      normal.x /= magnitude;
      normal.y /= magnitude;
      normal.z /= magnitude;
    }

    return normal;
  }

  // Calculate leaf zenith and azimuth from surface normal
  calculateLeafOrientation(normal: SurfaceNormal): LeafOrientation {
    // Zenith angle: angle from vertical (z-axis)
    // For leaves: 0° = horizontal (normal pointing up), 90° = vertical
    const zenith = Math.acos(Math.abs(normal.z)) * (180 / Math.PI);

    // Azimuth angle: compass direction of the normal projection on XY plane
    // 0° = North (+Y), 90° = East (+X), 180° = South (-Y), 270° = West (-X)
    let azimuth = Math.atan2(normal.x, normal.y) * (180 / Math.PI);
    
    // Convert to 0-360° range
    if (azimuth < 0) {
      azimuth += 360;
    }

    return {
      zenith: Math.round(zenith * 100) / 100,  // Round to 2 decimal places
      azimuth: Math.round(azimuth * 100) / 100
    };
  }

  // Combined method to get all orientation data
  getOrientationData(): { angles: Angles; normal: SurfaceNormal; orientation: LeafOrientation } {
    const angles = this.getAngles();
    const normal = this.calculateSurfaceNormal(angles);
    const orientation = this.calculateLeafOrientation(normal);
    
    return {
      angles,
      normal,
      orientation
    };
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
    return typeof window.DeviceOrientationEvent !== 'undefined' && 
           typeof window.DeviceMotionEvent !== 'undefined';
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // Request device orientation permission for iOS 13+
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const orientationPermission = await (DeviceOrientationEvent as any).requestPermission();
        const motionPermission = await (DeviceMotionEvent as any).requestPermission();
        
        if (orientationPermission !== 'granted' || motionPermission !== 'granted') {
          console.error('Sensor permissions denied');
          return false;
        }
      }
      
      // Request GPS permission
      if ('geolocation' in navigator) {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(),
            (error) => {
              console.error('GPS permission denied:', error);
              resolve(); // Continue even if GPS fails
            },
            { timeout: 5000 }
          );
        });
      }
      
      this.permissionsGranted = true;
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  async startListening(): Promise<void> {
    if (this.isListening) return;
    
    // Request permissions if not already granted
    if (!this.permissionsGranted) {
      const granted = await this.requestPermissions();
      if (!granted && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        console.error('Cannot start listening without permissions');
        return;
      }
    }
    
    // Start device orientation and motion listeners
    window.addEventListener('deviceorientation', this.handleDeviceOrientation);
    window.addEventListener('devicemotion', this.handleDeviceMotion);
    
    // Start GPS tracking
    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        this.handleGeolocation,
        (error) => console.error('GPS error:', error),
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }
    
    this.isListening = true;
  }

  stopListening(): void {
    if (!this.isListening) return;
    
    window.removeEventListener('deviceorientation', this.handleDeviceOrientation);
    window.removeEventListener('devicemotion', this.handleDeviceMotion);
    
    // Stop GPS tracking
    if (this.watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    this.isListening = false;
  }
  
  getGPSCoordinates(): { latitude: number; longitude: number; altitude: number | null } | null {
    return this.gpsCoordinates;
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

  private handleGeolocation(position: GeolocationPosition): void {
    this.gpsCoordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude
    };
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