import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Clock,
  Heart,
  Dumbbell,
  Moon,
  Utensils,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  healthReminders: boolean;
  exerciseReminders: boolean;
  sleepReminders: boolean;
  mealReminders: boolean;
  reminderTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
}
export function NotificationSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>({
    pushNotifications: true,
    emailNotifications: false,
    healthReminders: true,
    exerciseReminders: true,
    sleepReminders: true,
    mealReminders: false,
    reminderTime: "09:00",
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
  });
  const [isLoading, setIsLoading] = useState(false);
  const saveSettings = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated",
      });
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const updateSetting = (
    key: keyof NotificationSettings,
    value: boolean | string,
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };
  return (
    <div className="space-y-6">
      {/* General Notifications */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> General Notifications
          </CardTitle>
          <CardDescription>
            Control how you receive notifications from Auxo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Push Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Receive notifications on your device
              </div>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={(checked) =>
                updateSetting("pushNotifications", checked)
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Email Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Receive weekly summaries via email
              </div>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) =>
                updateSetting("emailNotifications", checked)
              }
            />
          </div>
        </CardContent>
      </Card>
      {/* Health Reminders */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" /> Health Reminders
          </CardTitle>
          <CardDescription>
            Set up reminders for your health activities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-950/20 rounded-lg">
                <Heart className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <Label className="text-base">Health Check-ins</Label>
                <div className="text-sm text-muted-foreground">
                  Daily wellness reminders
                </div>
              </div>
            </div>
            <Switch
              checked={settings.healthReminders}
              onCheckedChange={(checked) =>
                updateSetting("healthReminders", checked)
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-950/20 rounded-lg">
                <Dumbbell className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <Label className="text-base">Exercise Reminders</Label>
                <div className="text-sm text-muted-foreground">
                  Workout and activity prompts
                </div>
              </div>
            </div>
            <Switch
              checked={settings.exerciseReminders}
              onCheckedChange={(checked) =>
                updateSetting("exerciseReminders", checked)
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-950/20 rounded-lg">
                <Moon className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <Label className="text-base">Sleep Reminders</Label>
                <div className="text-sm text-muted-foreground">
                  Bedtime and wake-up alerts
                </div>
              </div>
            </div>
            <Switch
              checked={settings.sleepReminders}
              onCheckedChange={(checked) =>
                updateSetting("sleepReminders", checked)
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-950/20 rounded-lg">
                <Utensils className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <Label className="text-base">Meal Reminders</Label>
                <div className="text-sm text-muted-foreground">
                  Nutrition tracking prompts
                </div>
              </div>
            </div>
            <Switch
              checked={settings.mealReminders}
              onCheckedChange={(checked) =>
                updateSetting("mealReminders", checked)
              }
            />
          </div>
        </CardContent>
      </Card>
      {/* Timing Settings */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Timing Settings
          </CardTitle>
          <CardDescription>
            Customize when you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Default Reminder Time</Label>
            <Select
              value={settings.reminderTime}
              onValueChange={(value) => updateSetting("reminderTime", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="07:00">7:00 AM</SelectItem>
                <SelectItem value="08:00">8:00 AM</SelectItem>
                <SelectItem value="09:00">9:00 AM</SelectItem>
                <SelectItem value="10:00">10:00 AM</SelectItem>
                <SelectItem value="18:00">6:00 PM</SelectItem>
                <SelectItem value="19:00">7:00 PM</SelectItem>
                <SelectItem value="20:00">8:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quiet Hours Start</Label>
              <Select
                value={settings.quietHoursStart}
                onValueChange={(value) =>
                  updateSetting("quietHoursStart", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="21:00">9:00 PM</SelectItem>
                  <SelectItem value="22:00">10:00 PM</SelectItem>
                  <SelectItem value="23:00">11:00 PM</SelectItem>
                  <SelectItem value="00:00">12:00 AM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quiet Hours End</Label>
              <Select
                value={settings.quietHoursEnd}
                onValueChange={(value) => updateSetting("quietHoursEnd", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="06:00">6:00 AM</SelectItem>
                  <SelectItem value="07:00">7:00 AM</SelectItem>
                  <SelectItem value="08:00">8:00 AM</SelectItem>
                  <SelectItem value="09:00">9:00 AM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Save Button */}
      <Button
        onClick={saveSettings}
        disabled={isLoading}
        className="w-full ios-button-primary"
      >
        <Save className="h-4 w-4 mr-2" />
        {isLoading ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
