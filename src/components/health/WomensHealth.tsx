import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Heart, 
  Calendar, 
  Plus, 
  Droplet, 
  Moon,
  Clock,
  TrendingUp,
  Activity,
  Syringe,
  AlertTriangle,
  Flame,
  Star,
  Baby,
  Circle,
  Zap,
  CircleChevronLeft,
  CircleChevronRight,
  Bell,
  Edit,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Pill,
  BookOpen,
  Globe,
  Loader2,
  Save
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, subDays } from 'date-fns';

interface MenstrualCycle {
  id: string;
  cycle_start_date: string;
  cycle_end_date: string | null;
  cycle_length_days: number | null;
  period_length_days: number | null;
  flow_intensity: string | null;
  pain_level: number | null;
  mood_rating: number | null;
  symptoms: string[] | null;
  notes: string | null;
  created_at: string;
}

interface DailyLog {
  id?: string;
  date: string;
  flow_intensity: string | null;
  moods: string[];
  symptoms: string[];
  pain_level: number | null;
  notes: string | null;
}

const moodEmojis = [
  { id: 'calm', emoji: '😌', label: 'Calm' },
  { id: 'happy', emoji: '😊', label: 'Happy' },
  { id: 'anxious', emoji: '😰', label: 'Anxious' },
  { id: 'distracted', emoji: '😵', label: 'Distracted' },
  { id: 'confused', emoji: '😕', label: 'Confused' },
  { id: 'sad', emoji: '😢', label: 'Sad' },
  { id: 'angry', emoji: '😠', label: 'Angry' },
  { id: 'sleepy', emoji: '😴', label: 'Sleepy' },
];

const symptomEmojis = [
  { id: 'fine', emoji: '✅', label: 'Everything is Fine' },
  { id: 'cramps', emoji: '💢', label: 'Cramps' },
  { id: 'bloating', emoji: '🎈', label: 'Bloating' },
  { id: 'headache', emoji: '🤕', label: 'Headache' },
  { id: 'fatigue', emoji: '😴', label: 'Fatigue' },
  { id: 'mood_swings', emoji: '😤', label: 'Mood Swings' },
  { id: 'breast_tenderness', emoji: '💔', label: 'Breast Tenderness' },
  { id: 'back_pain', emoji: '🔙', label: 'Back Pain' },
  { id: 'nausea', emoji: '🤢', label: 'Nausea' },
  { id: 'food_cravings', emoji: '🍫', label: 'Food Cravings' },
  { id: 'acne', emoji: '😑', label: 'Acne' },
];

export function WomensHealth() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cycles, setCycles] = useState<MenstrualCycle[]>([]);
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [flowIntensity, setFlowIntensity] = useState<string>('');
  const [painLevel, setPainLevel] = useState(1);
  const [moodRating, setMoodRating] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDaily, setIsSavingDaily] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoggingPeriod, setIsLoggingPeriod] = useState(false);
  const [activeTab, setActiveTab] = useState('symptoms');
  const [showFertility, setShowFertility] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCycles();
      fetchDailyLogs();
    }
  }, [user]);

  // Load today's data when date changes
  useEffect(() => {
    if (user && selectedDate) {
      loadTodayData();
    }
  }, [selectedDate, user]);

  const fetchCycles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('menstrual_cycles')
        .select('*')
        .eq('user_id', user?.id)
        .order('cycle_start_date', { ascending: false })
        .limit(12);

      if (error) throw error;
      setCycles(data || []);
    } catch (error) {
      console.error('Error fetching cycles:', error);
      toast({
        title: "Error loading cycles",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('womens_health_daily_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      
      const logsMap: Record<string, DailyLog> = {};
      (data || []).forEach(log => {
        logsMap[log.date] = {
          id: log.id,
          date: log.date,
          flow_intensity: log.flow_intensity,
          moods: log.moods || [],
          symptoms: log.symptoms || [],
          pain_level: log.pain_level,
          notes: log.notes
        };
      });
      setDailyLogs(logsMap);
    } catch (error) {
      console.error('Error fetching daily logs:', error);
    }
  };

  const loadTodayData = () => {
    const todayLog = dailyLogs[selectedDate];
    if (todayLog) {
      setFlowIntensity(todayLog.flow_intensity || '');
      setMoodRating(todayLog.moods || []);
      setSymptoms(todayLog.symptoms || []);
      setPainLevel(todayLog.pain_level || 1);
      setNotes(todayLog.notes || '');
    } else {
      // Reset to defaults
      setFlowIntensity('');
      setMoodRating([]);
      setSymptoms([]);
      setPainLevel(1);
      setNotes('');
    }
  };

  const saveDailyLog = async () => {
    if (!user) return;

    setIsSavingDaily(true);
    try {
      const { error } = await supabase
        .from('womens_health_daily_logs')
        .upsert({
          user_id: user.id,
          date: selectedDate,
          flow_intensity: flowIntensity || null,
          moods: moodRating.length > 0 ? moodRating : null,
          symptoms: symptoms.length > 0 ? symptoms : null,
          pain_level: painLevel,
          notes: notes || null,
        }, {
          onConflict: 'user_id,date'
        });

      if (error) throw error;

      toast({
        title: "Daily log saved",
        description: "Your symptoms and mood have been recorded"
      });

      await fetchDailyLogs();
    } catch (error) {
      console.error('Error saving daily log:', error);
      toast({
        title: "Error saving log",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSavingDaily(false);
    }
  };

  const logCycle = async () => {
    if (!user || !startDate) return;

    setIsLoading(true);
    try {
      const periodLength = endDate && startDate 
        ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : null;

      const { error } = await supabase
        .from('menstrual_cycles')
        .insert({
          user_id: user.id,
          cycle_start_date: startDate,
          cycle_end_date: endDate || null,
          period_length_days: periodLength,
          flow_intensity: flowIntensity || null,
          pain_level: painLevel,
          mood_rating: moodRating.length > 0 ? moodRating.length : null,
          symptoms: symptoms.length > 0 ? symptoms : null,
          notes: notes || null
        });

      if (error) throw error;

      toast({
        title: "Period logged successfully",
        description: "Your cycle data has been recorded"
      });

      setStartDate('');
      setEndDate('');
      setIsLoggingPeriod(false);
      
      await fetchCycles();
    } catch (error) {
      console.error('Error logging cycle:', error);
      toast({
        title: "Error logging period",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMood = (moodId: string) => {
    setMoodRating(prev => 
      prev.includes(moodId) 
        ? prev.filter(m => m !== moodId)
        : [...prev, moodId]
    );
  };

  const toggleSymptom = (symptomId: string) => {
    setSymptoms(prev => 
      prev.includes(symptomId) 
        ? prev.filter(s => s !== symptomId)
        : [...prev, symptomId]
    );
  };
    
  // Calculate current period info
  const getCurrentPeriodInfo = () => {
    if (cycles.length === 0) return null;
    
    const currentCycle = cycles[0];
    const start = new Date(currentCycle.cycle_start_date);
    const end = currentCycle.cycle_end_date 
      ? new Date(currentCycle.cycle_end_date)
      : addDays(start, (currentCycle.period_length_days || 5) - 1);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    if (today >= start && today <= end) {
      const dayNumber = differenceInDays(today, start) + 1;
      return {
        day: dayNumber,
        startDate: start,
        endDate: end,
        totalDays: differenceInDays(end, start) + 1
      };
    }

    return null;
  };

  const currentPeriod = getCurrentPeriodInfo();

  // Calculate next period prediction
  const getNextPeriod = () => {
    if (cycles.length < 2) return null;
    
    const avgCycleLength = cycles
      .filter(c => c.cycle_length_days)
      .reduce((sum, c, idx) => {
        if (idx === 0) return c.cycle_length_days || 28;
        return (sum + (c.cycle_length_days || 28)) / 2;
      }, cycles[0].cycle_length_days || 28);
    
    const lastCycle = cycles[0];
    const lastStart = new Date(lastCycle.cycle_start_date);
    const nextStart = addDays(lastStart, Math.round(avgCycleLength));
    
    return nextStart;
  };

  const nextPeriod = getNextPeriod();
  const daysUntilNext = nextPeriod ? differenceInDays(nextPeriod, new Date()) : null;

  // Calculate ovulation
  const getOvulationDate = () => {
    if (cycles.length < 2) return null;
    
    const avgCycleLength = cycles
      .filter(c => c.cycle_length_days)
      .reduce((sum, c, idx) => {
        if (idx === 0) return c.cycle_length_days || 28;
        return (sum + (c.cycle_length_days || 28)) / 2;
      }, cycles[0].cycle_length_days || 28);
    
    const lastCycle = cycles[0];
    if (!lastCycle.cycle_start_date) return null;
    
    const ovulationDate = new Date(lastCycle.cycle_start_date);
    ovulationDate.setDate(ovulationDate.getDate() + Math.round(avgCycleLength / 2));
    
    return ovulationDate;
  };

  const ovulationDate = getOvulationDate();
  
  // Get fertility history for chart
  const getFertilityHistory = () => {
    const history = [];
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    cycles.slice(0, 6).reverse().forEach((cycle, idx) => {
      const month = new Date(cycle.cycle_start_date).toLocaleDateString('en-US', { month: 'short' });
      const fertilityDays = Math.round((cycle.cycle_length_days || 28) / 2);
      history.push({
        month: month,
        days: fertilityDays,
        isCurrent: idx === cycles.length - 1
      });
    });

    return history;
  };
  
  const fertilityHistory = getFertilityHistory();

  // Calendar helpers
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = monthStart.getDay();

  const isPeriodDay = (date: Date) => {
    return cycles.some(cycle => {
      const start = new Date(cycle.cycle_start_date);
      const end = cycle.cycle_end_date 
        ? new Date(cycle.cycle_end_date)
        : addDays(start, (cycle.period_length_days || 5) - 1);
      
      return date >= start && date <= end;
    });
  };

  const isOvulationDayCheck = (date: Date) => {
    if (!ovulationDate) return false;
    return isSameDay(date, ovulationDate);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  if (loading) {
  return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
    );
  }
                
                return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-500 safe-area-left safe-area-right">
      {/* Period Day Card - Hero Section */}
      {currentPeriod && (
        <Card className="glass-panel bg-gradient-to-br from-purple-50/90 to-pink-50/90 border-purple-200/60 mx-4 overflow-hidden animate-in slide-in-from-top duration-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg animate-pulse">
                  <Droplet className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">Period Day {currentPeriod.day}</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">{format(currentPeriod.startDate, 'd MMM')}</p>
            </div>
              </div>
              <Dialog open={isLoggingPeriod} onOpenChange={setIsLoggingPeriod}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Edit Period</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Log Period</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                        <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
                        <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
                      <Label>Flow Intensity</Label>
            <Select value={flowIntensity} onValueChange={setFlowIntensity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select intensity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="heavy">Heavy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
                      <Label>Pain Level: {painLevel}/10</Label>
              <Input
                type="range"
                min="1"
                max="10"
                value={painLevel}
                onChange={(e) => setPainLevel(Number(e.target.value))}
                        className="w-full"
              />
              </div>
                    <Button onClick={logCycle} disabled={!startDate || isLoading} className="w-full">
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Period"
                      )}
                    </Button>
            </div>
                </DialogContent>
              </Dialog>
          </div>

            {/* Period History Chart */}
            <div className="mt-4 sm:mt-6 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Period History</p>
              <div className="flex items-end justify-between gap-1 sm:gap-2">
                {fertilityHistory.map((period, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 sm:gap-2">
                    <div className="relative w-full">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ease-out ${
                          period.isCurrent
                            ? 'bg-gradient-to-t from-pink-500 to-purple-500 shadow-lg'
                            : 'bg-gradient-to-t from-gray-300 to-gray-400'
                        }`}
                        style={{
                          height: `${Math.max(period.days * 6, 15)}px`,
                          animation: period.isCurrent ? 'pulse 2s ease-in-out infinite' : 'none'
                        }}
                      />
                      {period.isCurrent && (
                        <div className="absolute -top-6 sm:-top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap">
                          {period.days}day
              </div>
                      )}
            </div>
                    <span className={`text-[10px] sm:text-xs font-medium ${period.isCurrent ? 'text-purple-600' : 'text-muted-foreground'}`}>
                      {period.month}
                    </span>
          </div>
              ))}
            </div>
          </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Symptoms, Daily Details, Read */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 rounded-xl p-1 h-10">
            <TabsTrigger value="symptoms" className="text-xs sm:text-sm">Symptoms</TabsTrigger>
            <TabsTrigger value="details" className="text-xs sm:text-sm">Daily Details</TabsTrigger>
            <TabsTrigger value="read" className="text-xs sm:text-sm">Read</TabsTrigger>
          </TabsList>
        </div>

        {/* Symptoms Tab */}
        <TabsContent value="symptoms" className="space-y-4 px-4 mt-4">
          {/* Date Selector */}
          <Card className="glass-panel">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1 text-sm"
            />
          </div>
            </CardContent>
          </Card>

          {/* Menstrual Flow */}
          <Card className="glass-panel">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base font-semibold">Menstrual Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 sm:gap-3">
                {['light', 'moderate', 'heavy'].map((flow) => (
          <Button 
                    key={flow}
                    variant={flowIntensity === flow ? "default" : "outline"}
                    className={`flex-1 gap-1 sm:gap-2 capitalize text-xs sm:text-sm h-9 sm:h-10 ${
                      flowIntensity === flow 
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' 
                        : ''
                    }`}
                    onClick={() => setFlowIntensity(flow)}
          >
                    <Droplet className="h-3 w-3 sm:h-4 sm:w-4" />
                    {flow}
          </Button>
                ))}
              </div>
        </CardContent>
      </Card>

          {/* Mood */}
          <Card className="glass-panel">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base font-semibold">Mood</CardTitle>
        </CardHeader>
        <CardContent>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {moodEmojis.map((mood) => (
                  <Button
                    key={mood.id}
                    variant={moodRating.includes(mood.id) ? "default" : "outline"}
                    className={`flex flex-col gap-1 h-auto py-2 sm:py-3 text-xs ${
                      moodRating.includes(mood.id)
                        ? mood.id === 'distracted' 
                          ? 'bg-green-500 text-white'
                          : mood.id === 'sleepy'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                        : ''
                    }`}
                    onClick={() => toggleMood(mood.id)}
                  >
                    <span className="text-xl sm:text-2xl">{mood.emoji}</span>
                    <span className="text-[10px] sm:text-xs leading-tight">{mood.label}</span>
                  </Button>
                ))}
          </div>
        </CardContent>
      </Card>

          {/* Symptoms */}
          <Card className="glass-panel">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base font-semibold">Symptoms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {symptomEmojis.map((symptom) => (
                  <Button
                    key={symptom.id}
                    variant={symptoms.includes(symptom.id) ? "default" : "outline"}
                    className={`flex flex-col gap-1 h-auto py-2 sm:py-3 text-xs ${
                      symptoms.includes(symptom.id)
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                        : ''
                    }`}
                    onClick={() => toggleSymptom(symptom.id)}
                  >
                    <span className="text-lg sm:text-xl">{symptom.emoji}</span>
                    <span className="text-[10px] sm:text-xs leading-tight">{symptom.label}</span>
                  </Button>
                ))}
                        </div>
            </CardContent>
          </Card>

          {/* Cycle Snapshot - simpler, more intuitive than dial */}
          <Card className="glass-panel bg-gradient-to-r from-purple-50/90 via-pink-50/90 to-orange-50/90">
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <Droplet className="h-4 w-4 text-pink-500" />
                  Cycle snapshot
                </CardTitle>
                {currentPeriod && (
                  <Badge className="bg-pink-500/10 text-pink-700 border-pink-200 text-[10px] sm:text-xs">
                    Day {currentPeriod.day} of {currentPeriod.totalDays}
                  </Badge>
                          )}
                      </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground">
                <span>Today · {format(new Date(), 'd MMM')}</span>
                {daysUntilNext !== null && (
                  <span className="font-medium text-purple-600">
                    Next period in {Math.max(daysUntilNext, 0)} days
                  </span>
                )}
              </div>

              {/* Period progress bar */}
              <div className="space-y-1.5">
                <div className="h-2.5 w-full rounded-full bg-white/70 overflow-hidden border border-white/60 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      currentPeriod
                        ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400'
                        : 'bg-muted'
                    }`}
                    style={{
                      width: currentPeriod
                        ? `${Math.min(
                            100,
                            (currentPeriod.day / Math.max(currentPeriod.totalDays, 1)) * 100
                          )}%`
                        : '0%',
                    }}
                  />
                      </div>
                <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
                  <span>Start</span>
                  <span>
                    {currentPeriod
                      ? `${format(currentPeriod.startDate, 'd MMM')} - ${format(
                          currentPeriod.endDate,
                          'd MMM'
                        )}`
                      : 'Log your next period to see your timeline'}
                  </span>
                  <span>End</span>
                    </div>
                  </div>

              {/* Ovulation info */}
              {ovulationDate && (
                <div className="flex items-center justify-between text-[11px] sm:text-xs px-2 py-1.5 rounded-xl bg-white/70 border border-purple-100">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                    <span className="font-medium text-purple-700">Estimated ovulation</span>
                      </div>
                  <span className="font-semibold text-purple-700">
                    {format(ovulationDate, 'd MMM')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            onClick={saveDailyLog}
            disabled={isSavingDaily}
            className="w-full h-12 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-base font-semibold shadow-lg"
          >
            {isSavingDaily ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Daily Log
              </>
            )}
          </Button>
        </TabsContent>

        {/* Daily Details Tab */}
        <TabsContent value="details" className="space-y-4 px-4 mt-4">
          {/* Date and Period Selector */}
          <Card className="glass-panel">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" />
                <div className="flex-1">
                  <Input
                    type="date"
                    value={format(new Date(), 'yyyy-MM-dd')}
                    className="text-xs sm:text-sm"
                  />
                  </div>
                <Select defaultValue="monthly">
                  <SelectTrigger className="w-24 sm:w-32 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                </div>
              </CardContent>
            </Card>

          {/* Fertility Section */}
          <Card className="glass-panel">
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  <CardTitle className="text-sm sm:text-base font-semibold">Fertility</CardTitle>
                  </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground">{format(new Date(), 'd MMM')}</span>
                  </div>
              </CardHeader>
              <CardContent>
              <div className="flex items-end justify-between gap-1 sm:gap-2">
                {fertilityHistory.map((period, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 sm:gap-2">
                    <div className="relative w-full">
                      <div 
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          period.isCurrent
                            ? 'bg-orange-500 shadow-lg'
                            : 'bg-gray-300/50'
                        }`}
                        style={{
                          height: `${Math.max(period.days * 5, 12)}px`,
                        }}
                      />
                      {period.isCurrent && (
                        <div className="absolute -top-5 sm:-top-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded whitespace-nowrap">
                          {period.days}day
                    </div>
                      )}
                  </div>
                    <span className={`text-[10px] sm:text-xs font-medium ${period.isCurrent ? 'text-orange-600' : 'text-muted-foreground'}`}>
                      {period.month}
                    </span>
                        </div>
                      ))}
                </div>
              </CardContent>
            </Card>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3">
            <Button variant="outline" className="flex-1 gap-1 sm:gap-2 text-xs sm:text-sm h-9 sm:h-10">
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Cycle stats</span>
              <span className="sm:hidden">Stats</span>
            </Button>
            <Button variant="outline" className="flex-1 gap-1 sm:gap-2 text-xs sm:text-sm h-9 sm:h-10">
              <Pill className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Medicine log</span>
              <span className="sm:hidden">Medicine</span>
            </Button>
                  </div>
                  
          {/* Logs and Fertility Toggle */}
          <div className="flex gap-2 sm:gap-3">
            <Button variant="outline" className="flex-1 gap-1 sm:gap-2 text-xs sm:text-sm h-9 sm:h-10">
              <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
              Logs
            </Button>
            <Button 
              variant={showFertility ? "default" : "outline"}
              className={`flex-1 gap-1 sm:gap-2 text-xs sm:text-sm h-9 sm:h-10 ${showFertility ? 'bg-orange-500' : ''}`}
              onClick={() => setShowFertility(!showFertility)}
            >
              <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
              Fertility
            </Button>
                      </div>

          {/* Calendar */}
          <Card className="glass-panel">
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg font-semibold">Calendar</CardTitle>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateMonth('prev')}
                    className="h-7 w-7 sm:h-8 sm:w-8"
                  >
                    <CircleChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <span className="text-xs sm:text-sm font-medium min-w-[100px] sm:min-w-[140px] text-center">
                    {format(currentDate, 'MMM yyyy')}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateMonth('next')}
                    className="h-7 w-7 sm:h-8 sm:w-8"
                  >
                    <CircleChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                      </div>
                      </div>
              </CardHeader>
              <CardContent>
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1 sm:mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground py-1 sm:py-2">
                    {day}
                    </div>
                ))}
                    </div>
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {Array.from({ length: firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="aspect-square" />
                ))}
                {daysInMonth.map((date, idx) => {
                  const isPeriod = isPeriodDay(date);
                  const isOvulation = isOvulationDayCheck(date);
                  const isTodayDate = isToday(date);

                  return (
                    <div
                      key={idx}
                      className={`aspect-square flex items-center justify-center rounded-lg sm:rounded-xl transition-all duration-300 hover:scale-110 ${
                        isPeriod
                          ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg'
                          : isOvulation
                          ? 'bg-green-500 text-white'
                          : isTodayDate
                          ? 'ring-2 ring-purple-500 bg-purple-50'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <span className={`text-xs sm:text-sm font-medium ${isPeriod || isOvulation ? 'text-white' : ''}`}>
                        {format(date, 'd')}
                      </span>
                    </div>
                  );
                })}
                </div>
              </CardContent>
            </Card>
        </TabsContent>

        {/* Read Tab - Educational Content */}
        <TabsContent value="read" className="space-y-4 px-4 mt-4">
          {/* Courses Section */}
          <Card className="glass-panel">
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm sm:text-base font-semibold">Courses</CardTitle>
                <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs h-7 sm:h-8">
                  See all
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3">
              <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <Heart className="h-8 w-8 sm:h-12 sm:w-12 text-white/80" />
                      </div>
                <CardContent className="p-3 sm:p-4">
                  <h3 className="font-semibold text-sm sm:text-base mb-1">Synchrony</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Timing and Intimacy</p>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>10 minutes read</span>
                    </div>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-gradient-to-br from-pink-400 to-red-500 flex items-center justify-center">
                  <Pill className="h-8 w-8 sm:h-12 sm:w-12 text-white/80" />
                    </div>
                <CardContent className="p-3 sm:p-4">
                  <h3 className="font-semibold text-sm sm:text-base mb-1">Conception</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Boosting Fertility</p>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>7 minutes read</span>
              </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Topics For You */}
          <Card className="glass-panel">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base font-semibold">Topics For You</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-2 sm:mb-3">
                      <Baby className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                      </div>
                    <h3 className="font-semibold text-xs sm:text-sm">Never Menstruated</h3>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200 cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-pink-500/20 flex items-center justify-center mb-2 sm:mb-3">
                      <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-pink-600" />
                      </div>
                    <h3 className="font-semibold text-xs sm:text-sm">First Pregnancy</h3>
            </CardContent>
          </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Floating Add Button */}
      <div className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-40">
        <Button
          size="lg"
          className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 shadow-lg hover:shadow-xl transition-all hover:scale-110"
          onClick={() => setIsLoggingPeriod(true)}
        >
          <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </Button>
        </div>
    </div>
  );
}
