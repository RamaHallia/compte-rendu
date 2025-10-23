import { Loader2, Sparkles, X, AlertCircle } from 'lucide-react';
import { BackgroundTask } from '../hooks/useBackgroundProcessing';
import { useEffect, useState } from 'react';

interface BackgroundProcessingIndicatorProps {
  tasks: BackgroundTask[];
  onDismiss: (id: string) => void;
  onViewResult: (meetingId: string) => void;
}

export const BackgroundProcessingIndicator = ({
  tasks,
  onDismiss,
  onViewResult,
}: BackgroundProcessingIndicatorProps) => {
  const activeTask = tasks.find(t => t.status === 'processing');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const errorTasks = tasks.filter(t => t.status === 'error');
  const [autoClosing, setAutoClosing] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    completedTasks.forEach(task => {
      if (!autoClosing[task.id]) {
        setAutoClosing(prev => ({ ...prev, [task.id]: 10 }));

        const interval = setInterval(() => {
          setAutoClosing(prev => {
            const newCount = (prev[task.id] || 0) - 1;
            if (newCount <= 0) {
              clearInterval(interval);
              setTimeout(() => onDismiss(task.id), 100);
              return prev;
            }
            return { ...prev, [task.id]: newCount };
          });
        }, 1000);
      }
    });
  }, [completedTasks.length]);

  useEffect(() => {
    errorTasks.forEach(task => {
      if (!autoClosing[task.id]) {
        setAutoClosing(prev => ({ ...prev, [task.id]: 15 }));

        const interval = setInterval(() => {
          setAutoClosing(prev => {
            const newCount = (prev[task.id] || 0) - 1;
            if (newCount <= 0) {
              clearInterval(interval);
              setTimeout(() => onDismiss(task.id), 100);
              return prev;
            }
            return { ...prev, [task.id]: newCount };
          });
        }, 1000);
      }
    });
  }, [errorTasks.length]);

  if (!activeTask && completedTasks.length === 0 && errorTasks.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 w-80">
      {activeTask && (
        <div className="bg-gradient-to-br from-white to-orange-50 rounded-2xl shadow-xl border-2 border-orange-200 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-coral-500 to-sunset-500 rounded-full flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
              <div className="absolute inset-0 bg-coral-400 rounded-full animate-ping opacity-20"></div>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-cocoa-800 text-sm">
                Traitement en cours
              </h4>
            </div>
          </div>
          <p className="text-xs text-cocoa-600 mb-3 px-1">
            {activeTask.progress}
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-cocoa-500 font-medium">Progression</span>
              <span className="text-coral-600 font-bold">{activeTask.progress_percent || 0}%</span>
            </div>
            <div className="h-2.5 bg-orange-100 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${activeTask.progress_percent || 0}%`,
                  background: activeTask.progress_percent && activeTask.progress_percent >= 80
                    ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                    : activeTask.progress_percent && activeTask.progress_percent >= 50
                    ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                    : 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)'
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {completedTasks.map((task) => (
        <div
          key={task.id}
          className="bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-xl border-2 border-green-200 p-5 backdrop-blur-sm animate-slide-in-right"
        >
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-cocoa-800 text-sm mb-1">
                Transcription prête !
              </h4>
              <p className="text-xs text-cocoa-600 mb-3">
                Votre réunion a été transcrite avec succès
              </p>
              {task.meeting_id && (
                <button
                  onClick={() => {
                    onViewResult(task.meeting_id!);
                    onDismiss(task.id);
                  }}
                  className="w-full px-4 py-2 bg-gradient-to-r from-coral-500 to-coral-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all"
                >
                  Voir le résultat
                </button>
              )}
              <p className="text-xs text-cocoa-400 mt-2 text-center">
                Fermeture auto dans {autoClosing[task.id] || 0}s
              </p>
            </div>
            <button
              onClick={() => onDismiss(task.id)}
              className="flex-shrink-0 p-1 text-cocoa-400 hover:text-cocoa-600 hover:bg-cocoa-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {errorTasks.map((task) => (
        <div
          key={task.id}
          className="bg-gradient-to-br from-white to-red-50 rounded-2xl shadow-xl border-2 border-red-200 p-5 backdrop-blur-sm animate-slide-in-right"
        >
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-red-900 text-sm mb-1">
                Erreur de traitement
              </h4>
              <p className="text-xs text-red-700 mb-2">
                {task.error || 'Une erreur est survenue'}
              </p>
              <p className="text-xs text-red-500 mt-2 text-center">
                Fermeture auto dans {autoClosing[task.id] || 0}s
              </p>
            </div>
            <button
              onClick={() => onDismiss(task.id)}
              className="flex-shrink-0 p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
