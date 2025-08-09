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
  },
  plugins: {
    Filesystem: {
      requestPermissions: true
    },
    Share: {}
  }
};

export default config;
