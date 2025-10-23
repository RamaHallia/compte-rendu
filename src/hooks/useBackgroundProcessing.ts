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
        return JSON.parse(saved);
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
