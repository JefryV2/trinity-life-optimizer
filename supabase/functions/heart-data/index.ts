// @ts-nocheck
// This is an edge function that handles heart rate data from wearables
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
    const { user_id, heart_rate_data, device_type, timestamp } = await req.json()
    
    if (!user_id || !heart_rate_data) {
      return new Response(JSON.stringify({ error: 'user_id and heart_rate_data are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Validate heart rate data
    if (!Array.isArray(heart_rate_data) || heart_rate_data.length === 0) {
      return new Response(JSON.stringify({ error: 'heart_rate_data must be a non-empty array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Prepare heart rate entries for insertion
    const heartRateEntries = heart_rate_data.map(entry => ({
      user_id,
      heart_rate: entry.bpm || entry.heart_rate,
      timestamp: entry.timestamp || timestamp || new Date().toISOString(),
      source_device: device_type || 'unknown',
      activity_type: entry.activity_type || 'general',
      confidence: entry.confidence || 100
    }))

    // Insert heart rate data into a new table
    // Note: You'll need to create this table in your database
    const { error: insertError } = await supabase
      .from('heart_rate_data')
      .insert(heartRateEntries)

    if (insertError) {
      console.error('Error inserting heart rate data:', insertError)
      return new Response(JSON.stringify({ error: 'Error storing heart rate data: ' + insertError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Calculate some statistics from the heart rate data
    const bpmValues = heartRateEntries.map(entry => entry.heart_rate).filter(bpm => bpm !== null && bpm !== undefined)
    const avgHeartRate = bpmValues.length > 0 ? Math.round(bpmValues.reduce((sum, bpm) => sum + bpm, 0) / bpmValues.length) : 0
    const maxHeartRate = bpmValues.length > 0 ? Math.max(...bpmValues) : 0
    const minHeartRate = bpmValues.length > 0 ? Math.min(...bpmValues) : 0

    // Update user's resting heart rate in their profile if this is resting data
    if (heartRateEntries.some(entry => entry.activity_type === 'resting')) {
      const restingEntries = heartRateEntries.filter(entry => entry.activity_type === 'resting')
      if (restingEntries.length > 0) {
        const avgRestingHR = Math.round(restingEntries.reduce((sum, entry) => sum + entry.heart_rate, 0) / restingEntries.length)
        
        const { error: updateError } = await supabase
          .from('user_profiles_health')
          .update({ resting_heart_rate: avgRestingHR })
          .eq('user_id', user_id)
          
        if (updateError) {
          console.warn('Could not update resting heart rate:', updateError.message)
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `${heartRateEntries.length} heart rate entries processed`,
      statistics: {
        average_heart_rate: avgHeartRate,
        max_heart_rate: maxHeartRate,
        min_heart_rate: minHeartRate,
        entries_count: heartRateEntries.length
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error in heart-data function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})