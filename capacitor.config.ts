import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.3892ddd392834e549200e592874d1d3b',
  appName: 'trinity-life-optimizer',
  webDir: 'dist',
  server: {
    url: 'https://3892ddd3-9283-4e54-9200-e592874d1d3b.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    },
    Health: {
      read: ['heartRate', 'steps', 'activeEnergyBurned', 'basalEnergyBurned'],
      write: []
    }
  }
};

export default config;