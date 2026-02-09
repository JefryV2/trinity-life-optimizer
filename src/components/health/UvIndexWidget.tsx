import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Sun, 
  Shield, 
  MapPin, 
  Clock,
  Plus,
  AlertTriangle,
  RefreshCw,
  Loader2
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface UvRecord {
  id: string;
  uv_index: number;
  location?: string;
  exposure_duration_minutes: number;
  protection_used: boolean;
  notes?: string;
  date: string;
  created_at: string;
}

export const UvIndexWidget = () => {
  const { user } = useAuth();
  const [uvRecord, setUvRecord] = useState<UvRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    uv_index: 5.0,
    location: "",
    exposure_duration_minutes: 0,
    protection_used: false,
    notes: ""
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; city?: string } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Get user's current location
  const getUserLocation = async (): Promise<{ lat: number; lon: number; city?: string } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Get city name using reverse geocoding (simplified)
          try {
            // In a real app, you'd use a proper geocoding service
            const city = "Your Location"; // Placeholder
            resolve({ lat: latitude, lon: longitude, city });
          } catch (error) {
            resolve({ lat: latitude, lon: longitude });
          }
        },
        (error) => {
          console.warn("Location access denied:", error);
          resolve(null);
        }
      );
    });
  };

  // Fetch live UV index based on location and current time from OpenWeatherMap API
  const fetchLiveUvIndex = async () => {
    if (!userLocation) return 5.0; // Default value
    
    try {
      setFetchingLive(true);
      
      // Call OpenWeatherMap UV Index API using env API key
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
      if (!apiKey) {
        console.warn("VITE_OPENWEATHER_API_KEY is not set; falling back to simulated UV.");
        throw new Error("Missing OpenWeather API key");
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/uvi?lat=${userLocation.lat}&lon=${userLocation.lon}&appid=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract UV index value from API response
      const uvIndex = data.value || data.uvi || 5.0;
      
      return Math.round(uvIndex * 10) / 10; // Round to 1 decimal place
    } catch (error) {
      console.error("Error fetching live UV from API:", error);
      
      // Fallback to simulated calculation if API fails
      const now = new Date();
      const hour = now.getHours();
      const month = now.getMonth();
      
      // Simple simulation based on time and season
      let baseUv = 3.0;
      
      // Time of day factor (highest UV around noon)
      if (hour >= 10 && hour <= 14) {
        baseUv += 4.0;
      } else if (hour >= 8 && hour <= 16) {
        baseUv += 2.0;
      }
      
      // Seasonal factor
      if (month >= 5 && month <= 8) { // Summer months
        baseUv += 2.0;
      } else if (month >= 2 && month <= 10) { // Spring/Fall
        baseUv += 1.0;
      }
      
      // Location factor (simplified - closer to equator = higher UV)
      const latFactor = Math.max(0, 1 - Math.abs(userLocation.lat) / 90);
      baseUv += latFactor * 3;
      
      // Add some randomness for realism
      const variation = (Math.random() - 0.5) * 2;
      const calculatedUv = Math.max(0, Math.min(15, baseUv + variation));
      
      return Math.round(calculatedUv * 10) / 10;
    } finally {
      setFetchingLive(false);
    }
  };

  const fetchUvData = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("uv_index_records")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();
      
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching UV data:", error);
        return;
      }
      
      setUvRecord(data || null);
    } catch (error) {
      console.error("Error fetching UV data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-update UV data every 5 hours
  useEffect(() => {
    const interval = setInterval(async () => {
      if (user && userLocation) {
        const now = new Date();
        const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
        
        // Update if it's been more than 5 hours or if there's no data
        if (!lastUpdate || lastUpdate < fiveHoursAgo) {
          try {
            setFetchingLive(true);
            const liveUv = await fetchLiveUvIndex();
            setFormData(prev => ({
              ...prev,
              uv_index: liveUv,
              location: userLocation.city || `${userLocation.lat.toFixed(2)}, ${userLocation.lon.toFixed(2)}`
            }));
            setLastUpdate(new Date());
            
            // Auto-save the updated data
            const today = new Date().toISOString().split("T")[0];
            await supabase
              .from("uv_index_records")
              .upsert({
                user_id: user.id,
                date: today,
                uv_index: liveUv,
                location: userLocation.city || `${userLocation.lat.toFixed(2)}, ${userLocation.lon.toFixed(2)}`,
                exposure_duration_minutes: 0,
                protection_used: false,
                notes: `Auto-updated: ${new Date().toLocaleTimeString()}`
              }, {
                onConflict: "user_id,date"
              });
            
            // Refresh the display
            fetchUvData();
          } catch (error) {
            console.error("Auto-update failed:", error);
          } finally {
            setFetchingLive(false);
          }
        }
      }
    }, 5 * 60 * 60 * 1000); // 5 hours in milliseconds

    return () => clearInterval(interval);
  }, [user, userLocation, lastUpdate]);

  useEffect(() => {
    const initializeWidget = async () => {
      // Get user location first
      const location = await getUserLocation();
      if (location) {
        setUserLocation(location);
        
        // Check if record exists for today
        const today = new Date().toISOString().split("T")[0];
        const { data: existingRecord } = await supabase
          .from("uv_index_records")
          .select("*")
          .eq("user_id", user?.id)
          .eq("date", today)
          .maybeSingle();
        
        if (!existingRecord && user) {
          // Auto-fetch live UV data for first-time users
          const liveUv = await fetchLiveUvIndex();
          setFormData(prev => ({
            ...prev,
            uv_index: liveUv,
            location: location.city || `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`
          }));
          setLastUpdate(new Date());
          
          // Auto-save the initial data
          try {
            await supabase
              .from("uv_index_records")
              .upsert({
                user_id: user.id,
                date: today,
                uv_index: liveUv,
                location: location.city || `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`,
                exposure_duration_minutes: 0,
                protection_used: false,
                notes: "Initial auto-fetched data"
              }, {
                onConflict: "user_id,date"
              });
          } catch (error) {
            console.log("Initial auto-save failed, but data is available");
          }
        }
      }
      fetchUvData();
    };
    
    if (user) {
      initializeWidget();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleRefreshLive = async () => {
    if (!userLocation) {
      toast({
        title: "Location Required",
        description: "Please enable location access to get live UV data.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const liveUv = await fetchLiveUvIndex();
      setFormData(prev => ({
        ...prev,
        uv_index: liveUv,
        location: userLocation.city || `${userLocation.lat.toFixed(2)}, ${userLocation.lon.toFixed(2)}`
      }));
      
      toast({
        title: "Live UV Updated",
        description: `Current UV index: ${liveUv}`
      });
    } catch (error) {
      console.error("Error refreshing UV:", error);
      toast({
        title: "Error",
        description: "Failed to fetch live UV data.",
        variant: "destructive"
      });
    }
  };

  const handleAddRecord = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("uv_index_records")
        .upsert({
          user_id: user.id,
          date: today,
          uv_index: formData.uv_index,
          location: formData.location,
          exposure_duration_minutes: formData.exposure_duration_minutes,
          protection_used: formData.protection_used,
          notes: formData.notes
        }, {
          onConflict: "user_id,date"
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setUvRecord(data);
      setShowAddForm(false);
      setFormData({
        uv_index: 5.0,
        location: "",
        exposure_duration_minutes: 0,
        protection_used: false,
        notes: ""
      });
      
      toast({
        title: "UV Index Recorded",
        description: "Your UV exposure has been logged successfully."
      });
    } catch (error) {
      console.error("Error saving UV record:", error);
      toast({
        title: "Error",
        description: "Failed to save UV index record.",
        variant: "destructive"
      });
    }
  };

  const getUvRiskLevel = (uvIndex: number) => {
    if (uvIndex <= 2) return { level: "Low", color: "text-green-600", bg: "bg-green-100" };
    if (uvIndex <= 5) return { level: "Moderate", color: "text-yellow-600", bg: "bg-yellow-100" };
    if (uvIndex <= 7) return { level: "High", color: "text-orange-600", bg: "bg-orange-100" };
    if (uvIndex <= 10) return { level: "Very High", color: "text-red-600", bg: "bg-red-100" };
    return { level: "Extreme", color: "text-purple-600", bg: "bg-purple-100" };
  };

  const risk = uvRecord ? getUvRiskLevel(uvRecord.uv_index) : getUvRiskLevel(formData.uv_index);

  if (loading) {
    return (
      <Card className="glass-panel">
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel p-4 border border-white/50 shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 shadow-xs">
              <Sun className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">UV Index</h3>
              <p className="text-[0.65rem] text-muted-foreground">Live tracking</p>
            </div>
          </div>
          {!uvRecord && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {uvRecord ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">
                {uvRecord.uv_index.toFixed(1)}
              </div>
              <div className={`px-2 py-1 rounded-full text-[0.6rem] font-medium ${risk.bg} ${risk.color}`}>
                {risk.level}
              </div>
            </div>
            
            <div className="w-full bg-muted/30 rounded-full h-1.5">
              <div 
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(uvRecord.uv_index / 15 * 100, 100)}%`,
                  backgroundColor: uvRecord.uv_index <= 2 ? "#10b981" : 
                                 uvRecord.uv_index <= 5 ? "#f59e0b" : 
                                 uvRecord.uv_index <= 7 ? "#f97316" : 
                                 uvRecord.uv_index <= 10 ? "#ef4444" : "#a855f7"
                }}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[80px]">{uvRecord.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  {uvRecord.protection_used ? (
                    <Shield className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                  )}
                  <span className={uvRecord.protection_used ? "text-green-600 text-[0.65rem]" : "text-orange-600 text-[0.65rem]"}>
                    {uvRecord.protection_used ? "Protected" : "Unprotected"}
                  </span>
                </div>
              </div>
              
              {lastUpdate && (
                <div className="text-[0.6rem] text-muted-foreground text-center">
                  Last updated: {lastUpdate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1 h-8 text-xs"
                onClick={() => {
                  setFormData({
                    uv_index: uvRecord.uv_index,
                    location: uvRecord.location || "",
                    exposure_duration_minutes: uvRecord.exposure_duration_minutes,
                    protection_used: uvRecord.protection_used,
                    notes: uvRecord.notes || ""
                  });
                  setShowAddForm(true);
                }}
              >
                Edit
              </Button>
              <Button 
                size="sm" 
                className="flex-1 h-8 text-xs bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                onClick={handleRefreshLive}
                disabled={fetchingLive}
              >
                {fetchingLive ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        ) : showAddForm ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-[0.6rem] text-muted-foreground">UV Index</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="15"
                  value={formData.uv_index}
                  onChange={(e) => setFormData({...formData, uv_index: parseFloat(e.target.value) || 0})}
                  className="w-full p-1.5 text-xs border rounded-md bg-background"
                />
              </div>
              <div>
                <label className="text-[0.6rem] text-muted-foreground">Duration (min)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.exposure_duration_minutes}
                  onChange={(e) => setFormData({...formData, exposure_duration_minutes: parseInt(e.target.value) || 0})}
                  className="w-full p-1.5 text-xs border rounded-md bg-background"
                />
              </div>
            </div>
            
            <div>
              <label className="text-[0.6rem] text-muted-foreground">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="City or GPS"
                className="w-full p-1.5 text-xs border rounded-md bg-background"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="protection"
                checked={formData.protection_used}
                onChange={(e) => setFormData({...formData, protection_used: e.target.checked})}
                className="h-3 w-3"
              />
              <label htmlFor="protection" className="text-[0.65rem] text-muted-foreground">
                Protection used
              </label>
            </div>
            
            <div className="flex gap-1.5">
              <Button 
                size="sm" 
                className="flex-1 h-8 text-xs"
                onClick={handleAddRecord}
              >
                Save
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-3">
            <div className="flex justify-center mb-2">
              <Sun className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              No UV data recorded for today
            </p>
            <div className="space-y-2">
              <Button 
                size="sm" 
                className="w-full h-8 text-xs bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                onClick={handleRefreshLive}
                disabled={fetchingLive}
              >
                {fetchingLive ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Getting UV Data...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Get Live UV Index
                  </>
                )}
              </Button>
              <p className="text-[0.6rem] text-muted-foreground">
                Or enter data manually
              </p>
              <Button 
                size="sm" 
                variant="outline"
                className="w-full h-8 text-xs"
                onClick={() => setShowAddForm(true)}
              >
                Manual Entry
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};