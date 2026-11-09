import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';

import { isDemoMode } from '@/lib/demo/demo-mode';

interface EnvironmentData {
  uv: number | null;
  aqi: number | null;
  pm25: number | null;
  label: string;
}

const key = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

const aqiLabel = (aqi: number | null) => {
  if (aqi === null) return 'Unavailable';
  return ['Good', 'Fair', 'Moderate', 'Poor', 'Very poor'][aqi - 1] ?? 'Unknown';
};

export const useEnvironment = () =>
  useQuery({
    queryKey: ['environment'],
    staleTime: 30 * 60_000,
    retry: 1,
    queryFn: async (): Promise<EnvironmentData> => {
      if (isDemoMode()) return { uv: 4.2, aqi: 2, pm25: 8.4, label: 'Fair' };
      if (!key) return { uv: null, aqi: null, pm25: null, label: 'OpenWeather key missing' };
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return { uv: null, aqi: null, pm25: null, label: 'Location denied' };
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      const [airResponse, uvResponse] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${key}`),
        fetch(`https://api.openweathermap.org/data/2.5/uvi?lat=${latitude}&lon=${longitude}&appid=${key}`),
      ]);
      if (!airResponse.ok) throw new Error('Could not load air quality.');
      const air = await airResponse.json();
      const uv = uvResponse.ok ? await uvResponse.json() : null;
      const item = air.list?.[0];
      const aqi = item?.main?.aqi ?? null;
      return {
        uv: typeof uv?.value === 'number' ? uv.value : null,
        aqi,
        pm25: typeof item?.components?.pm2_5 === 'number' ? item.components.pm2_5 : null,
        label: aqiLabel(aqi),
      };
    },
  });