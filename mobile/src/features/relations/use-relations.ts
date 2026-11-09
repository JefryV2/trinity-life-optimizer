import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { endOfMonth, startOfMonth } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export interface Relationship {
  id: string;
  name: string;
  relation_type: string | null;
  importance: number | null;
  last_contact_at: string | null;
  notes: string | null;
}

export interface Interaction {
  id: string;
  relationship_id: string;
  channel: string | null;
  duration_minutes: number | null;
  mood_rating: number | null;
  occurred_at: string;
  notes: string | null;
}

export interface GratitudeEntry {
  id: string;
  text: string;
  created_at: string;
}

export interface QualityTimeGoal {
  id: string;
  target_minutes_per_week: number;
  completed_minutes: number;
  period_start: string;
  period_end: string | null;
}

export interface RelationsData {
  relationships: Relationship[];
  interactions: Interaction[];
  gratitude: GratitudeEntry[];
  qualityTime: QualityTimeGoal | null;
}

const invalidate = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['relations'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['insights'] }),
  ]);
};

export const useRelations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ['relations', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<RelationsData> => {
      const [relationships, interactions, gratitude, qualityTime] = await Promise.all([
        supabase
          .from('relationships')
          .select('id,name,relation_type,importance,last_contact_at,notes')
          .eq('user_id', userId!)
          .order('importance', { ascending: false }),
        supabase
          .from('interactions')
          .select('id,relationship_id,channel,duration_minutes,mood_rating,occurred_at,notes')
          .eq('user_id', userId!)
          .gte('occurred_at', new Date(Date.now() - 30 * 86_400_000).toISOString())
          .order('occurred_at', { ascending: false }),
        supabase
          .from('gratitude_entries')
          .select('id,text,created_at')
          .eq('user_id', userId!)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('quality_time_goals')
          .select('id,target_minutes_per_week,completed_minutes,period_start,period_end')
          .eq('user_id', userId!)
          .gte('period_start', startOfMonth().toISOString())
          .lte('period_start', endOfMonth().toISOString())
          .order('period_start', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const failure = [relationships, interactions, gratitude].find((result) => result.error);
      if (failure?.error) throw new Error(failure.error.message);

      return {
        relationships: (relationships.data ?? []) as Relationship[],
        interactions: (interactions.data ?? []) as Interaction[],
        gratitude: (gratitude.data ?? []) as GratitudeEntry[],
        qualityTime: (qualityTime.data ?? null) as QualityTimeGoal | null,
      };
    },
  });

  const addRelationship = useMutation({
    mutationFn: async (input: {
      name: string;
      type: string;
      importance: number;
      notes?: string;
    }) => {
      const { error } = await supabase.from('relationships').insert({
        user_id: userId!,
        name: input.name.trim(),
        relation_type: input.type,
        importance: input.importance,
        notes: input.notes?.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient),
  });

  const logInteraction = useMutation({
    mutationFn: async (input: {
      relationshipId: string;
      channel: string;
      duration: number;
      mood: number;
      notes?: string;
    }) => {
      const occurredAt = new Date().toISOString();
      const { error } = await supabase.from('interactions').insert({
        user_id: userId!,
        relationship_id: input.relationshipId,
        channel: input.channel,
        duration_minutes: input.duration,
        mood_rating: input.mood,
        occurred_at: occurredAt,
        notes: input.notes?.trim() || null,
      });
      if (error) throw new Error(error.message);

      await supabase
        .from('relationships')
        .update({ last_contact_at: occurredAt, updated_at: occurredAt })
        .eq('id', input.relationshipId);
    },
    onSuccess: () => invalidate(queryClient),
  });

  const addGratitude = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.from('gratitude_entries').insert({
        user_id: userId!,
        text: text.trim(),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient),
  });

  const addQualityTime = useMutation({
    mutationFn: async (minutes: number) => {
      const existing = await supabase
        .from('quality_time_goals')
        .select('id,completed_minutes')
        .eq('user_id', userId!)
        .gte('period_start', startOfMonth().toISOString())
        .lte('period_start', endOfMonth().toISOString())
        .maybeSingle();

      if (existing.data?.id) {
        const { error } = await supabase
          .from('quality_time_goals')
          .update({
            completed_minutes: Number(existing.data.completed_minutes ?? 0) + minutes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.data.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('quality_time_goals').insert({
          user_id: userId!,
          target_minutes_per_week: 300,
          completed_minutes: minutes,
          period_start: startOfMonth().toISOString(),
          period_end: endOfMonth().toISOString(),
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => invalidate(queryClient),
  });

  return {
    ...query,
    addRelationship,
    logInteraction,
    addGratitude,
    addQualityTime,
  };
};
