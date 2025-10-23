import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface BackgroundTask {
  id: string;
  user_id: string;
  type: 'upload_transcription';
  status: 'processing' | 'completed' | 'error';
  progress: string;
  progress_percent?: number;
  meeting_id?: string;
  error?: string;
  created_at: string;
  updated_at: string;
}

export const useBackgroundProcessing = (userId: string | undefined) => {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!userId) {
      setTasks([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('background_tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Auto-cleanup old completed/error tasks (older than 5 minutes)
      // Also cleanup orphaned processing tasks (older than 10 minutes)
      const now = new Date().getTime();
      const fiveMinutes = 5 * 60 * 1000;
      const tenMinutes = 10 * 60 * 1000;

      const validTasks = (data || []).filter((task: BackgroundTask) => {
        const taskTime = new Date(task.created_at).getTime();
        const age = now - taskTime;

        // Remove orphaned processing tasks (stuck > 10 minutes)
        if (task.status === 'processing' && age >= tenMinutes) {
          return false;
        }

        // Keep recent processing tasks
        if (task.status === 'processing') return true;

        // Remove old completed/error tasks
        return age < fiveMinutes;
      });

      // Auto-delete old tasks from database
      const oldTaskIds = (data || [])
        .filter((task: BackgroundTask) => {
          const taskTime = new Date(task.created_at).getTime();
          const age = now - taskTime;
          // Delete non-processing tasks older than 5 minutes OR processing tasks older than 10 minutes
          return (task.status !== 'processing' && age >= fiveMinutes) ||
                 (task.status === 'processing' && age >= tenMinutes);
        })
        .map((task: BackgroundTask) => task.id);

      if (oldTaskIds.length > 0) {
        await supabase
          .from('background_tasks')
          .delete()
          .in('id', oldTaskIds);
      }

      setTasks(validTasks);
    } catch (error) {
      console.error('Erreur chargement tâches:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    loadTasks();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('background_tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'background_tasks',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadTasks();
        }
      )
      .subscribe();

    // Polling pour les mises à jour (backup si realtime ne fonctionne pas)
    const interval = setInterval(() => {
      loadTasks();
    }, 5000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [userId, loadTasks]);

  const addTask = useCallback(async (task: Omit<BackgroundTask, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('background_tasks')
        .insert({
          ...task,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      await loadTasks();
      return data?.id || null;
    } catch (error) {
      console.error('Erreur ajout tâche:', error);
      return null;
    }
  }, [userId, loadTasks]);

  const updateTask = useCallback(async (id: string, updates: Partial<BackgroundTask>) => {
    try {
      const { error } = await supabase
        .from('background_tasks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await loadTasks();
    } catch (error) {
      console.error('Erreur mise à jour tâche:', error);
    }
  }, [loadTasks]);

  const removeTask = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('background_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadTasks();
    } catch (error) {
      console.error('Erreur suppression tâche:', error);
    }
  }, [loadTasks]);

  const clearCompletedTasks = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('background_tasks')
        .delete()
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (error) throw error;

      await loadTasks();
    } catch (error) {
      console.error('Erreur nettoyage tâches:', error);
    }
  }, [userId, loadTasks]);

  const getActiveTask = useCallback(() => {
    return tasks.find(task => task.status === 'processing');
  }, [tasks]);

  const hasActiveTasks = useCallback(() => {
    return tasks.some(task => task.status === 'processing');
  }, [tasks]);

  const hasCompletedTasks = useCallback(() => {
    return tasks.some(task => task.status === 'completed');
  }, [tasks]);

  return {
    tasks,
    isLoading,
    addTask,
    updateTask,
    removeTask,
    clearCompletedTasks,
    getActiveTask,
    hasActiveTasks,
    hasCompletedTasks,
    loadTasks,
  };
};
