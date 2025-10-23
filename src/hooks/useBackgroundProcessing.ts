import { useState, useEffect, useCallback } from 'react';

export interface BackgroundTask {
  id: string;
  type: 'upload_transcription';
  status: 'processing' | 'completed' | 'error';
  progress: string;
  startTime: number;
  meetingId?: string;
  error?: string;
}

const STORAGE_KEY = 'background_tasks';

export const useBackgroundProcessing = () => {
  const [tasks, setTasks] = useState<BackgroundTask[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        // Nettoyer les tâches de plus de 5 minutes ou avec status 'processing' invalide
        const validTasks = parsed.filter((task: BackgroundTask) => {
          const age = now - task.startTime;

          // Supprimer les tâches trop anciennes
          if (age > fiveMinutes) {
            return false;
          }

          // Supprimer les tâches 'processing' de plus de 2 minutes (probablement bloquées)
          if (task.status === 'processing' && age > 2 * 60 * 1000) {
            return false;
          }

          return true;
        });

        return validTasks;
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const addTask = useCallback((task: Omit<BackgroundTask, 'id' | 'startTime'>) => {
    const newTask: BackgroundTask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
    };
    setTasks(prev => [...prev, newTask]);
    return newTask.id;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<BackgroundTask>) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, ...updates } : task
    ));
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  }, []);

  const clearCompletedTasks = useCallback(() => {
    setTasks(prev => prev.filter(task => task.status !== 'completed'));
  }, []);

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
    addTask,
    updateTask,
    removeTask,
    clearCompletedTasks,
    getActiveTask,
    hasActiveTasks,
    hasCompletedTasks,
  };
};
