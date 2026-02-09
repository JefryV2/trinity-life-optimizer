/**
 * Step Counter Service
 * Uses device motion sensors (accelerometer) and geolocation to count steps
 * Works on both web browsers and native mobile apps
 */

import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

interface StepData {
  steps: number;
  distance: number; // in meters
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
}

class StepCounterService {
  private isRunning: boolean = false;
  private stepCount: number = 0;
  private startSteps: number = 0;
  private startTime: Date | null = null;
  private lastAcceleration: { x: number; y: number; z: number } | null = null;
  private accelerationBuffer: Array<{ x: number; y: number; z: number; timestamp: number }> = [];
  private watchId: number | null = null;
  private geolocationWatchId: number | null = null;
  private lastLocation: { latitude: number; longitude: number } | null = null;
  private totalDistance: number = 0; // in meters
  private onStepUpdateCallback: ((steps: number, distance: number) => void) | null = null;
  private autoStartAttempted: boolean = false;

  /**
   * Check if step counting is available on this device
   */
  async checkAvailability(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      // Native platforms - check for motion sensors
      return true;
    }

    // Web: Check for DeviceMotion API
    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      return true;
    }

    return false;
  }

  /**
   * Request permissions for motion and location data
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Request device motion permission (iOS 13+)
      if (typeof DeviceMotionEvent !== 'undefined' && (DeviceMotionEvent as any).requestPermission) {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== 'granted') {
          console.warn('Device motion permission denied');
          return false;
        }
      }

      // Request geolocation permission
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
          { timeout: 5000 }
        );
      });
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Auto-start counting when app loads (called once)
   */
  async autoStart(): Promise<void> {
    if (this.autoStartAttempted || this.isRunning) {
      return;
    }

    this.autoStartAttempted = true;
    
    // Wait a bit for auth to be ready
    setTimeout(async () => {
      try {
        await this.startCounting();
      } catch (error) {
        console.log('Auto-start step counter failed (will retry when user is authenticated):', error);
        this.autoStartAttempted = false; // Allow retry
      }
    }, 2000);
  }

  /**
   * Start counting steps
   */
  async startCounting(
    onUpdate?: (steps: number, distance: number) => void
  ): Promise<boolean> {
    if (this.isRunning) {
      if (onUpdate) {
        this.onStepUpdateCallback = onUpdate;
        // Immediately call with current values
        onUpdate(this.stepCount, this.totalDistance);
      }
      return true;
    }

    const available = await this.checkAvailability();
    if (!available) {
      console.warn('Step counting not available on this device');
      return false;
    }

    // Request permissions
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn('Permissions not granted for step counting');
      return false;
    }

    this.isRunning = true;
    this.startTime = new Date();
    this.onStepUpdateCallback = onUpdate || null;

    // Load today's existing steps from database
    await this.loadTodaySteps();

    // Start motion tracking
    this.startMotionTracking();

    // Start geolocation tracking
    this.startGeolocationTracking();

    return true;
  }

  /**
   * Stop counting steps
   */
  async stopCounting(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop motion tracking
    if (this.watchId !== null && typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.handleMotion as EventListener);
      this.watchId = null;
    }

    // Stop geolocation tracking
    if (this.geolocationWatchId !== null) {
      navigator.geolocation.clearWatch(this.geolocationWatchId);
      this.geolocationWatchId = null;
    }

    // Save steps to database
    await this.saveSteps();
  }

  /**
   * Get current step count
   */
  getCurrentSteps(): number {
    return this.stepCount;
  }

  /**
   * Get current distance (in meters)
   */
  getCurrentDistance(): number {
    return this.totalDistance;
  }

  /**
   * Load today's steps from database
   */
  private async loadTodaySteps(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('step_records')
        .select('steps')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading steps:', error);
        return;
      }

      if (data) {
        this.startSteps = data.steps || 0;
        this.stepCount = this.startSteps;
      } else {
        this.startSteps = 0;
        this.stepCount = 0;
      }
    } catch (error) {
      console.error('Error loading today steps:', error);
    }
  }

  /**
   * Save steps to database
   */
  private async saveSteps(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('step_records')
        .upsert({
          user_id: user.id,
          date: today,
          steps: this.stepCount,
        }, {
          onConflict: 'user_id,date'
        });

      if (error) {
        console.error('Error saving steps:', error);
      }
    } catch (error) {
      console.error('Error saving steps:', error);
    }
  }

  /**
   * Start tracking device motion
   */
  private startMotionTracking(): void {
    if (typeof window === 'undefined') return;

    // Add event listener for device motion
    window.addEventListener('devicemotion', this.handleMotion as EventListener, true);
  }

  /**
   * Handle device motion events to detect steps
   */
  private handleMotion = (event: DeviceMotionEvent): void => {
    if (!this.isRunning || !event.accelerationIncludingGravity) return;

    const accel = event.accelerationIncludingGravity;
    if (!accel.x || !accel.y || !accel.z) return;

    const now = Date.now();
    const acceleration = {
      x: accel.x,
      y: accel.y,
      z: accel.z,
      timestamp: now
    };

    // Add to buffer (keep last 10 readings)
    this.accelerationBuffer.push(acceleration);
    if (this.accelerationBuffer.length > 10) {
      this.accelerationBuffer.shift();
    }

    // Calculate magnitude of acceleration
    const magnitude = Math.sqrt(
      acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2
    );

    // Detect step: significant change in acceleration magnitude
    if (this.lastAcceleration) {
      const lastMagnitude = Math.sqrt(
        this.lastAcceleration.x ** 2 +
        this.lastAcceleration.y ** 2 +
        this.lastAcceleration.z ** 2
      );

      const delta = Math.abs(magnitude - lastMagnitude);

      // Step detection threshold (adjust based on testing)
      // Typical step creates acceleration change of 2-5 m/s²
      if (delta > 2.5 && delta < 8) {
        // Check if enough time has passed since last step (prevent double counting)
        const timeSinceLastStep = this.accelerationBuffer.length > 1
          ? now - this.accelerationBuffer[this.accelerationBuffer.length - 2].timestamp
          : 0;

        // Minimum time between steps: ~400ms (max ~150 steps/min)
        if (timeSinceLastStep > 400) {
          this.stepCount++;
          this.onStepUpdateCallback?.(this.stepCount, this.totalDistance);
          
          // Auto-save every 10 steps
          if (this.stepCount % 10 === 0) {
            this.saveSteps();
          }
        }
      }
    }

    this.lastAcceleration = { x: acceleration.x, y: acceleration.y, z: acceleration.z };
  };

  /**
   * Start tracking geolocation for distance calculation
   */
  private startGeolocationTracking(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 1000
    };

    this.geolocationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!this.isRunning) return;

        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        if (this.lastLocation) {
          // Calculate distance between last and current location
          const distance = this.calculateDistance(
            this.lastLocation.latitude,
            this.lastLocation.longitude,
            newLocation.latitude,
            newLocation.longitude
          );

          this.totalDistance += distance;
          this.onStepUpdateCallback?.(this.stepCount, this.totalDistance);
        }

        this.lastLocation = newLocation;
      },
      (error) => {
        console.warn('Geolocation error:', error);
      },
      options
    );
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Reset step counter for today
   */
  async reset(): Promise<void> {
    this.stepCount = 0;
    this.startSteps = 0;
    this.totalDistance = 0;
    await this.saveSteps();
    this.onStepUpdateCallback?.(this.stepCount, this.totalDistance);
  }

  /**
   * Check if counting is active
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const stepCounterService = new StepCounterService();

// Auto-start step counter when module loads (if available)
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      stepCounterService.autoStart();
    });
  } else {
    // DOM already ready
    setTimeout(() => {
      stepCounterService.autoStart();
    }, 1000);
  }
}

