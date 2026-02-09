import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Droplets, 
  Plus, 
  Minus,
  CupSoda,
  Clock,
  Target,
  Bell,
  BellOff
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface HydrationRecord {
  id: string;
  water_intake_ml: number;
  target_ml: number;
  cups_consumed: number;
  last_drink_time: string | null;
  notes?: string;
  date: string;
  created_at: string;
}

export const HydrationWidget = () => {
  const { user } = useAuth();
  const [hydrationRecord, setHydrationRecord] = useState<HydrationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    water_intake_ml: 0,
    target_ml: 2000,
    notes: ""
  });
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [reminderData, setReminderData] = useState({
    intervalMinutes: 120, // 2 hours default
    enabled: true,
    message: "Time to drink water!"
  });
  const [lastDrinkTime, setLastDrinkTime] = useState<string | null>(null);

  const fetchHydrationData = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("hydration_records")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();
      
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching hydration data:", error);
        return;
      }
      
      setHydrationRecord(data || null);
    } catch (error) {
      console.error("Error fetching hydration data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reminder functions (using localStorage for now)
  const fetchReminders = () => {
    const savedReminders = localStorage.getItem('hydration_reminders');
    if (savedReminders) {
      try {
        setReminders(JSON.parse(savedReminders));
      } catch (error) {
        console.error("Error parsing reminders:", error);
      }
    }
  };

  const saveReminders = (newReminders: any[]) => {
    localStorage.setItem('hydration_reminders', JSON.stringify(newReminders));
    setReminders(newReminders);
  };

  const handleAddReminder = () => {
    const newReminder = {
      id: Date.now().toString(),
      intervalMinutes: reminderData.intervalMinutes,
      message: reminderData.message,
      enabled: reminderData.enabled,
      createdAt: new Date().toISOString()
    };
    
    const updatedReminders = [...reminders, newReminder];
    saveReminders(updatedReminders);
    
    setShowReminderForm(false);
    setReminderData({
      intervalMinutes: 120,
      enabled: true,
      message: "Time to drink water!"
    });
    
    toast({
      title: "Reminder Added",
      description: `Hydration reminder set for every ${reminderData.intervalMinutes} minutes`
    });
  };

  const toggleReminder = (reminderId: string, enabled: boolean) => {
    const updatedReminders = reminders.map(r => 
      r.id === reminderId ? { ...r, enabled } : r
    );
    saveReminders(updatedReminders);
    
    toast({
      title: "Reminder Updated",
      description: `Reminder ${enabled ? 'enabled' : 'disabled'}`
    });
  };

  const deleteReminder = (reminderId: string) => {
    const updatedReminders = reminders.filter(r => r.id !== reminderId);
    saveReminders(updatedReminders);
    
    toast({
      title: "Reminder Deleted",
      description: "Hydration reminder removed"
    });
  };

  useEffect(() => {
    fetchHydrationData();
    fetchReminders();
    
    // Load last drink time from localStorage
    const savedLastDrink = localStorage.getItem('last_drink_time');
    if (savedLastDrink) {
      setLastDrinkTime(savedLastDrink);
    }
  }, [user]);

  // Smart reminder effect
  useEffect(() => {
    if (!reminders.length || !lastDrinkTime) return;
    
    const checkReminders = () => {
      const now = new Date();
      const lastDrink = new Date(lastDrinkTime);
      
      reminders.forEach(reminder => {
        if (!reminder.enabled) return;
        
        const timeSinceLastDrink = (now.getTime() - lastDrink.getTime()) / (1000 * 60); // minutes
        
        if (timeSinceLastDrink >= reminder.intervalMinutes) {
          // Show browser notification
          if (Notification.permission === 'granted') {
            new Notification('Hydration Reminder', {
              body: reminder.message || 'Time to drink water!',
              icon: '/favicon.ico'
            });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
          }
          
          // Show toast notification
          toast({
            title: "Hydration Reminder",
            description: reminder.message || "Time to drink water!",
            duration: 5000
          });
        }
      });
    };
    
    // Check every minute
    const interval = setInterval(checkReminders, 60000);
    
    // Initial check
    checkReminders();
    
    return () => clearInterval(interval);
  }, [reminders, lastDrinkTime]);

  const handleAddWater = async (amountMl: number) => {
    if (!user) return;
    
    try {
      const now = new Date().toISOString();
      const today = now.split("T")[0];
      const newIntake = (hydrationRecord?.water_intake_ml || 0) + amountMl;
      const cups = Math.floor(newIntake / 250); // Assuming 250ml per cup
      
      const { data, error } = await supabase
        .from("hydration_records")
        .upsert({
          user_id: user.id,
          date: today,
          water_intake_ml: newIntake,
          target_ml: hydrationRecord?.target_ml || 2000,
          cups_consumed: cups,
          last_drink_time: now
        }, {
          onConflict: "user_id,date"
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setHydrationRecord(data);
      
      // Update last drink time for reminders
      setLastDrinkTime(now);
      localStorage.setItem('last_drink_time', now);
      
      toast({
        title: "Water Added",
        description: `Added ${amountMl}ml of water. Total: ${newIntake}ml`
      });
    } catch (error) {
      console.error("Error updating hydration:", error);
      toast({
        title: "Error",
        description: "Failed to update water intake.",
        variant: "destructive"
      });
    }
  };

  const handleSetTarget = async (targetMl: number) => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("hydration_records")
        .upsert({
          user_id: user.id,
          date: today,
          water_intake_ml: hydrationRecord?.water_intake_ml || 0,
          target_ml: targetMl,
          cups_consumed: hydrationRecord?.cups_consumed || 0,
          last_drink_time: hydrationRecord?.last_drink_time
        }, {
          onConflict: "user_id,date"
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setHydrationRecord(data);
      setShowAddForm(false);
      
      toast({
        title: "Target Updated",
        description: `Daily water target set to ${targetMl}ml`
      });
    } catch (error) {
      console.error("Error setting target:", error);
      toast({
        title: "Error",
        description: "Failed to update water target.",
        variant: "destructive"
      });
    }
  };

  const getProgressPercentage = () => {
    if (!hydrationRecord) return 0;
    return Math.min((hydrationRecord.water_intake_ml / hydrationRecord.target_ml) * 100, 100);
  };

  const progress = getProgressPercentage();
  const currentIntake = hydrationRecord?.water_intake_ml || 0;
  const target = hydrationRecord?.target_ml || formData.target_ml;

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
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 shadow-xs">
              <Droplets className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Hydration</h3>
              <p className="text-[0.65rem] text-muted-foreground">Daily intake</p>
            </div>
          </div>
          {!hydrationRecord && (
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

        {hydrationRecord ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground mb-1">
                {currentIntake}ml
              </div>
              <div className="text-xs text-muted-foreground">
                of {target}ml target
              </div>
            </div>
            
            <div className="relative">
              <div className="w-full bg-muted/30 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-blue-400 to-cyan-400"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-0.5 shadow-xs border border-blue-200">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              </div>
            </div>
            
            <div className="flex justify-between text-[0.65rem]">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button 
                size="sm" 
                variant="outline"
                className="h-12 flex flex-col gap-1 bg-white/70 border border-white/60 hover:bg-white/90 transition-all duration-200 rounded-xl"
                onClick={() => handleAddWater(250)}
              >
                <div className="p-1 rounded-lg bg-blue-100">
                  <CupSoda className="h-3 w-3 text-blue-600" />
                </div>
                <span className="text-[0.65rem] font-medium">+250ml</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="h-12 flex flex-col gap-1 bg-white/70 border border-white/60 hover:bg-white/90 transition-all duration-200 rounded-xl"
                onClick={() => handleAddWater(500)}
              >
                <div className="p-1 rounded-lg bg-blue-100">
                  <CupSoda className="h-3 w-3 text-blue-600" />
                </div>
                <span className="text-[0.65rem] font-medium">+500ml</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="h-12 flex flex-col gap-1 bg-white/70 border border-white/60 hover:bg-white/90 transition-all duration-200 rounded-xl"
                onClick={() => handleAddWater(1000)}
              >
                <div className="p-1 rounded-lg bg-blue-100">
                  <CupSoda className="h-3 w-3 text-blue-600" />
                </div>
                <span className="text-[0.65rem] font-medium">+1L</span>
              </Button>
            </div>

            <div className="flex gap-2">
              <Button 
                size="sm" 
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-xs font-medium rounded-lg transition-all duration-200 h-8"
                onClick={() => setShowAddForm(true)}
              >
                <Target className="h-3 w-3 mr-1.5" />
                Set Target
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1 h-8 text-xs"
                onClick={() => setShowReminderForm(true)}
              >
                <Bell className="h-3 w-3 mr-1.5" />
                Reminders
              </Button>
            </div>
          </div>
        ) : showAddForm ? (
          <div className="space-y-2">
            <div>
              <label className="text-[0.6rem] text-muted-foreground">Daily Water Target (ml)</label>
              <input
                type="number"
                min="500"
                max="5000"
                step="100"
                value={formData.target_ml}
                onChange={(e) => setFormData({...formData, target_ml: parseInt(e.target.value) || 2000})}
                className="w-full p-1.5 text-xs border rounded-md bg-background"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-1.5">
              <Button 
                size="sm" 
                className="h-8 text-xs"
                onClick={() => handleSetTarget(formData.target_ml)}
              >
                Set
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
              <Droplets className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              No hydration data today
            </p>
            <Button 
              size="sm" 
              className="h-8 text-xs"
              onClick={() => setShowAddForm(true)}
            >
              Set Target
            </Button>
          </div>
        )}
        
        {/* Reminder Form Modal */}
        {showReminderForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-4 w-full max-w-sm">
              <h3 className="font-semibold mb-3">Add Hydration Reminder</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[0.6rem] text-muted-foreground">Interval (minutes)</label>
                  <select
                    value={reminderData.intervalMinutes}
                    onChange={(e) => setReminderData({...reminderData, intervalMinutes: parseInt(e.target.value)})}
                    className="w-full p-2 text-sm border rounded-md bg-background"
                  >
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                    <option value="180">3 hours</option>
                    <option value="240">4 hours</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-[0.6rem] text-muted-foreground">Message</label>
                  <input
                    type="text"
                    value={reminderData.message}
                    onChange={(e) => setReminderData({...reminderData, message: e.target.value})}
                    placeholder="Reminder message"
                    className="w-full p-2 text-sm border rounded-md bg-background"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="reminder-enabled"
                    checked={reminderData.enabled}
                    onChange={(e) => setReminderData({...reminderData, enabled: e.target.checked})}
                    className="h-3 w-3"
                  />
                  <label htmlFor="reminder-enabled" className="text-[0.65rem] text-muted-foreground">
                    Enable reminder
                  </label>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="flex-1 h-8 text-xs"
                    onClick={handleAddReminder}
                  >
                    Add Reminder
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 h-8 text-xs"
                    onClick={() => setShowReminderForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Reminders List */}
        {reminders.length > 0 && (
          <div className="mt-3 pt-3 border-t border-muted">
            <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
              <Bell className="h-3 w-3" />
              Active Reminders
            </h4>
            <div className="space-y-2 max-h-24 overflow-y-auto">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between bg-muted/30 p-2 rounded-md">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleReminder(reminder.id, !reminder.enabled)}
                      className="p-1 rounded hover:bg-muted"
                    >
                      {reminder.enabled ? (
                        <Bell className="h-3 w-3 text-green-500" />
                      ) : (
                        <BellOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                    <div>
                      <div className="text-xs font-medium">Every {reminder.intervalMinutes} minutes</div>
                      <div className="text-[0.65rem] text-muted-foreground">{reminder.message}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteReminder(reminder.id)}
                    className="text-destructive hover:text-destructive/80 p-1"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};