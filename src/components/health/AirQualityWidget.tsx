import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cloud, Wind, AlertTriangle, MapPin, Loader2, RefreshCw } from "lucide-react";

type AirQualityLevel = "Good" | "Fair" | "Moderate" | "Poor" | "Very Poor";

interface AirQualityData {
  aqi: number; // 1-5 from OpenWeather
  level: AirQualityLevel;
  pm10?: number;
  pm25?: number;
  o3?: number;
  no2?: number;
}

export const AirQualityWidget = () => {
  const [location, setLocation] = useState<{ lat: number; lon: number; city?: string } | null>(null);
  const [aq, setAq] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolveLevel = (aqi: number): AirQualityLevel => {
    switch (aqi) {
      case 1:
        return "Good";
      case 2:
        return "Fair";
      case 3:
        return "Moderate";
      case 4:
        return "Poor";
      case 5:
      default:
        return "Very Poor";
    }
  };

  const fetchLocation = () =>
    new Promise<{ lat: number; lon: number; city?: string } | null>((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        },
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 10000 }
      );
    });

  const fetchAirQuality = async (lat: number, lon: number) => {
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (!apiKey) {
      setError("Missing OpenWeather API key");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
      );
      if (!res.ok) {
        throw new Error(`Air quality API error: ${res.status}`);
      }
      const json = await res.json();
      const item = json.list?.[0];
      if (!item) {
        throw new Error("No air quality data");
      }
      const aqi = item.main?.aqi ?? 3;
      const comps = item.components || {};
      setAq({
        aqi,
        level: resolveLevel(aqi),
        pm10: comps.pm10,
        pm25: comps.pm2_5,
        o3: comps.o3,
        no2: comps.no2,
      });
    } catch (e) {
      console.error("Failed to fetch air quality:", e);
      setError("Unable to load air quality right now");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const loc = await fetchLocation();
      if (loc) {
        setLocation(loc);
        await fetchAirQuality(loc.lat, loc.lon);
      } else {
        setError("Location permission needed for air quality");
        setLoading(false);
      }
    })();
  }, []);

  const levelColors: Record<AirQualityLevel, string> = {
    Good: "from-emerald-400 to-lime-400",
    Fair: "from-sky-400 to-cyan-400",
    Moderate: "from-amber-400 to-orange-400",
    Poor: "from-orange-500 to-red-500",
    "Very Poor": "from-rose-500 to-red-600",
  };

  const chipBg: Record<AirQualityLevel, string> = {
    Good: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Fair: "bg-sky-50 text-sky-700 border-sky-100",
    Moderate: "bg-amber-50 text-amber-700 border-amber-100",
    Poor: "bg-orange-50 text-orange-700 border-orange-100",
    "Very Poor": "bg-rose-50 text-rose-700 border-rose-100",
  };

  const currentLevel = aq?.level ?? "Moderate";

  return (
    <Card className="glass-panel overflow-hidden">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center shadow-md">
              <Cloud className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Air quality
              </p>
              <p className="text-sm font-semibold text-foreground">
                {aq ? currentLevel : "Checking..."}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => location && fetchAirQuality(location.lat, location.lon)}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        <div
          className={`mt-1 rounded-2xl bg-gradient-to-r ${levelColors[currentLevel]} p-3 flex items-center justify-between text-white shadow-inner`}
        >
          <div className="space-y-1">
            <p className="text-xs opacity-80">AQI (1–5)</p>
            <p className="text-2xl font-bold leading-none">{aq?.aqi ?? "–"}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[11px] opacity-80">
              {currentLevel === "Good" && "Great for outdoor activity"}
              {currentLevel === "Fair" && "Okay for most, be mindful if sensitive"}
              {currentLevel === "Moderate" && "Limit intense outdoor exercise"}
              {currentLevel === "Poor" && "Consider masking & shorter exposure"}
              {currentLevel === "Very Poor" && "Stay indoors if you can"}
            </p>
            <div className="flex items-center justify-end gap-1 text-[11px] opacity-90">
              <Wind className="h-3 w-3" />
              <span>Updated now</span>
            </div>
          </div>
        </div>

        {aq && (
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground">
            <div className="flex flex-wrap gap-2">
              {aq.pm25 !== undefined && (
                <span className={`px-2 py-0.5 rounded-full border text-[11px] ${chipBg[currentLevel]}`}>
                  PM2.5 {Math.round(aq.pm25)} µg/m³
                </span>
              )}
              {aq.pm10 !== undefined && (
                <span className={`px-2 py-0.5 rounded-full border text-[11px] ${chipBg[currentLevel]}`}>
                  PM10 {Math.round(aq.pm10)} µg/m³
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] sm:text-xs">
              <MapPin className="h-3 w-3" />
              <span>
                {location
                  ? `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`
                  : "Location off"}
              </span>
            </div>
          </div>

        )}

        {error && (
          <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-2 py-1.5">
            <AlertTriangle className="h-3 w-3" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


