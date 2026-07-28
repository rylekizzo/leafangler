import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface NativeHeadingEvent {
  degrees: number;      // clockwise from north
  accuracy: number;     // +/- degrees; negative means the reading is unreliable
  trueNorth: boolean;   // false when only a magnetic bearing was available
}

export interface CompassPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  start(): Promise<void>;
  stop(): Promise<void>;
  addListener(
    eventName: 'heading',
    listener: (event: NativeHeadingEvent) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'headingError',
    listener: (event: { message: string }) => void
  ): Promise<PluginListenerHandle>;
}

// Backed by ios/App/LeafAngler/CompassPlugin.swift. On platforms with no
// native implementation the proxy rejects, which callers treat as "no native
// compass" and fall back to the web path.
export const Compass = registerPlugin<CompassPlugin>('Compass');
