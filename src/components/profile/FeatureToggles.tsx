import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const FeatureToggles = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [featureFlags, setFeatureFlags] = useState({
    enableHealthTracking: true,
    enableWealthTracking: true,
    enableRelationsTracking: true,
    enableNotifications: true,
    enableMentalHealth: true,
    enableFitnessTracking: true,
    enableNutritionTracking: true,
    enableFinancialManagement: true,
    enableInvestmentTracking: true,
    enableRelationshipTracking: true,
    enableGratitudeJournal: true,
    enableGoalSetting: true,
  });

  useEffect(() => {
    if (user) {
      fetchFeatureFlags();
    }
  }, [user]);

  const fetchFeatureFlags = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('data_preferences')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.data_preferences && typeof data.data_preferences === 'object' && data.data_preferences !== null) {
        setFeatureFlags(prev => ({
          ...prev,
          ...(data.data_preferences as object)
        }));
      }
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      toast({
        title: "Error",
        description: "Failed to load feature preferences",
        variant: "destructive"
      });
    }
  };

  const updateFeatureFlag = async (flagName: keyof typeof featureFlags, value: boolean) => {
    try {
      const updatedFlags = {
        ...featureFlags,
        [flagName]: value
      };

      setFeatureFlags(updatedFlags);

      // Save to database
      const { error } = await supabase
        .from('profiles')
        .update({
          data_preferences: updatedFlags
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Preferences saved",
        description: "Your feature preferences have been updated."
      });
    } catch (error) {
      console.error('Error updating feature flag:', error);
      toast({
        title: "Error",
        description: "Failed to update feature preference",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="text-lg">Feature Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="health-tracking">Health Tracking</Label>
            <p className="text-xs text-muted-foreground">Track fitness, nutrition, and sleep</p>
          </div>
          <Switch
            id="health-tracking"
            checked={featureFlags.enableHealthTracking}
            onCheckedChange={(checked) => updateFeatureFlag('enableHealthTracking', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="fitness-tracking">Fitness Tracking</Label>
            <p className="text-xs text-muted-foreground">Track workouts and exercises</p>
          </div>
          <Switch
            id="fitness-tracking"
            checked={featureFlags.enableFitnessTracking}
            onCheckedChange={(checked) => updateFeatureFlag('enableFitnessTracking', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="nutrition-tracking">Nutrition Tracking</Label>
            <p className="text-xs text-muted-foreground">Track meals and nutrients</p>
          </div>
          <Switch
            id="nutrition-tracking"
            checked={featureFlags.enableNutritionTracking}
            onCheckedChange={(checked) => updateFeatureFlag('enableNutritionTracking', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="wealth-tracking">Wealth Tracking</Label>
            <p className="text-xs text-muted-foreground">Manage finances and investments</p>
          </div>
          <Switch
            id="wealth-tracking"
            checked={featureFlags.enableWealthTracking}
            onCheckedChange={(checked) => updateFeatureFlag('enableWealthTracking', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="financial-management">Financial Management</Label>
            <p className="text-xs text-muted-foreground">Budgets and expense tracking</p>
          </div>
          <Switch
            id="financial-management"
            checked={featureFlags.enableFinancialManagement}
            onCheckedChange={(checked) => updateFeatureFlag('enableFinancialManagement', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="investment-tracking">Investment Tracking</Label>
            <p className="text-xs text-muted-foreground">Track investment portfolios</p>
          </div>
          <Switch
            id="investment-tracking"
            checked={featureFlags.enableInvestmentTracking}
            onCheckedChange={(checked) => updateFeatureFlag('enableInvestmentTracking', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="relations-tracking">Relations Tracking</Label>
            <p className="text-xs text-muted-foreground">Track relationships and connections</p>
          </div>
          <Switch
            id="relations-tracking"
            checked={featureFlags.enableRelationsTracking}
            onCheckedChange={(checked) => updateFeatureFlag('enableRelationsTracking', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="relationship-tracking">Relationship Tracking</Label>
            <p className="text-xs text-muted-foreground">Track relationship interactions</p>
          </div>
          <Switch
            id="relationship-tracking"
            checked={featureFlags.enableRelationshipTracking}
            onCheckedChange={(checked) => updateFeatureFlag('enableRelationshipTracking', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="gratitude-journal">Gratitude Journal</Label>
            <p className="text-xs text-muted-foreground">Daily gratitude entries</p>
          </div>
          <Switch
            id="gratitude-journal"
            checked={featureFlags.enableGratitudeJournal}
            onCheckedChange={(checked) => updateFeatureFlag('enableGratitudeJournal', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="goal-setting">Goal Setting</Label>
            <p className="text-xs text-muted-foreground">Set and track personal goals</p>
          </div>
          <Switch
            id="goal-setting"
            checked={featureFlags.enableGoalSetting}
            onCheckedChange={(checked) => updateFeatureFlag('enableGoalSetting', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notifications">Enable Notifications</Label>
            <p className="text-xs text-muted-foreground">Receive important reminders</p>
          </div>
          <Switch
            id="notifications"
            checked={featureFlags.enableNotifications}
            onCheckedChange={(checked) => updateFeatureFlag('enableNotifications', checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};