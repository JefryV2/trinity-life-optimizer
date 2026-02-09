// @ts-nocheck
// This is an edge function that calculates personalized health goals based on user measurements
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const { user_id } = await req.json()
    
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Fetch user profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', user_id)
      .single()

    if (profileError) {
      return new Response(JSON.stringify({ error: 'Error fetching profile: ' + profileError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Fetch user health profile data
    const { data: healthProfileData, error: healthProfileError } = await supabase
      .from('user_profiles_health')
      .select('height_cm, weight_kg, gender, birth_date, activity_level, goal_type')
      .eq('user_id', user_id)
      .single()

    if (healthProfileError) {
      return new Response(JSON.stringify({ error: 'Error fetching health profile: ' + healthProfileError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Calculate personalized goals
    const calculatedGoals = calculatePersonalizedGoals(healthProfileData)

    // Store the calculated goals in the health_goals table
    const { error: insertError } = await supabase
      .from('health_goals')
      .insert({
        user_id,
        title: 'Personalized Daily Calorie Goal',
        goal_type: 'diet',
        target_value: calculatedGoals.calorieGoal,
        unit: 'calories',
        description: `Personalized daily calorie goal based on your profile`,
        status: 'active'
      })

    if (insertError) {
      console.error('Error inserting calorie goal:', insertError)
    }

    // Calculate water goal based on weight
    const waterGoal = Math.round((healthProfileData.weight_kg || 70) * 30) // 30ml per kg

    return new Response(JSON.stringify({
      success: true,
      profile: profileData,
      healthProfile: healthProfileData,
      calculatedGoals,
      waterGoal
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error in calculate-goals function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

function calculatePersonalizedGoals(healthProfile) {
  const { height_cm, weight_kg, gender, birth_date, activity_level, goal_type } = healthProfile || {}
  
  // Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
  let bmr = 0
  if (gender === 'male') {
    bmr = 10 * (weight_kg || 70) + 6.25 * (height_cm || 170) - 5 * (birth_date ? new Date().getFullYear() - new Date(birth_date).getFullYear() : 30) + 5
  } else if (gender === 'female') {
    bmr = 10 * (weight_kg || 60) + 6.25 * (height_cm || 165) - 5 * (birth_date ? new Date().getFullYear() - new Date(birth_date).getFullYear() : 30) - 161
  } else {
    // Default calculation if gender is not specified
    bmr = 10 * (weight_kg || 65) + 6.25 * (height_cm || 170) - 5 * (birth_date ? new Date().getFullYear() - new Date(birth_date).getFullYear() : 30) - 5
  }

  // Calculate TDEE (Total Daily Energy Expenditure) based on activity level
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    'very_active': 1.9
  }
  
  const activityMultiplier = activityMultipliers[activity_level] || 1.55
  const tdee = bmr * activityMultiplier

  // Adjust calories based on goal
  let calorieGoal = tdee
  if (goal_type === 'lose') {
    calorieGoal = tdee - 500 // 500 calorie deficit for weight loss
  } else if (goal_type === 'gain') {
    calorieGoal = tdee + 500 // 500 calorie surplus for weight gain
  }
  // For 'maintain', keep the TDEE as is

  // Calculate other personalized metrics
  const proteinGoal = Math.round((weight_kg || 70) * 1.6) // 1.6g per kg body weight
  const stepGoal = activity_level === 'sedentary' ? 5000 : activity_level === 'light' ? 7500 : activity_level === 'moderate' ? 10000 : activity_level === 'active' ? 12500 : 15000

  return {
    calorieGoal: Math.round(calorieGoal),
    proteinGoal,
    stepGoal,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee)
  }
}