import { Loader, CheckCircle, XCircle, X } from 'lucide-react';
import { BackgroundTask } from '../hooks/useBackgroundProcessing';

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

  if (!activeTask && completedTasks.length === 0 && errorTasks.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {activeTask && (
        <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-200 p-4 animate-slide-in-right">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Loader className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-cocoa-800 text-sm mb-1">
                Traitement en cours
              </h4>
              <p className="text-xs text-cocoa-600">
                {activeTask.progress}
              </p>
              <div className="mt-2 h-1 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {completedTasks.map((task) => (
        <div
          key={task.id}
          className="bg-white rounded-xl shadow-2xl border-2 border-green-200 p-4 animate-slide-in-right"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-cocoa-800 text-sm mb-1">
                Traitement terminé
              </h4>
              <p className="text-xs text-cocoa-600 mb-3">
                Votre transcription est prête
              </p>
              <div className="flex items-center gap-2">
                {task.meetingId && (
                  <button
                    onClick={() => onViewResult(task.meetingId!)}
                    className="flex-1 px-3 py-1.5 bg-gradient-to-r from-coral-500 to-coral-600 text-white rounded-lg text-xs font-semibold hover:shadow-lg transition-all"
                  >
                    Voir le résultat
                  </button>
                )}
                <button
                  onClick={() => onDismiss(task.id)}
                  className="p-1.5 text-cocoa-400 hover:text-cocoa-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {errorTasks.map((task) => (
        <div
          key={task.id}
          className="bg-white rounded-xl shadow-2xl border-2 border-red-200 p-4 animate-slide-in-right"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-cocoa-800 text-sm mb-1">
                Erreur de traitement
              </h4>
              <p className="text-xs text-cocoa-600 mb-2">
                {task.error || 'Une erreur est survenue'}
              </p>
              <button
                onClick={() => onDismiss(task.id)}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
