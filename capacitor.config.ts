import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.leafangler.app',
  appName: 'LeafAngler',
  webDir: 'build',
  ios: {
    contentInset: 'never'
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
