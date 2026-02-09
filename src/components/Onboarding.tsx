import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Step 1: Basic Info
  const [basicInfo, setBasicInfo] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: ''
  });

  // Step 2: Health Goals
  const [healthGoals, setHealthGoals] = useState({
    height: '',
    weight: '',
    targetWeight: '',
    goalType: 'maintain',
    activityLevel: 'moderate',
    dailyCaloricTarget: 2000
  });

  // Step 3: Feature Preferences
  const [featurePreferences, setFeaturePreferences] = useState({
    enableHealthTracking: true,
    enableWealthTracking: true,
    enableRelationsTracking: true,
    enableNotifications: true,
    receiveEmails: false
  });

  const totalSteps = 3;

  const handleNext = async () => {
    if (step === 1) {
      // Validate and save basic info
      if (!basicInfo.firstName || !basicInfo.lastName) {
        alert('Please enter your first and last name');
        return;
      }
      
      // Update user profile
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            first_name: basicInfo.firstName,
            last_name: basicInfo.lastName
          }, {
            onConflict: 'user_id'
          });
        
        if (error) {
          console.error('Error updating profile:', error);
          alert('Error saving profile information');
          return;
        }
      }
    } else if (step === 2) {
      // Validate and save health goals
      if (user) {
        const { error } = await supabase
          .from('user_profiles_health')
          .upsert({
            user_id: user.id,
            height_cm: parseInt(healthGoals.height) || null,
            weight_kg: parseFloat(healthGoals.weight) || null,
            target_weight_kg: parseFloat(healthGoals.targetWeight) || null,
            goal_type: healthGoals.goalType,
            activity_level: healthGoals.activityLevel,
            daily_caloric_target: healthGoals.dailyCaloricTarget,
            gender: basicInfo.gender,
            birth_date: basicInfo.age ? new Date(new Date().getFullYear() - parseInt(basicInfo.age)).toISOString().split('T')[0] : null
          }, {
            onConflict: 'user_id'
          });
        
        if (error) {
          console.error('Error updating health profile:', error);
          alert('Error saving health profile');
          return;
        }
      }
    }
    
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Complete onboarding
      finishOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const finishOnboarding = async () => {
    setLoading(true);
    
    try {
      // Mark onboarding as completed in user metadata
      if (user) {
        const { error } = await supabase.auth.updateUser({
          data: {
            onboarding_completed: true
          }
        });
        
        if (error) throw error;
      }
      
      // Navigate to home
      navigate('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Error completing onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Welcome to TrinityOS!</h2>
              <p className="text-muted-foreground mt-2">Let's get to know you better</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={basicInfo.firstName}
                  onChange={(e) => setBasicInfo({...basicInfo, firstName: e.target.value})}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={basicInfo.lastName}
                  onChange={(e) => setBasicInfo({...basicInfo, lastName: e.target.value})}
                  placeholder="Doe"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={basicInfo.age}
                  onChange={(e) => setBasicInfo({...basicInfo, age: e.target.value})}
                  placeholder="25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={basicInfo.gender} onValueChange={(value) => setBasicInfo({...basicInfo, gender: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Set Your Health Goals</h2>
              <p className="text-muted-foreground mt-2">Help us customize your experience</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={healthGoals.height}
                  onChange={(e) => setHealthGoals({...healthGoals, height: e.target.value})}
                  placeholder="170"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Current Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={healthGoals.weight}
                  onChange={(e) => setHealthGoals({...healthGoals, weight: e.target.value})}
                  placeholder="70"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="targetWeight">Target Weight (kg)</Label>
              <Input
                id="targetWeight"
                type="number"
                value={healthGoals.targetWeight}
                onChange={(e) => setHealthGoals({...healthGoals, targetWeight: e.target.value})}
                placeholder="65"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Goal Type</Label>
              <RadioGroup 
                value={healthGoals.goalType} 
                onValueChange={(value) => setHealthGoals({...healthGoals, goalType: value as any})}
                className="grid grid-cols-3 gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lose" id="lose" />
                  <Label htmlFor="lose">Lose Weight</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="maintain" id="maintain" />
                  <Label htmlFor="maintain">Maintain</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="gain" id="gain" />
                  <Label htmlFor="gain">Gain Weight</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>Activity Level</Label>
              <RadioGroup 
                value={healthGoals.activityLevel} 
                onValueChange={(value) => setHealthGoals({...healthGoals, activityLevel: value as any})}
              >
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sedentary" id="sedentary" />
                    <Label htmlFor="sedentary">Sedentary (little or no exercise)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light">Light (exercise 1-3 days/week)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="moderate" id="moderate" />
                    <Label htmlFor="moderate">Moderate (exercise 3-5 days/week)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="active" id="active" />
                    <Label htmlFor="active">Active (exercise 6-7 days/week)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="very_active" id="very_active" />
                    <Label htmlFor="very_active">Very Active (hard exercise daily)</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Customize Your Experience</h2>
              <p className="text-muted-foreground mt-2">Choose which features to enable</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Health Tracking</Label>
                  <p className="text-sm text-muted-foreground">Track fitness, nutrition, and sleep</p>
                </div>
                <Checkbox 
                  checked={featurePreferences.enableHealthTracking}
                  onCheckedChange={(checked) => setFeaturePreferences({...featurePreferences, enableHealthTracking: Boolean(checked)})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Wealth Tracking</Label>
                  <p className="text-sm text-muted-foreground">Manage finances and investments</p>
                </div>
                <Checkbox 
                  checked={featurePreferences.enableWealthTracking}
                  onCheckedChange={(checked) => setFeaturePreferences({...featurePreferences, enableWealthTracking: Boolean(checked)})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relations Tracking</Label>
                  <p className="text-sm text-muted-foreground">Track relationships and connections</p>
                </div>
                <Checkbox 
                  checked={featurePreferences.enableRelationsTracking}
                  onCheckedChange={(checked) => setFeaturePreferences({...featurePreferences, enableRelationsTracking: Boolean(checked)})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive important reminders</p>
                </div>
                <Checkbox 
                  checked={featurePreferences.enableNotifications}
                  onCheckedChange={(checked) => setFeaturePreferences({...featurePreferences, enableNotifications: Boolean(checked)})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Receive Emails</Label>
                  <p className="text-sm text-muted-foreground">Marketing and product updates</p>
                </div>
                <Checkbox 
                  checked={featurePreferences.receiveEmails}
                  onCheckedChange={(checked) => setFeaturePreferences({...featurePreferences, receiveEmails: Boolean(checked)})}
                />
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>You can always change these preferences later in your profile settings.</p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Setup Your TrinityOS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round((step / totalSteps) * 100)}% Complete</span>
            </div>
            <Progress value={(step / totalSteps) * 100} className="h-2" />
          </div>
          
          {renderStep()}
          
          <div className="flex justify-between mt-8">
            <Button 
              variant="outline" 
              onClick={handleBack}
              disabled={step === 1}
            >
              Back
            </Button>
            <Button 
              onClick={handleNext}
              disabled={loading}
            >
              {step === totalSteps ? 'Complete Setup' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;