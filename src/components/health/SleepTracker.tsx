import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Moon, Clock, Plus, Bell, Lightbulb, Thermometer, Volume2, Brain, Calendar, Flame, Check, Edit, Sun, ArrowRight, Wind, Activity } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";

interface SleepRecord {
  id: string;
  bedtime: string;
  wake_time: string;
  sleep_duration_hours: number;
  sleep_quality: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export function SleepTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sleepRecords, setSleepRecords] = useState<SleepRecord[]>([]);
  const [bedtime, setBedtime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [sleepQuality, setSleepQuality] = useState(5);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sleepStreak, setSleepStreak] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (user) {
      fetchSleepRecords();
      calculateSleepStreak();
    }
  }, [user]);

  const fetchSleepRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setSleepRecords(data || []);
    } catch (error) {
      console.error('Error fetching sleep records:', error);
    }
  };

  const calculateSleepStreak = async () => {
    try {
      const { data, error } = await supabase
        .from('sleep_records')
        .select('created_at, sleep_duration_hours')
        .eq('user_id', user?.id)
        .gte('sleep_duration_hours', 6) // Minimum 6 hours for streak
        .order('created_at', { ascending: false });

      if (error) throw error;

      let streak = 0;
      const today = new Date();
      
      for (let i = 0; i < (data?.length || 0); i++) {
        const recordDate = new Date(data![i].created_at);
        const daysDiff = Math.floor((today.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === streak) {
          streak++;
        } else {
          break;
        }
      }
      
      setSleepStreak(streak);
    } catch (error) {
      console.error('Error calculating sleep streak:', error);
    }
  };
  const calculateSleepDuration = (bedtime: string, wakeTime: string) => {
    if (!bedtime || !wakeTime) return 0;
    
    const bedDate = new Date(`2000-01-01 ${bedtime}`);
    let wakeDate = new Date(`2000-01-01 ${wakeTime}`);
    
    // If wake time is earlier than bedtime, assume it's the next day
    if (wakeDate < bedDate) {
      wakeDate = new Date(`2000-01-02 ${wakeTime}`);
    }
    
    const diffMs = wakeDate.getTime() - bedDate.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  };

  const logSleep = async () => {
    if (!user || !bedtime || !wakeTime || !selectedDate) return;

    setIsLoading(true);
    try {
      const duration = calculateSleepDuration(bedtime, wakeTime);
      const bedtimeDate = new Date(selectedDate);
      const wakeTimeDate = new Date(selectedDate);
      
      // Set bedtime to yesterday if wake time suggests next day
      const [bedHour, bedMin] = bedtime.split(':').map(Number);
      const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
      
      if (wakeHour < bedHour) {
        bedtimeDate.setDate(bedtimeDate.getDate() - 1);
      }
      
      bedtimeDate.setHours(bedHour, bedMin, 0, 0);
      wakeTimeDate.setHours(wakeHour, wakeMin, 0, 0);

      const { error } = await supabase
        .from('sleep_records')
        .insert({
          user_id: user.id,
          bedtime: bedtimeDate.toISOString(),
          wake_time: wakeTimeDate.toISOString(),
          sleep_duration_hours: duration,
          sleep_quality: sleepQuality,
          notes
        });

      if (error) throw error;

      toast({
        title: "Sleep logged successfully",
        description: `${duration} hours of sleep recorded`
      });

      // Reset form
      setBedtime('');
      setWakeTime('');
      setSleepQuality(5);
      setNotes('');
      
      fetchSleepRecords();
      calculateSleepStreak();
    } catch (error) {
      console.error('Error logging sleep:', error);
      toast({
        title: "Error logging sleep",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSuggestedBedtime = () => {
    if (!wakeTime) return null;
    
    const [hours, minutes] = wakeTime.split(':').map(Number);
    const wakeDate = new Date();
    wakeDate.setHours(hours, minutes, 0, 0);
    
    // Subtract 8 hours for optimal sleep
    const suggestedBedtime = new Date(wakeDate.getTime() - 8 * 60 * 60 * 1000);
    
    // If bedtime would be the previous day, adjust
    if (suggestedBedtime.getDate() !== wakeDate.getDate()) {
      suggestedBedtime.setDate(suggestedBedtime.getDate() + 1);
    }
    
    return suggestedBedtime.toTimeString().slice(0, 5);
  };

  const getSleepTips = () => [
    {
      icon: Thermometer,
      title: "Cool Room",
      tip: "Keep your bedroom between 60-67°F (15-19°C) for the best sleep quality.",
      science: "Core body temperature naturally drops to initiate sleep.",
      action: "Adjust thermostat now",
      category: "environment"
    },
    {
      icon: Volume2,
      title: "Quiet Space", 
      tip: "Aim for under 30 decibels. Use white noise or earplugs if needed.",
      science: "Noise above 35dB can fragment sleep and reduce deep sleep stages.",
      action: "Play white noise",
      category: "environment"
    },
    {
      icon: Moon,
      title: "Dark Room",
      tip: "Complete darkness or use blackout curtains and eye masks.",
      science: "Light exposure suppresses melatonin production, delaying sleep onset.",
      action: "Dim lights now",
      category: "environment"
    },
    {
      icon: Brain,
      title: "Screen Timeout",
      tip: "No screens 1 hour before bed. Blue light disrupts circadian rhythm.",
      science: "Blue light wavelengths (480nm) most strongly suppress melatonin.",
      action: "Set screen timer",
      category: "routine"
    }
  ];
  
  const [engagedTips, setEngagedTips] = useState<Record<string, boolean>>({});
  
  const handleTipAction = (tip: any) => {
    // Mark the tip as engaged
    setEngagedTips(prev => ({
      ...prev,
      [tip.title]: true
    }));
    
    // Show a toast notification
    toast({
      title: `Action taken: ${tip.action}`,
      description: `You've committed to: ${tip.tip}`
    });
    
    // In a real app, this would connect to specific functionality
    // For example, integrating with smart home devices, setting timers, etc.
  };

  const getAverageSleep = () => {
    if (sleepRecords.length === 0) return 0;
    const total = sleepRecords.reduce((sum, record) => sum + record.sleep_duration_hours, 0);
    return Math.round((total / sleepRecords.length) * 100) / 100;
  };

  const getAverageQuality = () => {
    if (sleepRecords.length === 0) return 0;
    const total = sleepRecords.reduce((sum, record) => sum + record.sleep_quality, 0);
    return Math.round((total / sleepRecords.length) * 10) / 10;
  };

  const suggestedBedtime = getSuggestedBedtime();
  const [showLogForm, setShowLogForm] = useState(false);

  // Get last night's sleep for hero card
  const lastNightSleep = useMemo(() => {
    if (sleepRecords.length === 0) return null;
    const lastRecord = sleepRecords[0];
    const duration = lastRecord.sleep_duration_hours;
    const hours = Math.floor(duration);
    const minutes = Math.round((duration - hours) * 60);
    
    // Compare with previous night
    let comparison = '';
    if (sleepRecords.length > 1) {
      const prevDuration = sleepRecords[1].sleep_duration_hours;
      const diff = duration - prevDuration;
      const diffMinutes = Math.round(Math.abs(diff) * 60);
      if (diff > 0) {
        comparison = `~ ${diffMinutes}min more than yesterday`;
      } else if (diff < 0) {
        comparison = `~ ${diffMinutes}min less than yesterday`;
      } else {
        comparison = 'Same as yesterday';
      }
    }
    
    return {
      hours,
      minutes,
      duration,
      comparison,
      quality: lastRecord.sleep_quality,
      bedtime: lastRecord.bedtime,
      wakeTime: lastRecord.wake_time
    };
  }, [sleepRecords]);

  // Generate sleep graph data (simplified visualization)
  const generateSleepGraph = () => {
    if (!lastNightSleep) return [];
    const hours = Math.ceil(lastNightSleep.duration);
    const data = [];
    for (let i = 0; i < hours; i++) {
      // Simulate sleep stages: light sleep (higher), deep sleep (lower), REM (medium)
      const stage = i % 3;
      let value = 0;
      if (stage === 0) value = 0.3; // Light sleep
      else if (stage === 1) value = 0.1; // Deep sleep
      else value = 0.5; // REM
      data.push(value);
    }
    return data;
  };

  const sleepGraphData = generateSleepGraph();

  // Get routine times (from last record or defaults)
  const routineBedtime = lastNightSleep 
    ? new Date(lastNightSleep.bedtime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '10:00 PM';
  const routineWakeTime = lastNightSleep
    ? new Date(lastNightSleep.wakeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '06:30 AM';

  const quickAccessItems = [
    { icon: Brain, label: 'Meditation', color: 'bg-purple-500' },
    { icon: Volume2, label: 'Sounds', color: 'bg-blue-500' },
    { icon: Wind, label: 'Breathing', color: 'bg-green-500' },
    { icon: Activity, label: 'Yoga', color: 'bg-orange-500' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Hero Sleep Summary Card */}
      {lastNightSleep ? (
        <Card className="ios-card overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center">
                  <Moon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-4xl font-bold text-emerald-900 dark:text-emerald-100">
                    {lastNightSleep.hours}h {lastNightSleep.minutes}m
                  </div>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                    {lastNightSleep.comparison}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                onClick={() => setShowLogForm(!showLogForm)}
              >
                see stats <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            
            {/* Sleep Graph */}
            {sleepGraphData.length > 0 && (
              <div className="mt-4">
                <div className="flex items-end gap-1 h-20">
                  {sleepGraphData.map((value, index) => (
                    <div
                      key={index}
                      className="flex-1 bg-emerald-400 dark:bg-emerald-600 rounded-t-sm transition-all duration-300"
                      style={{ height: `${value * 100}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                  <span>Light</span>
                  <span>Deep</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="ios-card overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-4">
              <Moon className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
              No sleep data yet
            </h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-4">
              Log your first sleep to see your patterns
            </p>
            <Button
              onClick={() => setShowLogForm(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Log Sleep
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sleep Routine Section */}
      <Card className="ios-card">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Sleep Routine</h3>
            </div>
            <span className="text-sm text-muted-foreground">
              {lastNightSleep ? `${Math.floor(lastNightSleep.duration)}h ${Math.round((lastNightSleep.duration % 1) * 60)}m` : '08h 30m'}
            </span>
          </div>

          {/* Timeline Bar */}
          <div className="relative h-12 bg-muted/30 rounded-xl overflow-hidden">
            <div className="absolute inset-0 flex items-center">
              {/* In-bed segment */}
              <div className="h-full bg-blue-500/30 flex-1" style={{ width: '45%' }} />
              {/* Sleep segment */}
              <div className="h-full bg-indigo-500 flex-1" style={{ width: '35%' }} />
              {/* Wake segment */}
              <div className="h-full bg-orange-500/30 flex-1" style={{ width: '20%' }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-between px-2 text-xs text-muted-foreground">
              <span>12PM</span>
              <span>6PM</span>
              <span>12AM</span>
              <span>6AM</span>
              <span>12PM</span>
            </div>
          </div>

          {/* Routine Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">In-bed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">{routineBedtime}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowLogForm(true)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Wake-up</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">{routineWakeTime}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowLogForm(true)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Access */}
      <Card className="ios-card">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Quick access</h3>
          <div className="grid grid-cols-4 gap-3">
            {quickAccessItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors haptic-light"
                >
                  <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-medium text-center">{item.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Log Sleep Form (Collapsible) */}
      {showLogForm && (
        <Card className="ios-card animate-in slide-in-from-bottom-4 duration-300">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Log Sleep</h3>
                <p className="text-sm text-muted-foreground">Track your sleep patterns and quality</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogForm(false)}
              >
                ×
              </Button>
            </div>
            
            {/* Date and Time Inputs */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sleep-date" className="text-sm font-medium">Date</Label>
                <Input
                  id="sleep-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-12"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bedtime" className="text-sm font-medium">Bedtime</Label>
                  <Input
                    id="bedtime"
                    type="time"
                    value={bedtime}
                    onChange={(e) => setBedtime(e.target.value)}
                    className="h-12 text-lg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="wake-time" className="text-sm font-medium">Wake Time</Label>
                  <Input
                    id="wake-time"
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="h-12 text-lg"
                  />
                </div>
              </div>
              
              {/* Suggested Bedtime */}
              {suggestedBedtime && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <Bell className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Suggested bedtime: {suggestedBedtime}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-300">
                        for 8 hours of sleep
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Duration Display */}
            {bedtime && wakeTime && (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium text-primary">
                    Duration: {calculateSleepDuration(bedtime, wakeTime)} hours
                  </span>
                </div>
              </div>
            )}
            
            {/* Sleep Quality */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Sleep Quality</Label>
                <Badge variant="secondary" className="px-3 py-1">
                  {sleepQuality}/10
                </Badge>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                  <button
                    key={rating}
                    className={`flex-1 h-10 rounded-lg border transition-colors haptic-light ${sleepQuality >= rating ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-accent'}`}
                    onClick={() => setSleepQuality(rating)}
                  >
                    <span className="text-xs font-medium">{rating}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="How did you sleep? Any disturbances?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
            
            {/* Log Button */}
            <Button 
              onClick={() => {
                logSleep();
                setShowLogForm(false);
              }}
              disabled={!bedtime || !wakeTime || !selectedDate || isLoading}
              className="w-full h-14 text-base font-semibold"
            >
              <Plus className="h-5 w-5 mr-2" />
              Log Sleep
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sleep Stats & History */}
      {sleepRecords.length > 0 && (
        <Card className="ios-card">
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Sleep Insights</h3>
              <p className="text-sm text-muted-foreground">Your sleep patterns and progress</p>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-xl">
                <div className="text-2xl font-bold text-primary">{getAverageSleep()}h</div>
                <p className="text-xs text-muted-foreground mt-1">Avg Sleep</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-xl">
                <div className="text-2xl font-bold text-primary">{getAverageQuality()}/10</div>
                <p className="text-xs text-muted-foreground mt-1">Avg Quality</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-xl">
                <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                  <Flame className="h-5 w-5 text-orange-500" />
                  {sleepStreak}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Day Streak</p>
              </div>
            </div>
            
            {/* Recent Records */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Recent Sleep Records</h4>
              {sleepRecords.slice(0, 5).map((record) => (
                <div key={record.id} className="flex justify-between items-center p-4 rounded-xl bg-muted/20">
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {new Date(record.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Quality: {record.sleep_quality}/10 • {record.sleep_duration_hours}h
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      {new Date(record.bedtime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(record.wake_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Sleep Tips */}
      <Card className="ios-card">
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Sleep Optimization Tips</h3>
            <p className="text-sm text-muted-foreground">Science-backed recommendations for better sleep</p>
          </div>
          
          {getSleepTips().map((tip, index) => {
            const Icon = tip.icon;
            const isEngaged = engagedTips[tip.title];
            return (
              <div key={index} className="p-4 rounded-xl bg-muted/20 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h4 className="font-semibold text-sm">{tip.title}</h4>
                  {isEngaged && (
                    <div className="ml-auto">
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        <Check className="h-3 w-3" />
                        Done
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{tip.tip}</p>
                <div className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/20 p-2 rounded-lg border-l-2 border-blue-200">
                  <strong>Science:</strong> {tip.science}
                </div>
                <div className="pt-1">
                  <Button
                    size="sm"
                    variant={isEngaged ? "default" : "outline"}
                    className="h-8 text-xs w-full"
                    onClick={() => handleTipAction(tip)}
                  >
                    {isEngaged ? "Done" : tip.action}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
