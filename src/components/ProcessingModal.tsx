import { Loader2 } from 'lucide-react';

interface ProcessingModalProps {
  isOpen: boolean;
  status: string;
  onClose?: () => void;
}

export const ProcessingModal = ({ isOpen, status, onClose }: ProcessingModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className="bg-white rounded-3xl p-10 max-w-md w-full mx-4 shadow-2xl border-2 border-orange-100">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-coral-500 to-sunset-500 rounded-full blur-xl opacity-40 animate-pulse"></div>
            <Loader2 className="relative w-16 h-16 text-coral-500 animate-spin" />
          </div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-coral-600 to-sunset-600 bg-clip-text text-transparent">Processing...</h3>
          <p className="text-cocoa-700 text-center text-lg font-medium">{status}</p>
        </div>
      </div>
    </div>
  );
};
