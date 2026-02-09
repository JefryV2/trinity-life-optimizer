import { supabase } from '@/integrations/supabase/client';

/**
 * Calculate personalized health goals based on user measurements
 */
export const calculatePersonalizedGoals = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    // Call the Supabase edge function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-goals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: user.id }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to calculate goals');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error calculating personalized goals:', error);
    throw error;
  }
};

/**
 * Send heart rate data to the wearable integration function
 */
export const sendHeartRateData = async (heartRateData: {
  bpm: number;
  timestamp?: string;
  activity_type?: string;
  confidence?: number;
}[]) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/heart-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id,
        heart_rate_data: heartRateData,
        device_type: 'web_app' // Default device type, can be changed based on source
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send heart rate data');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error sending heart rate data:', error);
    throw error;
  }
};

/**
 * Get a user's access token for authenticating with edge functions
 */
const getAccessToken = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
};

/**
 * Calculate daily calorie goal based on user profile (client-side fallback)
 */
export const calculateCalorieGoal = (profile: {
  height_cm?: number | null;
  weight_kg?: number | null;
  gender?: string | null;
  birth_date?: string | null;
  activity_level?: string | null;
  goal_type?: string | null;
}): {
  calorieGoal: number;
  proteinGoal: number;
  stepGoal: number;
  bmr: number;
  tdee: number;
} => {
  const { height_cm, weight_kg, gender, birth_date, activity_level, goal_type } = profile;
  
  // Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
  let bmr = 0;
  if (gender === 'male') {
    bmr = 10 * (weight_kg || 70) + 6.25 * (height_cm || 170) - 5 * (birth_date ? new Date().getFullYear() - new Date(birth_date).getFullYear() : 30) + 5;
  } else if (gender === 'female') {
    bmr = 10 * (weight_kg || 60) + 6.25 * (height_cm || 165) - 5 * (birth_date ? new Date().getFullYear() - new Date(birth_date).getFullYear() : 30) - 161;
  } else {
    // Default calculation if gender is not specified
    bmr = 10 * (weight_kg || 65) + 6.25 * (height_cm || 170) - 5 * (birth_date ? new Date().getFullYear() - new Date(birth_date).getFullYear() : 30) - 5;
  }

  // Calculate TDEE (Total Daily Energy Expenditure) based on activity level
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    'very_active': 1.9
  };
  
  const activityMultiplier = activityMultipliers[activity_level as keyof typeof activityMultipliers] || 1.55;
  const tdee = bmr * activityMultiplier;

  // Adjust calories based on goal
  let calorieGoal = tdee;
  if (goal_type === 'lose') {
    calorieGoal = tdee - 500; // 500 calorie deficit for weight loss
  } else if (goal_type === 'gain') {
    calorieGoal = tdee + 500; // 500 calorie surplus for weight gain
  }
  // For 'maintain', keep the TDEE as is

  // Calculate other personalized metrics
  const proteinGoal = Math.round((weight_kg || 70) * 1.6); // 1.6g per kg body weight
  const stepGoal = activity_level === 'sedentary' ? 5000 : 
                   activity_level === 'light' ? 7500 : 
                   activity_level === 'moderate' ? 10000 : 
                   activity_level === 'active' ? 12500 : 15000;

  return {
    calorieGoal: Math.round(calorieGoal),
    proteinGoal,
    stepGoal,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee)
  };
};

/**
 * Get user's heart rate statistics
 */
export const getHeartRateStats = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    const { data, error } = await supabase
      .from('heart_rate_data')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(100); // Get last 100 readings

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        avgHeartRate: null,
        restingHeartRate: null,
        maxHeartRate: null,
        minHeartRate: null,
        lastReading: null
      };
    }

    // Calculate statistics
    const heartRates = data.map(record => record.heart_rate);
    const avgHeartRate = Math.round(heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length);
    
    const restingReadings = data
      .filter(record => record.activity_type === 'resting')
      .map(record => record.heart_rate);
    
    const restingHeartRate = restingReadings.length > 0 
      ? Math.round(restingReadings.reduce((sum, hr) => sum + hr, 0) / restingReadings.length)
      : null;

    const maxHeartRate = Math.max(...heartRates);
    const minHeartRate = Math.min(...heartRates);

    return {
      avgHeartRate,
      restingHeartRate,
      maxHeartRate,
      minHeartRate,
      lastReading: data[0] // Most recent reading
    };
  } catch (error) {
    console.error('Error fetching heart rate stats:', error);
    throw error;
  }
};