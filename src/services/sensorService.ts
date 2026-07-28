import { Capacitor } from '@capacitor/core';
import { Compass } from './nativeCompass';
import type { PluginListenerHandle } from '@capacitor/core';

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
  inclination: number;  // Angle from vertical (0-90°, 0° = horizontal leaf)
  azimuth: number; // Compass direction (0-360°, 0° = North)
}

export interface CalibrationOffsets {
  pitch: number;
  roll: number;
  yaw: number;
}

// Compass heading of the top of the device, degrees clockwise from north.
// source tells you whether the azimuth is referenced to the world, best first:
//   'native'   - CoreLocation CLHeading via the Compass plugin. Preferred:
//                declination-corrected true north, with a real accuracy figure.
//   'compass'  - iOS webkitCompassHeading, referenced to true north
//   'absolute' - deviceorientationabsolute (Android), referenced to north
//   'manual'   - no compass available, so the operator pointed the top of the
//                device due north and we pinned alpha's offset to that. Only
//                as good as the aim, and it decays as alpha drifts.
//   'relative' - plain deviceorientation alpha, whose zero point is fixed
//                arbitrarily when the sensor starts and is free to drift.
//                Azimuth built on this is NOT comparable between sessions.
export interface Heading {
  degrees: number;
  accuracy: number | null;   // +/- degrees, null when unknown
  source: 'native' | 'compass' | 'absolute' | 'manual' | 'relative';
  // false when only a magnetic bearing was available (no declination
  // correction); null when the source does not distinguish.
  trueNorth: boolean | null;
  // seconds since the manual calibration, so drift is auditable. null unless
  // source is 'manual'.
  calibrationAgeSec: number | null;
}

type AngleSubscriber = (angles: Angles) => void;
type PositionSubscriber = (position: Position) => void;

export class SensorService {
  private angles: Angles = { pitch: 0, roll: 0, yaw: 0 };
  private position: Position = { x: 0, y: 0, z: 0 };
  private calibrationOffsets: CalibrationOffsets = { pitch: 0, roll: 0, yaw: 0 };
  private rawAngles: Angles = { pitch: 0, roll: 0, yaw: 0 };
  private heading: Heading = { degrees: 0, accuracy: null, source: 'relative', trueNorth: null, calibrationAgeSec: null };
  // alpha reading captured while the top of the device pointed due north.
  // Deliberately NOT persisted: alpha's origin is reassigned every time the
  // sensor starts, so a stored offset would be silently wrong on next launch.
  private manualNorthAlpha: number | null = null;
  private manualNorthAt: number = 0;
  private nativeHeadingListener: PluginListenerHandle | null = null;
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
    this.handleAbsoluteOrientation = this.handleAbsoluteOrientation.bind(this);
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

  getHeading(): Heading {
    return { ...this.heading };
  }

  private static rank(source: Heading['source']): number {
    switch (source) {
      case 'native':   return 4;
      case 'compass':  return 3;
      case 'absolute': return 2;
      case 'manual':   return 1;
      default:         return 0;
    }
  }

  // Accept an update only from a source at least as good as the current one, so
  // e.g. a webkitCompassHeading cannot overwrite a CoreLocation fix.
  private offerHeading(next: Heading): void {
    if (SensorService.rank(next.source) < SensorService.rank(this.heading.source)) return;
    this.heading = next;
  }

  private async startNativeCompass(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { available } = await Compass.isAvailable();
      if (!available) return;

      this.nativeHeadingListener = await Compass.addListener('heading', (event) => {
        // CoreLocation reports a negative accuracy while the reading is
        // untrustworthy (magnetometer needs the figure-8 calibration wave)
        if (event.accuracy < 0) return;
        this.offerHeading({
          degrees: event.degrees,
          accuracy: event.accuracy,
          source: 'native',
          trueNorth: event.trueNorth,
          calibrationAgeSec: null
        });
        this.notifySubscribers();
      });

      await Compass.start();
    } catch (error) {
      // no native implementation on this platform -- the web path still applies
      console.warn('Native compass unavailable, falling back to web sensors:', error);
    }
  }

  private async stopNativeCompass(): Promise<void> {
    try {
      if (this.nativeHeadingListener) {
        await this.nativeHeadingListener.remove();
        this.nativeHeadingListener = null;
      }
      if (Capacitor.isNativePlatform()) await Compass.stop();
    } catch {
      // nothing listening; nothing to unwind
    }
  }

  // Operator points the top of the device due north and calls this. alpha and
  // true heading run in opposite directions but differ by a constant, so one
  // sighting pins the offset: at north, heading 0 corresponds to the alpha
  // read right now.
  calibrateNorth(): boolean {
    if (SensorService.rank(this.heading.source) > SensorService.rank('manual')) {
      // a real compass fix is already better than a hand sighting
      return false;
    }
    this.manualNorthAlpha = this.rawAngles.yaw;
    this.manualNorthAt = Date.now();
    this.applyManualHeading();
    this.notifySubscribers();
    return true;
  }

  clearNorthCalibration(): void {
    this.manualNorthAlpha = null;
    this.manualNorthAt = 0;
    this.heading = { degrees: 0, accuracy: null, source: 'relative', trueNorth: null, calibrationAgeSec: null };
    this.notifySubscribers();
  }

  hasNorthReference(): boolean {
    return this.heading.source !== 'relative';
  }

  private applyManualHeading(): void {
    if (this.manualNorthAlpha === null) return;
    const delta = this.rawAngles.yaw - this.manualNorthAlpha;
    this.heading = {
      degrees: ((360 - delta) % 360 + 360) % 360,
      accuracy: null,
      source: 'manual',
      // only as good as the operator's sighting of north
      trueNorth: true,
      calibrationAgeSec: Math.round((Date.now() - this.manualNorthAt) / 1000)
    };
  }

  // Pitch and roll come from beta/gamma, which are derived from the gravity
  // vector and are therefore already absolute: the world z-axis in device
  // coordinates depends only on those two, not on alpha. Yaw is the sole
  // relative channel, so substituting a compass heading for it makes the whole
  // attitude absolute. A heading H (clockwise from north) corresponds to
  // alpha = 360 - H, since alpha runs counter-clockwise.
  getAbsoluteAngles(): Angles {
    return { ...this.angles, yaw: this.effectiveYaw() };
  }

  private effectiveYaw(): number {
    if (this.heading.source === 'relative') return this.angles.yaw;
    return this.normalizeAngle(360 - this.heading.degrees);
  }

  // Calculate surface normal vector from Euler angles
  calculateSurfaceNormal(angles: Angles): SurfaceNormal {
    // Convert degrees to radians
    const pitchRad = (angles.pitch * Math.PI) / 180;
    const rollRad = (angles.roll * Math.PI) / 180;
    const yawRad = (angles.yaw * Math.PI) / 180;

    // DeviceOrientationEvent angles are intrinsic Z-X'-Y'' rotations
    // (alpha about z, then beta about x', then gamma about y''), so the
    // rotation is R = Rz(alpha) * Rx(beta) * Ry(gamma). This is NOT the
    // aerospace ZYX yaw-pitch-roll order: using ZYX here swaps the roles of
    // beta and gamma in the horizontal components and rotates the reported
    // azimuth off the true tilt direction (z is unaffected, which is why the
    // inclination angle was still correct).
    const cp = Math.cos(pitchRad);   // beta
    const sp = Math.sin(pitchRad);
    const cr = Math.cos(rollRad);    // gamma
    const sr = Math.sin(rollRad);
    const cy = Math.cos(yawRad);     // alpha
    const sy = Math.sin(yawRad);

    // The normal vector is the Z-axis of the rotated coordinate system
    // For a leaf lying flat (pitch=0, roll=0), normal points up (0,0,1)
    const normal: SurfaceNormal = {
      x: sr * cy + sp * cr * sy,
      y: sr * sy - sp * cr * cy,
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

  // Calculate leaf inclination and azimuth from surface normal
  calculateLeafOrientation(normal: SurfaceNormal): LeafOrientation {
    // Inclination angle: angle from vertical (z-axis)
    // For leaves: 0° = horizontal (normal pointing up), 90° = vertical
    const inclination = Math.acos(Math.abs(normal.z)) * (180 / Math.PI);

    // Azimuth angle: compass direction of the normal projection on XY plane
    // 0° = North (+Y), 90° = East (+X), 180° = South (-Y), 270° = West (-X)
    let azimuth = Math.atan2(normal.x, normal.y) * (180 / Math.PI);
    
    // Convert to 0-360° range
    if (azimuth < 0) {
      azimuth += 360;
    }

    return {
      inclination: Math.round(inclination * 100) / 100,  // Round to 2 decimal places
      azimuth: Math.round(azimuth * 100) / 100
    };
  }

  // Combined method to get all orientation data
  getOrientationData(): {
    angles: Angles;
    rawAngles: Angles;
    normal: SurfaceNormal;
    orientation: LeafOrientation;
    heading: Heading;
  } {
    // Inclination needs only pitch/roll and is gravity-referenced either way; the
    // azimuth is what depends on yaw, so the normal is built from the absolute
    // angles rather than the raw alpha.
    const angles = this.getAbsoluteAngles();
    const normal = this.calculateSurfaceNormal(angles);
    const orientation = this.calculateLeafOrientation(normal);

    return {
      angles,
      rawAngles: this.getAngles(),
      normal,
      orientation,
      heading: this.getHeading()
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
        
        if (orientationPermission !== 'granted') {
          console.error('Orientation permission denied');
          throw new Error('Orientation permission denied');
        }
        
        // Also request motion permission if available
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
          const motionPermission = await (DeviceMotionEvent as any).requestPermission();
          if (motionPermission !== 'granted') {
            console.error('Motion permission denied');
            throw new Error('Motion permission denied');
          }
        }
      }
      
      // Request GPS permission separately (don't block on this)
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          () => console.log('GPS permission granted'),
          (error) => console.error('GPS permission denied:', error),
          { timeout: 5000 }
        );
      }
      
      this.permissionsGranted = true;
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      throw error; // Re-throw to handle in UI
    }
  }

  async startListening(): Promise<void> {
    if (this.isListening) return;
    
    // Request permissions if not already granted
    if (!this.permissionsGranted) {
      await this.requestPermissions(); // Will throw if denied
    }
    
    // Prefer CoreLocation's true-north heading; the web listeners below stay
    // active regardless, since beta/gamma come from them either way.
    await this.startNativeCompass();

    // Start device orientation and motion listeners
    window.addEventListener('deviceorientation', this.handleDeviceOrientation);
    window.addEventListener('deviceorientationabsolute' as any, this.handleAbsoluteOrientation);
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
    window.removeEventListener('deviceorientationabsolute' as any, this.handleAbsoluteOrientation);
    window.removeEventListener('devicemotion', this.handleDeviceMotion);
    
    // Stop GPS tracking
    if (this.watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    void this.stopNativeCompass();

    this.isListening = false;
    // alpha's origin dies with the session, so the offset must not survive it
    this.manualNorthAlpha = null;
    this.manualNorthAt = 0;
    this.heading = { degrees: 0, accuracy: null, source: 'relative', trueNorth: null, calibrationAgeSec: null };
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
    // iOS puts a true-north compass heading on this same event. It only appears
    // once orientation permission is granted and Location Services are on;
    // without it the azimuth falls back to the arbitrary alpha reference.
    const compass = (event as any).webkitCompassHeading;
    if (typeof compass === 'number' && !Number.isNaN(compass)) {
      const acc = (event as any).webkitCompassAccuracy;
      this.offerHeading({
        degrees: compass,
        // iOS reports a negative accuracy when the compass is uncalibrated
        accuracy: typeof acc === 'number' && acc >= 0 ? acc : null,
        source: 'compass',
        trueNorth: true,
        calibrationAgeSec: null
      });
    }

    if (event.beta !== null && event.gamma !== null && event.alpha !== null) {
      this.rawAngles = {
        pitch: event.beta,
        roll: event.gamma,
        yaw: event.alpha
      };
      // a real compass fix always wins over a hand sighting
      if (SensorService.rank(this.heading.source) <= SensorService.rank('manual')) {
        this.applyManualHeading();
      }
      this.updateAngles();
    }
  }

  // Android path: deviceorientationabsolute is referenced to north, so its alpha
  // is usable directly. Ignored once iOS has supplied a compass heading.
  private handleAbsoluteOrientation(rawEvent: Event): void {
    const event = rawEvent as DeviceOrientationEvent;
    if (this.heading.source === 'compass') return;
    if (event.alpha === null || !event.absolute) return;
    this.offerHeading({
      degrees: ((360 - event.alpha) % 360 + 360) % 360,
      accuracy: null,
      source: 'absolute',
      trueNorth: true,
      calibrationAgeSec: null
    });
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