
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { 
  Brain, 
  Heart, 
  Plus, 
  Smile,
  Frown,
  Meh,
  Battery,
  Moon,
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";

interface MentalHealthLog {
  id: string;
  mood_rating: number | null;
  stress_level: number | null;
  anxiety_level: number | null;
  energy_level: number | null;
  sleep_quality_rating: number | null;
  thoughts: string | null;
  activities: string[] | null;
  triggers: string[] | null;
  coping_strategies: string[] | null;
  notes: string | null;
  logged_at: string | null;
  created_at: string;
}

export function MentalHealth() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<MentalHealthLog[]>([]);
  const [moodRating, setMoodRating] = useState(5);
  const [stressLevel, setStressLevel] = useState(5);
  const [anxietyLevel, setAnxietyLevel] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [sleepQuality, setSleepQuality] = useState(5);
  const [thoughts, setThoughts] = useState('');
  const [activities, setActivities] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [copingStrategies, setCopingStrategies] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(new Date().toTimeString().slice(0, 5)); // HH:MM format

  const commonActivities = [
    'Exercise', 'Reading', 'Meditation', 'Socializing', 'Work', 'Hobbies',
    'Nature walk', 'Music', 'Cooking', 'Gaming', 'Shopping', 'Relaxing'
  ];

  const commonTriggers = [
    'Work stress', 'Relationships', 'Financial concerns', 'Health issues',
    'Sleep problems', 'Social situations', 'Technology', 'Weather', 'Traffic', 'Deadlines'
  ];

  const commonCopingStrategies = [
    'Deep breathing', 'Meditation', 'Exercise', 'Talking to friends',
    'Journaling', 'Listening to music', 'Taking a break', 'Going outside',
    'Positive self-talk', 'Seeking help'
  ];

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('mental_health_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('logged_at', { ascending: false })
        .limit(20); // Increased limit to show more entries including multiple per day

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching mental health logs:', error);
    }
  };

  const logMentalHealth = async () => {
    if (!user || !selectedDate || !selectedTime) return;

    setIsLoading(true);
    try {
      // Combine date and time to create a complete timestamp
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const loggedAt = new Date(selectedDate);
      loggedAt.setHours(hours, minutes, 0, 0);

      const { error } = await supabase
        .from('mental_health_logs')
        .insert({
          user_id: user.id,
          mood_rating: moodRating,
          stress_level: stressLevel,
          anxiety_level: anxietyLevel,
          energy_level: energyLevel,
          sleep_quality_rating: sleepQuality,
          thoughts: thoughts || null,
          activities: activities.length > 0 ? activities : null,
          triggers: triggers.length > 0 ? triggers : null,
          coping_strategies: copingStrategies.length > 0 ? copingStrategies : null,
          notes: notes || null,
          logged_at: loggedAt.toISOString()
        });

      if (error) throw error;

      toast({
        title: "Mental health logged successfully",
        description: `Your mental health data has been recorded for ${selectedDate} at ${selectedTime}`
      });

      // Reset form
      setMoodRating(5);
      setStressLevel(5);
      setAnxietyLevel(5);
      setEnergyLevel(5);
      setSleepQuality(5);
      setThoughts('');
      setActivities([]);
      setTriggers([]);
      setCopingStrategies([]);
      setNotes('');
      
      // Don't reset date/time so users can log multiple times per day
      setSelectedTime(new Date().toTimeString().slice(0, 5));
      
      fetchLogs();
    } catch (error) {
      console.error('Error logging mental health:', error);
      toast({
        title: "Error logging mental health",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleArrayItem = (item: string, array: string[], setArray: (arr: string[]) => void) => {
    setArray(
      array.includes(item) 
        ? array.filter(i => i !== item)
        : [...array, item]
    );
  };

  const getMoodIcon = (rating: number) => {
    if (rating <= 3) return <Frown className="h-5 w-5 text-red-500" />;
    if (rating <= 7) return <Meh className="h-5 w-5 text-yellow-500" />;
    return <Smile className="h-5 w-5 text-green-500" />;
  };

  const getRatingColor = (rating: number, isStress = false) => {
    if (isStress) {
      if (rating <= 3) return 'text-green-600';
      if (rating <= 7) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (rating <= 3) return 'text-red-600';
    if (rating <= 7) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getAverageRatings = () => {
    if (logs.length === 0) return null;
    
    const recentLogs = logs.slice(0, 14); // Last 14 entries to account for multiple entries per day
    return {
      mood: recentLogs.reduce((sum, log) => sum + (log.mood_rating || 0), 0) / recentLogs.length,
      stress: recentLogs.reduce((sum, log) => sum + (log.stress_level || 0), 0) / recentLogs.length,
      anxiety: recentLogs.reduce((sum, log) => sum + (log.anxiety_level || 0), 0) / recentLogs.length,
      energy: recentLogs.reduce((sum, log) => sum + (log.energy_level || 0), 0) / recentLogs.length
    };
  };
  
  // Get average ratings per day
  const getDailyAverageRatings = () => {
    if (logs.length === 0) return {};
    
    const logsByDate: Record<string, MentalHealthLog[]> = {};
    
    logs.forEach(log => {
      if (log.logged_at) {
        const date = new Date(log.logged_at).toLocaleDateString();
        if (!logsByDate[date]) {
          logsByDate[date] = [];
        }
        logsByDate[date].push(log);
      }
    });
    
    const dailyAverages: Record<string, any> = {};
    Object.entries(logsByDate).forEach(([date, dayLogs]) => {
      dailyAverages[date] = {
        mood: dayLogs.reduce((sum, log) => sum + (log.mood_rating || 0), 0) / dayLogs.length,
        stress: dayLogs.reduce((sum, log) => sum + (log.stress_level || 0), 0) / dayLogs.length,
        anxiety: dayLogs.reduce((sum, log) => sum + (log.anxiety_level || 0), 0) / dayLogs.length,
        energy: dayLogs.reduce((sum, log) => sum + (log.energy_level || 0), 0) / dayLogs.length,
        count: dayLogs.length
      };
    });
    
    return dailyAverages;
  };
  
  // Helper function to get time of day descriptor
  const getTimeOfDayDescriptor = (timeString: string) => {
    const hour = parseInt(timeString.split(':')[0]);
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 21) return 'Evening';
    return 'Night';
  };

  const averages = getAverageRatings();
  const dailyAverages = getDailyAverageRatings();

  const latestMood = logs[0]?.mood_rating ?? moodRating ?? 5;

  const getMoodVisual = (value: number) => {
    if (value <= 3) {
      return {
        label: "I'm feeling low",
        emoji: '😔',
        bg: 'from-rose-400 to-orange-400',
      };
    }
    if (value <= 7) {
      return {
        label: "I'm feeling okay",
        emoji: '😐',
        bg: 'from-amber-400 to-amber-500',
      };
    }
    return {
      label: "I'm feeling happy",
      emoji: '😊',
      bg: 'from-lime-400 to-emerald-400',
    };
  };

  const moodVisual = getMoodVisual(latestMood);

  return (
    <div className="space-y-6 pb-4 safe-area-left safe-area-right">
      {/* Full-bleed mood hero, like the inspiration */}
      <Card className={`mx-1 sm:mx-4 rounded-3xl border-0 shadow-xl overflow-hidden bg-gradient-to-br ${moodVisual.bg}`}>
        <CardContent className="pt-8 pb-7 sm:pt-10 sm:pb-8 px-5 sm:px-7 space-y-8 text-white">
          <div className="space-y-2">
            <p className="text-xs sm:text-sm opacity-90">Hey there</p>
            <h2 className="text-2xl sm:text-3xl font-semibold leading-snug">
              How are you feeling
              <br />
              this day?
            </h2>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <span className="text-4xl sm:text-5xl">{moodVisual.emoji}</span>
            </div>
            <p className="text-sm sm:text-base font-medium opacity-95">
              {moodVisual.label}
            </p>
          </div>

          {/* Simple mood rail */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              {[2, 4, 6, 8, 10].map((value) => {
                const state = getMoodVisual(value);
                const isActive = latestMood >= value && latestMood < value + 2 || latestMood === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMoodRating(value)}
                    className={`rounded-full w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center border transition-all ${
                      isActive
                        ? 'bg-white text-black border-white shadow-md scale-105'
                        : 'bg-white/20 border-white/40 text-white/80 hover:bg-white/30'
                    }`}
                  >
                    {state.emoji}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-center">
              <Button
                size="sm"
                className="mt-1 rounded-full bg-white text-black px-6 sm:px-8 text-xs sm:text-sm font-semibold shadow-md hover:bg-white/90"
                onClick={logMentalHealth}
                disabled={!selectedDate || isLoading}
              >
                Set mood
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Check-in Card */}
      <Card className="ios-card">
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-0.5">Mood check-in</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Log how you feel in under a minute.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="log-date" className="text-[11px] sm:text-xs font-medium">
                Date
              </Label>
              <Input
                id="log-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 sm:h-11 text-xs sm:text-sm"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="log-time" className="text-[11px] sm:text-xs font-medium">
                Time
              </Label>
              <Input
                id="log-time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="h-10 sm:h-11 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                {getMoodIcon(moodRating)}
                Mood
              </Label>
              <span className="text-xs text-muted-foreground">
                {moodRating}/10
              </span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => {
                const isActive = moodRating === rating;
                return (
                  <button
                    key={rating}
                    className={`flex-1 min-w-[24px] h-9 sm:h-10 rounded-lg border text-[11px] sm:text-xs transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-400 to-lime-400 text-white border-transparent shadow-md scale-[1.03]'
                        : 'border-emerald-100 bg-white/70 text-emerald-800/80 hover:bg-emerald-50'
                    }`}
                    onClick={() => setMoodRating(rating)}
                  >
                    {rating}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground">
              <span>Low</span>
              <span>High</span>
            </div>

            {/* Removed extra preset buttons to avoid duplicate mood states */}

            {/* Energy, Stress, Anxiety compact controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Battery className="h-3.5 w-3.5 text-emerald-500" />
                  Energy
                </Label>
                <div className="flex gap-1 flex-wrap">
                  {[2, 4, 6, 8, 10].map((value) => {
                    const isActive = energyLevel === value;
                    return (
                      <button
                        key={`energy-${value}`}
                        className={`flex-1 min-w-[22px] h-8 rounded border text-[10px] transition-all ${
                          isActive
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm scale-[1.03]'
                            : 'border-emerald-100 bg-emerald-50/70 text-emerald-800/80 hover:bg-emerald-100'
                        }`}
                        onClick={() => setEnergyLevel(value)}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  Stress
                </Label>
                <div className="flex gap-1 flex-wrap">
                  {[2, 4, 6, 8, 10].map((value) => {
                    const isActive = stressLevel === value;
                    return (
                      <button
                        key={`stress-${value}`}
                        className={`flex-1 min-w-[22px] h-8 rounded border text-[10px] transition-all ${
                          isActive
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm scale-[1.03]'
                            : 'border-amber-100 bg-amber-50/80 text-amber-800/80 hover:bg-amber-100'
                        }`}
                        onClick={() => setStressLevel(value)}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5 text-rose-500" />
                  Anxiety
                </Label>
                <div className="flex gap-1 flex-wrap">
                  {[2, 4, 6, 8, 10].map((value) => {
                    const isActive = anxietyLevel === value;
                    return (
                      <button
                        key={`anxiety-${value}`}
                        className={`flex-1 min-w-[22px] h-8 rounded border text-[10px] transition-all ${
                          isActive
                            ? 'bg-rose-500 text-white border-rose-500 shadow-sm scale-[1.03]'
                            : 'border-rose-100 bg-rose-50/80 text-rose-800/80 hover:bg-rose-100'
                        }`}
                        onClick={() => setAnxietyLevel(value)}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Thoughts */}
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="thoughts" className="text-xs sm:text-sm font-medium">
                Quick note
              </Label>
              <Textarea
                id="thoughts"
                placeholder="Optional – jot down a sentence about today."
                value={thoughts}
                onChange={(e) => setThoughts(e.target.value)}
                className="min-h-[68px] sm:min-h-[80px] resize-none text-xs sm:text-sm"
              />
            </div>

            {/* Activities & coping as chips */}
            <div className="space-y-3">
              <Label className="text-xs sm:text-sm font-medium">What shaped your day?</Label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {commonActivities.slice(0, 6).map((activity) => (
                  <Button
                    key={activity}
                    variant={activities.includes(activity) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleArrayItem(activity, activities, setActivities)}
                    className="h-8 sm:h-9 text-[11px] sm:text-xs rounded-full px-3 sm:px-4"
                  >
                    {activity}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs sm:text-sm font-medium">How did you cope?</Label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {commonCopingStrategies.slice(0, 6).map((strategy) => (
                  <Button
                    key={strategy}
                    variant={copingStrategies.includes(strategy) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleArrayItem(strategy, copingStrategies, setCopingStrategies)}
                    className="h-8 sm:h-9 text-[11px] sm:text-xs rounded-full px-3 sm:px-4"
                  >
                    {strategy}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={logMentalHealth}
              disabled={!selectedDate || isLoading}
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-600 hover:to-lime-600 shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Save check-in
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mood history bar chart */}
      {Object.keys(dailyAverages).length > 0 ? (
        <Card className="ios-card">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Mood history</h3>
                <p className="text-sm text-muted-foreground">How your mood has moved over the last days</p>
              </div>
            </div>

            <div className="mt-2 flex items-end gap-2 h-32 sm:h-40">
              {Object.entries(dailyAverages)
                .sort(
                  ([a], [b]) =>
                    new Date(a).getTime() - new Date(b).getTime()
                )
                .slice(-10)
                .map(([date, values], index, arr) => {
                  const mood = (values as any).mood ?? 0;
                  const height = Math.max(12, (mood / 10) * 90);
                  const d = new Date(date);

                  // Create a soft gradient from purple to pink across the strip
                  const t = arr.length <= 1 ? 0.5 : index / (arr.length - 1);
                  const startColor = `hsl(${280 - t * 40} 80% 70%)`;
                  const endColor = `hsl(${330 - t * 20} 80% 60%)`;

                  return (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex items-end justify-center h-full">
                        <div
                          className="w-3 sm:w-4 rounded-full shadow-sm transition-all"
                          style={{
                            height: `${height}%`,
                            backgroundImage: `linear-gradient(180deg, ${endColor}, ${startColor})`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        {d.toLocaleDateString(undefined, { weekday: 'short' })}
                      </span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="ios-card">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">
              Log your mood a few times and you’ll see a colorful mood history chart here.
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Recent Logs */}
      {logs.length > 0 && (
        <Card className="ios-card">
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Recent Check-ins</h3>
              <p className="text-sm text-muted-foreground">Your mental health history</p>
            </div>
            
            <div className="space-y-3">
              {logs.slice(0, 5).map((log) => (
                <div key={log.id} className="p-4 rounded-xl bg-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    {getMoodIcon(log.mood_rating || 5)}
                    <span className="text-sm font-medium">
                      {log.logged_at ? new Date(log.logged_at).toLocaleDateString() : 'Unknown date'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {log.logged_at ? new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown time'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Mood: {log.mood_rating || 'N/A'} • Stress: {log.stress_level || 'N/A'}</div>
                    <div>Energy: {log.energy_level || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
