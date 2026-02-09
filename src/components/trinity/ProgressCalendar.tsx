import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface CalendarDay {
  date: Date;
  healthScore?: number;
  wealthScore?: number;
  relationsScore?: number;
  hasActivity: boolean;
}

const ProgressCalendar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayProgress, setDayProgress] = useState({
    health: { score: 0, completed: 0, total: 0 },
    wealth: { score: 0, completed: 0, total: 0 },
    relations: { score: 0, completed: 0, total: 0 }
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Fetch calendar data for the current month
  useEffect(() => {
    if (!user) return;

    const fetchCalendarData = async () => {
      setLoading(true);
      try {
        const startDate = format(monthStart, 'yyyy-MM-dd');
        const endDate = format(monthEnd, 'yyyy-MM-dd');

        // Fetch health data
        const { data: healthData, error: healthError } = await supabase
          .from('health_daily_scores')
          .select('date, score')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate);

        // Fetch wealth data
        const { data: wealthData, error: wealthError } = await supabase
          .from('wealth_daily_scores')
          .select('date, score')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate);

        // Fetch relations data
        const { data: relationsData, error: relationsError } = await supabase
          .from('relations_daily_scores')
          .select('date, score')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate);

        // Create a map of dates to scores
        const healthMap = new Map();
        const wealthMap = new Map();
        const relationsMap = new Map();

        if (healthData) {
          healthData.forEach(item => {
            healthMap.set(item.date, item.score);
          });
        }

        if (wealthData) {
          wealthData.forEach(item => {
            wealthMap.set(item.date, item.score);
          });
        }

        if (relationsData) {
          relationsData.forEach(item => {
            relationsMap.set(item.date, item.score);
          });
        }

        // Build calendar days
        const days = daysInMonth.map(date => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const healthScore = healthMap.get(dateStr) || undefined;
          const wealthScore = wealthMap.get(dateStr) || undefined;
          const relationsScore = relationsMap.get(dateStr) || undefined;
          
          return {
            date,
            healthScore,
            wealthScore,
            relationsScore,
            hasActivity: !!healthScore || !!wealthScore || !!relationsScore
          };
        });

        setCalendarDays(days);
      } catch (error) {
        console.error('Error fetching calendar data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, [user, currentMonth]);

  // Fetch detailed progress for selected date
  useEffect(() => {
    if (!user || !selectedDate) return;

    const fetchDayProgress = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Fetch health progress
      const { data: healthData, error: healthError } = await supabase
        .from('health_goals_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr);

      // Fetch wealth progress
      const { data: wealthData, error: wealthError } = await supabase
        .from('wealth_goals_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr);

      // Fetch relations progress
      const { data: relationsData, error: relationsError } = await supabase
        .from('relations_goals_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr);

      setDayProgress({
        health: {
          score: healthData && healthData[0] ? healthData[0].score || 0 : 0,
          completed: healthData && healthData[0] ? healthData[0].completed_count || 0 : 0,
          total: healthData && healthData[0] ? healthData[0].total_count || 1 : 1
        },
        wealth: {
          score: wealthData && wealthData[0] ? wealthData[0].score || 0 : 0,
          completed: wealthData && wealthData[0] ? wealthData[0].completed_count || 0 : 0,
          total: wealthData && wealthData[0] ? wealthData[0].total_count || 1 : 1
        },
        relations: {
          score: relationsData && relationsData[0] ? relationsData[0].score || 0 : 0,
          completed: relationsData && relationsData[0] ? relationsData[0].completed_count || 0 : 0,
          total: relationsData && relationsData[0] ? relationsData[0].total_count || 1 : 1
        }
      });
    };

    fetchDayProgress();
  }, [user, selectedDate]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const getDayColor = (day: CalendarDay) => {
    if (!day.hasActivity) return 'bg-gray-100';
    
    const scores = [day.healthScore, day.wealthScore, day.relationsScore].filter(score => score !== undefined) as number[];
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    if (avgScore >= 80) return 'bg-green-500';
    if (avgScore >= 60) return 'bg-yellow-500';
    if (avgScore >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom ios-scroll">
      {/* iOS-style Header */}
      <div className="ios-header safe-area-left safe-area-right">
        <div className="flex items-center justify-between w-full px-4">
          <div className="flex items-center gap-3">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-10 w-10 p-0 haptic-light"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="ios-large-title">Calendar 📅</div>
              <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-10 w-10 p-0 haptic-light">
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="px-4 safe-area-left safe-area-right pb-32">
        {/* Calendar Header */}
        <div className="flex items-center justify-between pt-6">
          <h2 className="text-xl font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <Card className="overflow-hidden mt-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {eachDayOfInterval({
                start: startOfMonth(currentMonth),
                end: endOfMonth(currentMonth)
              }).map((date, index) => {
                const day = calendarDays.find(d => isSameDay(d.date, date));
                const isCurrentMonth = isSameMonth(date, currentMonth);
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                
                return (
                  <button
                    key={index}
                    onClick={() => handleDateClick(date)}
                    className={`
                      h-10 w-10 rounded-full flex items-center justify-center text-sm
                      ${!isCurrentMonth ? 'text-muted-foreground/50' : ''}
                      ${isSelected ? 'ring-2 ring-primary' : ''}
                      ${day?.hasActivity ? getDayColor(day) : 'bg-gray-100'}
                      ${day?.hasActivity ? 'text-white' : 'text-foreground'}
                      hover:opacity-80 transition-opacity
                    `}
                  >
                    {format(date, 'd')}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-muted-foreground">Excellent (80-100)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-muted-foreground">Good (60-79)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-xs text-muted-foreground">Fair (40-59)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-muted-foreground">Needs Attention (0-39)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-100"></div>
            <span className="text-xs text-muted-foreground">No Data</span>
          </div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">
                Progress for {format(selectedDate, 'MMMM d, yyyy')}
              </h3>
              
              <div className="space-y-3">
                {/* Health Progress */}
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="font-medium">Health</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{dayProgress.health.score}%</div>
                    <div className="text-xs text-muted-foreground">
                      {dayProgress.health.completed}/{dayProgress.health.total} goals
                    </div>
                  </div>
                </div>
                
                {/* Wealth Progress */}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="font-medium">Wealth</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{dayProgress.wealth.score}%</div>
                    <div className="text-xs text-muted-foreground">
                      {dayProgress.wealth.completed}/{dayProgress.wealth.total} goals
                    </div>
                  </div>
                </div>
                
                {/* Relations Progress */}
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="font-medium">Relations</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{dayProgress.relations.score}%</div>
                    <div className="text-xs text-muted-foreground">
                      {dayProgress.relations.completed}/{dayProgress.relations.total} goals
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProgressCalendar;