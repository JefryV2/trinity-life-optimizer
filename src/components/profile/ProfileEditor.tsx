import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Save, Camera, Mail, Calendar, MapPin, Calculator, Activity } from 'lucide-react';
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  bio: string;
  location: string;
  birth_date: string;
  timezone: string;
}

interface HealthProfileData {
  height_cm: number;
  weight_kg: number;
  gender: string;
  birth_date: string;
  activity_level: string;
  goal_type: string;
}

export function ProfileEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData>({
    first_name: '',
    last_name: '',
    email: '',
    bio: '',
    location: '',
    birth_date: '',
    timezone: 'UTC'
  });
  const [healthProfile, setHealthProfile] = useState<HealthProfileData>({
    height_cm: 0,
    weight_kg: 0,
    gender: '',
    birth_date: '',
    activity_level: 'moderate',
    goal_type: 'maintain'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasHealthChanges, setHasHealthChanges] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchHealthProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(prev => ({
        ...prev,
        first_name: data?.first_name || '',
        last_name: data?.last_name || '',
        email: user?.email || ''
      }));
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };



  const fetchHealthProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles_health')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching health profile:', error);
        return;
      }

      if (data) {
        setHealthProfile({
          height_cm: data.height_cm || 0,
          weight_kg: data.weight_kg || 0,
          gender: data.gender || '',
          birth_date: data.birth_date || '',
          activity_level: data.activity_level || 'moderate',
          goal_type: data.goal_type || 'maintain'
        });
      }
    } catch (error) {
      console.error('Error fetching health profile:', error);
    }
  };

  const updateProfile = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateHealthProfile = (field: keyof HealthProfileData, value: string | number) => {
    setHealthProfile(prev => ({ ...prev, [field]: value }));
    setHasHealthChanges(true);
  };



  const saveProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          first_name: profile.first_name,
          last_name: profile.last_name
        });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully"
      });

      setHasChanges(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error saving profile",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveHealthProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Calculate BMR and adjust for goals (only if we have required data)
      const calculateBMR = () => {
        // Only calculate if we have all required data
        if (healthProfile.height_cm && healthProfile.weight_kg && healthProfile.birth_date && healthProfile.gender) {
          const age = new Date().getFullYear() - new Date(healthProfile.birth_date).getFullYear();
          
          // Harris-Benedict Equation
          let bmr;
          if (healthProfile.gender === 'male') {
            bmr = 88.362 + (13.397 * healthProfile.weight_kg) + (4.799 * healthProfile.height_cm) - (5.677 * age);
          } else {
            bmr = 447.593 + (9.247 * healthProfile.weight_kg) + (3.098 * healthProfile.height_cm) - (4.330 * age);
          }
          
          // Activity level multiplier
          const multipliers = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            very_active: 1.9
          };
          
          const tdee = bmr * multipliers[healthProfile.activity_level as keyof typeof multipliers];
          
          // Adjust for goal
          if (healthProfile.goal_type === 'lose') {
            return Math.round(tdee - 500); // 500 calorie deficit
          } else if (healthProfile.goal_type === 'gain') {
            return Math.round(tdee + 500); // 500 calorie surplus
          }
          return Math.round(tdee);
        } else {
          // If we don't have all required data, return a default value
          return 2000;
        }
      };

      // Calculate calories based on available data
      const calculatedCalories = calculateBMR();

      const { error } = await supabase
        .from('user_profiles_health')
        .upsert({
          user_id: user.id,
          height_cm: healthProfile.height_cm || null,
          weight_kg: healthProfile.weight_kg || null,
          gender: healthProfile.gender,
          birth_date: healthProfile.birth_date || null,
          activity_level: healthProfile.activity_level,
          goal_type: healthProfile.goal_type,
          daily_caloric_target: calculatedCalories
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Health profile updated",
        description: `Health profile updated successfully.`
      });

      setHasHealthChanges(false);
      
      // Trigger a refresh of health data in other components
      window.dispatchEvent(new CustomEvent('healthProfileUpdated'));
    } catch (error) {
      console.error('Error saving health profile:', error);
      toast({
        title: "Error saving health profile",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateBMI = () => {
    if (!healthProfile.height_cm || !healthProfile.weight_kg) return 0;
    const heightM = healthProfile.height_cm / 100;
    return Math.round((healthProfile.weight_kg / (heightM * heightM)) * 10) / 10;
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-600' };
    if (bmi < 25) return { category: 'Normal weight', color: 'text-green-600' };
    if (bmi < 30) return { category: 'Overweight', color: 'text-orange-600' };
    return { category: 'Obese', color: 'text-red-600' };
  };

  const calculateAge = () => {
    if (!healthProfile.birth_date) return 0;
    const today = new Date();
    const birthDate = new Date(healthProfile.birth_date);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  const bmi = calculateBMI();
  const bmiInfo = getBMICategory(bmi);
  const age = calculateAge();

  return (
    <div className="space-y-6">
      {/* Profile Picture */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Picture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl bg-primary/20">
                {profile.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => toast({ title: "Photo upload", description: "Photo upload feature coming soon!" })}
              >
                <Camera className="h-4 w-4 mr-2" />
                Change Photo
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                JPG, PNG or GIF. Max size 5MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Update your personal details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">First Name</Label>
              <Input
                id="first-name"
                value={profile.first_name}
                onChange={(e) => {
                  updateProfile('first_name', e.target.value);
                  setHasChanges(true);
                }}
                placeholder=""
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name</Label>
              <Input
                id="last-name"
                value={profile.last_name}
                onChange={(e) => {
                  updateProfile('last_name', e.target.value);
                  setHasChanges(true);
                }}
                placeholder=""
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => {
                updateProfile('bio', e.target.value);
                setHasChanges(true);
              }}
              placeholder=""
              className="min-h-[80px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Gender Identity */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Gender Identity
          </CardTitle>
          <CardDescription>
            This helps personalize your health recommendations and calculations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gender">Gender Identity</Label>
            <Select value={healthProfile.gender} onValueChange={(value) => {
              updateHealthProfile('gender', value);
              setHasHealthChanges(true);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select your gender identity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">👨 Male</SelectItem>
                <SelectItem value="female">👩 Female</SelectItem>
                <SelectItem value="other">🏳️‍🌈 Non-binary/Other</SelectItem>
                <SelectItem value="prefer-not-to-say">🤫 Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Health Information */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Health Information
          </CardTitle>
          <CardDescription>
            Essential health data for personalized recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="health-birth-date">Birth Date</Label>
            <Input
              id="health-birth-date"
              type="date"
              value={healthProfile.birth_date}
              onChange={(e) => {
                updateHealthProfile('birth_date', e.target.value);
                setHasHealthChanges(true);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                placeholder=""
                value={healthProfile.height_cm || ''}
                onChange={(e) => {
                  updateHealthProfile('height_cm', Number(e.target.value));
                  setHasHealthChanges(true);
                }}
                className="text-center"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder=""
                value={healthProfile.weight_kg || ''}
                onChange={(e) => {
                  updateHealthProfile('weight_kg', Number(e.target.value));
                  setHasHealthChanges(true);
                }}
                className="text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activity-level">Activity Level</Label>
              <Select value={healthProfile.activity_level} onValueChange={(value) => {
                updateHealthProfile('activity_level', value);
                setHasHealthChanges(true);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">🛋️ Sedentary</SelectItem>
                  <SelectItem value="light">🚶 Light Activity</SelectItem>
                  <SelectItem value="moderate">🏃 Moderate Activity</SelectItem>
                  <SelectItem value="active">💪 Very Active</SelectItem>
                  <SelectItem value="very_active">🔥 Extremely Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-type">Health Goal</Label>
              <Select value={healthProfile.goal_type} onValueChange={(value) => {
                updateHealthProfile('goal_type', value);
                setHasHealthChanges(true);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose">📉 Lose Weight</SelectItem>
                  <SelectItem value="maintain">⚖️ Maintain Weight</SelectItem>
                  <SelectItem value="gain">📈 Gain Weight</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Health Metrics Display */}
          {bmi > 0 && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Health Metrics</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-card rounded-lg">
                  <div className="text-lg font-bold text-primary">BMI: {bmi}</div>
                  <div className={`text-xs ${bmiInfo.color} mt-1`}>{bmiInfo.category}</div>
                </div>
                <div className="text-center p-3 bg-card rounded-lg">
                  <div className="text-lg font-bold text-primary">{age}</div>
                  <div className="text-xs text-muted-foreground mt-1">Years Old</div>
                </div>
                <div className="text-center p-3 bg-card rounded-lg">
                  <div className="text-lg font-bold text-primary">
                    {healthProfile.gender === 'female' ? '♀️' : 
                     healthProfile.gender === 'male' ? '♂️' : 
                     healthProfile.gender === 'other' ? '🏳️‍🌈' : 
                     healthProfile.gender === 'prefer-not-to-say' ? '🤫' : '👤'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 capitalize">
                    {healthProfile.gender === 'prefer-not-to-say' ? 'Not specified' : healthProfile.gender}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Health Profile Button */}
          <Button 
            onClick={saveHealthProfile}
            disabled={!hasHealthChanges || isLoading}
            className="w-full ios-button-primary"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Health Profile'}
          </Button>
        </CardContent>
      </Card>

      {/* Additional Details */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle>Additional Details</CardTitle>
          <CardDescription>
            Optional information to personalize your experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </Label>
            <Input
              id="location"
              value={profile.location}
              onChange={(e) => {
                updateProfile('location', e.target.value);
                setHasChanges(true);
              }}
              placeholder=""
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Birth Date
            </Label>
            <Input
              id="birth-date"
              type="date"
              value={profile.birth_date}
              onChange={(e) => {
                updateProfile('birth_date', e.target.value);
                setHasChanges(true);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={profile.timezone} onValueChange={(value) => {
              updateProfile('timezone', value);
              setHasChanges(true);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button 
        onClick={saveProfile}
        disabled={!hasChanges || isLoading}
        className="w-full ios-button-primary"
      >
        <Save className="h-4 w-4 mr-2" />
        {isLoading ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}