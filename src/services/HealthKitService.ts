/**
 * HealthKit Service for iOS/Android Health Data Integration
 * 
 * This service provides a unified interface for accessing health data from:
 * - Apple HealthKit (iOS) - requires native iOS app
 * - Google Fit (Android) - requires native Android app  
 * - Web Bluetooth (limited browser support)
 * 
 * BACKEND READY ✅:
 * - heart_rate_data table in Supabase
 * - heart-data edge function deployed
 * - RLS policies configured
 * 
 * CURRENT STATUS:
 * - Service interface ready
 * - Web fallback works (manual input + Bluetooth LE)
 * - Native integration requires platform-specific plugins
 */

import { Capacitor } from '@capacitor/core';

// Health plugin interface - will be populated when native plugins are added
let Health: any = null;

// Try to load native health plugin if available (for future native builds)
if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
  try {
    // When native plugins are installed, they'll be available here
    // For now, this gracefully handles the missing plugin
  } catch (e) {
    console.log('Native health plugin not yet configured');
  }
}

export interface HealthData {
  value: number;
  startDate: string;
  endDate: string;
  sourceName: string;
  sourceId: string;
}

export interface HeartRateReading {
  bpm: number;
  timestamp: string;
  activity_type: 'resting' | 'walking' | 'running' | 'cycling' | 'swimming' | 'sleeping' | 'general' | 'workout';
  confidence: number;
  source_device: string;
}

class HealthKitService {
  private isAvailable: boolean = false;
  private isAuthorized: boolean = false;
  private platform: 'ios' | 'android' | 'web' = 'web';

  constructor() {
    this.platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
    this.checkAvailability();
  }

  /**
   * Check if HealthKit/Google Fit is available on this device
   */
  async checkAvailability(): Promise<boolean> {
    try {
      if (this.platform === 'web') {
        // Web platform - check for Bluetooth LE support
        this.isAvailable = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
        return this.isAvailable;
      }

      // Native platforms - would check for Health plugin
      if (!Health) {
        this.isAvailable = false;
        return false;
      }

      const available = await Health.isAvailable();
      this.isAvailable = available;
      return available;
    } catch (error) {
      console.warn('HealthKit not available:', error);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Request permissions for heart rate data
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (this.platform === 'web') {
        // Web: Request Bluetooth permissions
        if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
          // Bluetooth permissions are requested when connecting
          this.isAuthorized = true;
          return true;
        }
        return false;
      }

      if (!Health) {
        throw new Error('Native health plugin not installed. Build native app to enable HealthKit/Google Fit.');
      }

      if (!this.isAvailable) {
        await this.checkAvailability();
        if (!this.isAvailable) {
          throw new Error('HealthKit/Google Fit is not available on this device');
        }
      }

      const permissions = await Health.requestAuthorization({
        read: ['heartRate', 'steps', 'activeEnergyBurned', 'basalEnergyBurned'],
        write: []
      });

      this.isAuthorized = permissions;
      return permissions;
    } catch (error) {
      console.error('Error requesting HealthKit permissions:', error);
      this.isAuthorized = false;
      return false;
    }
  }

  /**
   * Check if we have authorization to read heart rate data
   */
  async checkAuthorization(): Promise<boolean> {
    try {
      if (this.platform === 'web') {
        return this.isAuthorized;
      }

      if (!Health) {
        return false;
      }

      const authorized = await Health.isAuthorized({
        read: ['heartRate']
      });

      this.isAuthorized = authorized;
      return authorized;
    } catch (error) {
      console.error('Error checking authorization:', error);
      return false;
    }
  }

  /**
   * Get current heart rate reading
   */
  async getCurrentHeartRate(): Promise<HeartRateReading | null> {
    try {
      if (this.platform === 'web') {
        // Web: Would use Bluetooth LE (handled in HeartTracker component)
        return null;
      }

      if (!this.isAuthorized) {
        const authorized = await this.checkAuthorization();
        if (!authorized) {
          throw new Error('Not authorized to read heart rate data');
        }
      }

      if (!Health) {
        return null;
      }

      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);

      const data = await Health.query({
        dataType: 'heartRate',
        startDate: oneMinuteAgo.toISOString(),
        endDate: now.toISOString(),
        limit: 1
      });

      if (!data || data.length === 0) {
        return null;
      }

      const reading = data[0] as HealthData;
      return {
        bpm: Math.round(reading.value),
        timestamp: reading.startDate,
        activity_type: 'general',
        confidence: 95,
        source_device: this.platform === 'ios' ? 'apple_watch' : 'google_fit'
      };
    } catch (error) {
      console.error('Error getting current heart rate:', error);
      return null;
    }
  }

  /**
   * Get heart rate data for a time range
   */
  async getHeartRateData(
    startDate: Date,
    endDate: Date,
    activityType?: 'resting' | 'walking' | 'running' | 'cycling' | 'swimming' | 'sleeping' | 'general' | 'workout'
  ): Promise<HeartRateReading[]> {
    try {
      if (this.platform === 'web') {
        return [];
      }

      if (!this.isAuthorized) {
        const authorized = await this.checkAuthorization();
        if (!authorized) {
          throw new Error('Not authorized to read heart rate data');
        }
      }

      if (!Health) {
        return [];
      }

      const data = await Health.query({
        dataType: 'heartRate',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 1000
      });

      if (!data || data.length === 0) {
        return [];
      }

      return (data as HealthData[]).map(reading => ({
        bpm: Math.round(reading.value),
        timestamp: reading.startDate,
        activity_type: activityType || this.inferActivityType(reading),
        confidence: 95,
        source_device: this.platform === 'ios' ? 'apple_watch' : 'google_fit'
      }));
    } catch (error) {
      console.error('Error getting heart rate data:', error);
      return [];
    }
  }

  /**
   * Get today's heart rate statistics
   */
  async getTodayStats(): Promise<{
    current: number | null;
    average: number | null;
    max: number | null;
    min: number | null;
    resting: number | null;
  }> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const data = await this.getHeartRateData(startOfDay, now);

      if (data.length === 0) {
        return {
          current: null,
          average: null,
          max: null,
          min: null,
          resting: null
        };
      }

      const bpmValues = data.map(d => d.bpm);
      const restingData = data.filter(d => d.activity_type === 'resting');

      return {
        current: data[data.length - 1]?.bpm || null,
        average: Math.round(bpmValues.reduce((sum, bpm) => sum + bpm, 0) / bpmValues.length),
        max: Math.max(...bpmValues),
        min: Math.min(...bpmValues),
        resting: restingData.length > 0
          ? Math.round(restingData.reduce((sum, d) => sum + d.bpm, 0) / restingData.length)
          : null
      };
    } catch (error) {
      console.error('Error getting today stats:', error);
      return {
        current: null,
        average: null,
        max: null,
        min: null,
        resting: null
      };
    }
  }

  /**
   * Start monitoring heart rate in real-time
   */
  async startMonitoring(
    callback: (reading: HeartRateReading) => void
  ): Promise<() => void> {
    try {
      if (this.platform === 'web') {
        // Web: Would use Bluetooth LE (handled in HeartTracker)
        return () => {};
      }

      if (!this.isAuthorized) {
        const authorized = await this.checkAuthorization();
        if (!authorized) {
          throw new Error('Not authorized to read heart rate data');
        }
      }

      if (!Health) {
        return () => {};
      }

      // Poll for new heart rate data every 5 seconds
      const interval = setInterval(async () => {
        const reading = await this.getCurrentHeartRate();
        if (reading) {
          callback(reading);
        }
      }, 5000);

      // Return cleanup function
      return () => {
        clearInterval(interval);
      };
    } catch (error) {
      console.error('Error starting monitoring:', error);
      return () => {}; // Return no-op cleanup function
    }
  }

  /**
   * Infer activity type from heart rate reading
   */
  private inferActivityType(reading: HealthData): 'resting' | 'walking' | 'running' | 'cycling' | 'swimming' | 'sleeping' | 'general' | 'workout' {
    const bpm = reading.value;
    
    if (bpm < 60) return 'resting';
    if (bpm < 100) return 'resting';
    if (bpm < 120) return 'walking';
    if (bpm < 150) return 'running';
    if (bpm < 170) return 'cycling';
    return 'workout';
  }

  /**
   * Get platform name
   */
  getPlatform(): string {
    return this.platform === 'ios' ? 'Apple HealthKit' : this.platform === 'android' ? 'Google Fit' : 'Web Browser';
  }

  /**
   * Check if service is available
   */
  getIsAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Check if service is authorized
   */
  getIsAuthorized(): boolean {
    return this.isAuthorized;
  }
}

// Export singleton instance
export const healthKitService = new HealthKitService();
