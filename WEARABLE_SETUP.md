# Wearable Device Integration Setup Guide

This guide will help you set up Apple HealthKit and Google Fit integration for the Trinity Life Optimizer app.

## Prerequisites

- Node.js installed
- Xcode (for iOS) or Android Studio (for Android)
- Apple Developer Account (for iOS) or Google Play Console (for Android)

## Step 1: Backend Setup (Already Complete ✅)

Your Supabase backend is ready:
- ✅ `heart_rate_data` table created
- ✅ Edge function `heart-data` deployed
- ✅ RLS policies configured
- ✅ Service layer implemented

## Step 2: Native Plugin Setup

**Current Status**: The app has a service layer ready for HealthKit integration. For full native integration, you'll need to:

### Option A: Use Capacitor Community Plugins
```bash
# For iOS HealthKit
npm install @capacitor-community/apple-health
npx cap sync ios

# For Android Google Fit  
npm install @capacitor-community/google-fit
npx cap sync android
```

### Option B: Custom Native Implementation
Create native iOS/Android plugins that:
1. Request HealthKit/Google Fit permissions
2. Read heart rate data
3. Call the Supabase edge function to sync data

**The service interface (`HealthKitService.ts`) is ready** - you just need to wire up the native plugins.

## Step 2: iOS Setup (Apple HealthKit)

### 2.1 Add iOS Platform

```bash
npx cap add ios
npx cap sync
```

### 2.2 Configure HealthKit in Xcode

1. Open the iOS project:
   ```bash
   npx cap open ios
   ```

2. In Xcode:
   - Select your project in the navigator
   - Go to **Signing & Capabilities** tab
   - Click **+ Capability**
   - Add **HealthKit**
   - Enable the following data types:
     - Heart Rate (Read)
     - Steps (Read)
     - Active Energy Burned (Read)
     - Basal Energy Burned (Read)

3. Add HealthKit usage description to `Info.plist`:
   - Right-click `Info.plist` → Open As → Source Code
   - Add:
   ```xml
   <key>NSHealthShareUsageDescription</key>
   <string>Trinity Life Optimizer needs access to your health data to track your heart rate and provide personalized insights.</string>
   <key>NSHealthUpdateUsageDescription</key>
   <string>Trinity Life Optimizer needs permission to write health data.</string>
   ```

### 2.3 Build and Run

```bash
npx cap run ios
```

## Step 3: Android Setup (Google Fit)

### 3.1 Add Android Platform

```bash
npx cap add android
npx cap sync
```

### 3.2 Configure Google Fit

1. Open the Android project:
   ```bash
   npx cap open android
   ```

2. Add Google Fit API credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable **Google Fit API**
   - Create OAuth 2.0 credentials
   - Add your package name and SHA-1 fingerprint

3. Add permissions to `AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
   <uses-permission android:name="com.google.android.gms.permission.FITNESS_ACTIVITY_READ" />
   ```

### 3.3 Build and Run

```bash
npx cap run android
```

## Step 4: Test the Integration

1. **Build the native app**:
   ```bash
   npm run build
   npx cap sync
   ```

2. **Run on device**:
   - iOS: `npx cap run ios`
   - Android: `npx cap run android`

3. **In the app**:
   - Navigate to Health → Heart Tracker
   - Click "Connect Wearable"
   - Grant permissions when prompted
   - Your heart rate data should start syncing automatically

## Step 5: Verify Backend Connection

The app automatically sends heart rate data to your Supabase backend:

- **Table**: `heart_rate_data`
- **Edge Function**: `heart-data` (handles incoming data)
- **Real-time sync**: Data syncs every 5 seconds when monitoring is active

Check your Supabase dashboard to verify data is being stored.

## Troubleshooting

### iOS Issues

- **"HealthKit not available"**: Make sure you're running on a physical device (HealthKit doesn't work in simulator)
- **Permissions denied**: Check Settings → Privacy → Health → Trinity Life Optimizer
- **No data syncing**: Ensure Apple Watch is paired and Health app has heart rate data

### Android Issues

- **Google Fit not connecting**: Verify OAuth credentials are correct
- **Permissions denied**: Check app permissions in Android Settings
- **No data**: Ensure Google Fit app is installed and has heart rate data

### General Issues

- **Web browser**: HealthKit/Google Fit only works in native apps, not web browsers
- **Backend errors**: Check Supabase logs and ensure edge function is deployed
- **Connection status**: Check the connection indicator in the Heart Tracker component

## Next Steps

- Set up Fitbit API integration (requires OAuth)
- Set up Garmin API integration (requires OAuth)
- Add more health metrics (steps, calories, sleep)

## Support

For issues or questions, check:
- [Capacitor Health Plugin Docs](https://github.com/capacitor-community/health)
- [Apple HealthKit Documentation](https://developer.apple.com/healthkit/)
- [Google Fit API Documentation](https://developers.google.com/fit)

