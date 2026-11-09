const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

const androidPermissions = [
  'android.permission.BLUETOOTH',
  'android.permission.BLUETOOTH_ADMIN',
  'android.permission.BLUETOOTH_SCAN',
  'android.permission.BLUETOOTH_CONNECT',
];

const withBlePermissions = (config) => {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    for (const name of androidPermissions) {
      if (!manifest['uses-permission'].some((permission) => permission.$?.['android:name'] === name)) {
        manifest['uses-permission'].push({ $: { 'android:name': name } });
      }
    }
    manifest['uses-feature'] = manifest['uses-feature'] || [];
    if (!manifest['uses-feature'].some((feature) => feature.$?.['android:name'] === 'android.hardware.bluetooth_le')) {
      manifest['uses-feature'].push({
        $: { 'android:name': 'android.hardware.bluetooth_le', 'android:required': 'false' },
      });
    }
    return mod;
  });

  config = withInfoPlist(config, (mod) => {
    mod.modResults.NSBluetoothAlwaysUsageDescription =
      'Trinity connects to Bluetooth heart-rate monitors to log heart readings.';
    mod.modResults.NSBluetoothPeripheralUsageDescription =
      'Trinity connects to Bluetooth heart-rate monitors to log heart readings.';
    mod.modResults.UIBackgroundModes = (mod.modResults.UIBackgroundModes || []).filter((mode) => mode !== 'bluetooth-central');
    return mod;
  });

  return config;
};

module.exports = withBlePermissions;