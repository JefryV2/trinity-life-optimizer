export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      exercise_records: {
        Row: {
          calories_burned: number | null
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          exercise_name: string
          exercise_type: string | null
          id: string
          intensity: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          calories_burned?: number | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          exercise_name: string
          exercise_type?: string | null
          id?: string
          intensity?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          calories_burned?: number | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          exercise_name?: string
          exercise_type?: string | null
          id?: string
          intensity?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      food_entries: {
        Row: {
          calories_per_serving: number | null
          carbs_g: number | null
          consumed_at: string | null
          created_at: string
          fat_g: number | null
          fiber_g: number | null
          food_name: string
          id: string
          meal_type: string | null
          protein_g: number | null
          servings: number | null
          sodium_mg: number | null
          sugar_g: number | null
          total_calories: number | null
          user_id: string
        }
        Insert: {
          calories_per_serving?: number | null
          carbs_g?: number | null
          consumed_at?: string | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          food_name: string
          id?: string
          meal_type?: string | null
          protein_g?: number | null
          servings?: number | null
          sodium_mg?: number | null
          sugar_g?: number | null
          total_calories?: number | null
          user_id: string
        }
        Update: {
          calories_per_serving?: number | null
          carbs_g?: number | null
          consumed_at?: string | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          food_name?: string
          id?: string
          meal_type?: string | null
          protein_g?: number | null
          servings?: number | null
          sodium_mg?: number | null
          sugar_g?: number | null
          total_calories?: number | null
          user_id?: string
        }
        Relationships: []
      }
      health_goals: {
        Row: {
          created_at: string
          current_value: number | null
          description: string | null
          goal_type: string | null
          id: string
          status: string | null
          target_date: string | null
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          description?: string | null
          goal_type?: string | null
          id?: string
          status?: string | null
          target_date?: string | null
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          description?: string | null
          goal_type?: string | null
          id?: string
          status?: string | null
          target_date?: string | null
          target_value?: number | null
          title?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_reminders: {
        Row: {
          created_at: string
          days_of_week: number[] | null
          id: string
          is_active: boolean | null
          message: string | null
          reminder_type: string | null
          scheduled_time: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[] | null
          id?: string
          is_active?: boolean | null
          message?: string | null
          reminder_type?: string | null
          scheduled_time?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[] | null
          id?: string
          is_active?: boolean | null
          message?: string | null
          reminder_type?: string | null
          scheduled_time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      menstrual_cycles: {
        Row: {
          created_at: string
          cycle_end_date: string | null
          cycle_length_days: number | null
          cycle_start_date: string
          flow_intensity: string | null
          id: string
          mood_rating: number | null
          notes: string | null
          pain_level: number | null
          period_length_days: number | null
          symptoms: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle_end_date?: string | null
          cycle_length_days?: number | null
          cycle_start_date: string
          flow_intensity?: string | null
          id?: string
          mood_rating?: number | null
          notes?: string | null
          pain_level?: number | null
          period_length_days?: number | null
          symptoms?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cycle_end_date?: string | null
          cycle_length_days?: number | null
          cycle_start_date?: string
          flow_intensity?: string | null
          id?: string
          mood_rating?: number | null
          notes?: string | null
          pain_level?: number | null
          period_length_days?: number | null
          symptoms?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mental_health_logs: {
        Row: {
          activities: string[] | null
          anxiety_level: number | null
          coping_strategies: string[] | null
          created_at: string
          energy_level: number | null
          id: string
          logged_at: string | null
          mood_rating: number | null
          notes: string | null
          physical_symptoms: string[] | null
          sleep_quality_rating: number | null
          stress_level: number | null
          thoughts: string | null
          triggers: string[] | null
          user_id: string
        }
        Insert: {
          activities?: string[] | null
          anxiety_level?: number | null
          coping_strategies?: string[] | null
          created_at?: string
          energy_level?: number | null
          id?: string
          logged_at?: string | null
          mood_rating?: number | null
          notes?: string | null
          physical_symptoms?: string[] | null
          sleep_quality_rating?: number | null
          stress_level?: number | null
          thoughts?: string | null
          triggers?: string[] | null
          user_id: string
        }
        Update: {
          activities?: string[] | null
          anxiety_level?: number | null
          coping_strategies?: string[] | null
          created_at?: string
          energy_level?: number | null
          id?: string
          logged_at?: string | null
          mood_rating?: number | null
          notes?: string | null
          physical_symptoms?: string[] | null
          sleep_quality_rating?: number | null
          stress_level?: number | null
          thoughts?: string | null
          triggers?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          data_preferences: Json | null
          first_name: string | null
          id: string
          last_name: string | null
          tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_preferences?: Json | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_preferences?: Json | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sleep_records: {
        Row: {
          bedtime: string | null
          created_at: string
          id: string
          notes: string | null
          sleep_duration_hours: number | null
          sleep_quality: number | null
          updated_at: string
          user_id: string
          wake_time: string | null
        }
        Insert: {
          bedtime?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          sleep_duration_hours?: number | null
          sleep_quality?: number | null
          updated_at?: string
          user_id: string
          wake_time?: string | null
        }
        Update: {
          bedtime?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          sleep_duration_hours?: number | null
          sleep_quality?: number | null
          updated_at?: string
          user_id?: string
          wake_time?: string | null
        }
        Relationships: []
      }
      step_records: {
        Row: {
          created_at: string
          date: string
          id: string
          steps: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          steps: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          steps?: number
          user_id?: string
        }
        Relationships: []
      }
      user_profiles_health: {
        Row: {
          activity_level: string | null
          birth_date: string | null
          created_at: string
          daily_caloric_target: number | null
          gender: string | null
          goal_type: string | null
          height_cm: number | null
          id: string
          resting_heart_rate: number | null
          target_weight_kg: number | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          birth_date?: string | null
          created_at?: string
          daily_caloric_target?: number | null
          gender?: string | null
          goal_type?: string | null
          height_cm?: number | null
          id?: string
          resting_heart_rate?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          birth_date?: string | null
          created_at?: string
          daily_caloric_target?: number | null
          gender?: string | null
          goal_type?: string | null
          height_cm?: number | null
          id?: string
          resting_heart_rate?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      },
      finance_accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string | null
          balance: number | null
          currency: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type?: string | null
          balance?: number | null
          currency?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string | null
          balance?: number | null
          currency?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_accounts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string | null
          amount: number
          category: string | null
          direction: string
          occurred_at: string
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id?: string | null
          amount: number
          category?: string | null
          direction: string
          occurred_at?: string
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string | null
          amount?: number
          category?: string | null
          direction?: string
          occurred_at?: string
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      budgets: {
        Row: {
          id: string
          user_id: string
          category: string
          period: string | null
          limit_amount: number
          spent_amount: number | null
          period_start: string
          period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          period?: string | null
          limit_amount: number
          spent_amount?: number | null
          period_start?: string
          period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          period?: string | null
          limit_amount?: number
          spent_amount?: number | null
          period_start?: string
          period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      investments: {
        Row: {
          id: string
          user_id: string
          instrument: string
          units: number | null
          avg_cost: number | null
          market_value: number | null
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          instrument: string
          units?: number | null
          avg_cost?: number | null
          market_value?: number | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          instrument?: string
          units?: number | null
          avg_cost?: number | null
          market_value?: number | null
          updated_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      relationships: {
        Row: {
          id: string
          user_id: string
          name: string
          relation_type: string | null
          importance: number | null
          last_contact_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          relation_type?: string | null
          importance?: number | null
          last_contact_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          relation_type?: string | null
          importance?: number | null
          last_contact_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      interactions: {
        Row: {
          id: string
          user_id: string
          relationship_id: string
          channel: string | null
          duration_minutes: number | null
          mood_rating: number | null
          occurred_at: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          relationship_id: string
          channel?: string | null
          duration_minutes?: number | null
          mood_rating?: number | null
          occurred_at?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          relationship_id?: string
          channel?: string | null
          duration_minutes?: number | null
          mood_rating?: number | null
          occurred_at?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_relationship_id_fkey"
            columns: ["relationship_id"]
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      gratitude_entries: {
        Row: {
          id: string
          user_id: string
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          text: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          text?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gratitude_entries_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      quality_time_goals: {
        Row: {
          id: string
          user_id: string
          target_minutes_per_week: number
          completed_minutes: number
          period_start: string
          period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_minutes_per_week?: number
          completed_minutes?: number
          period_start?: string
          period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_minutes_per_week?: number
          completed_minutes?: number
          period_start?: string
          period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_time_goals_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      heart_rate_data: {
        Row: {
          id: string
          user_id: string
          heart_rate: number
          timestamp: string
          source_device: string | null
          activity_type: string | null
          confidence: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          heart_rate: number
          timestamp?: string
          source_device?: string | null
          activity_type?: string | null
          confidence?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          heart_rate?: number
          timestamp?: string
          source_device?: string | null
          activity_type?: string | null
          confidence?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "heart_rate_data_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      health_daily_scores: {
        Row: {
          id: string
          user_id: string
          date: string
          score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          score?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_daily_scores_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      wealth_daily_scores: {
        Row: {
          id: string
          user_id: string
          date: string
          score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          score?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wealth_daily_scores_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      relations_daily_scores: {
        Row: {
          id: string
          user_id: string
          date: string
          score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          score?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relations_daily_scores_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      health_goals_progress: {
        Row: {
          id: string
          user_id: string
          date: string
          score: number | null
          completed_count: number
          total_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          score?: number | null
          completed_count?: number
          total_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          score?: number | null
          completed_count?: number
          total_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_goals_progress_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      wealth_goals_progress: {
        Row: {
          id: string
          user_id: string
          date: string
          score: number | null
          completed_count: number
          total_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          score?: number | null
          completed_count?: number
          total_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          score?: number | null
          completed_count?: number
          total_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wealth_goals_progress_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      relations_goals_progress: {
        Row: {
          id: string
          user_id: string
          date: string
          score: number | null
          completed_count: number
          total_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          score?: number | null
          completed_count?: number
          total_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          score?: number | null
          completed_count?: number
          total_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relations_goals_progress_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      uv_index_records: {
        Row: {
          id: string
          user_id: string
          date: string
          uv_index: number
          location: string | null
          exposure_duration_minutes: number
          protection_used: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date?: string
          uv_index: number
          location?: string | null
          exposure_duration_minutes?: number
          protection_used?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          uv_index?: number
          location?: string | null
          exposure_duration_minutes?: number
          protection_used?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "uv_index_records_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      hydration_records: {
        Row: {
          id: string
          user_id: string
          date: string
          water_intake_ml: number
          target_ml: number | null
          cups_consumed: number
          last_drink_time: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date?: string
          water_intake_ml?: number
          target_ml?: number | null
          cups_consumed?: number
          last_drink_time?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          water_intake_ml?: number
          target_ml?: number | null
          cups_consumed?: number
          last_drink_time?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hydration_records_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
// ... rest of the file continues as before