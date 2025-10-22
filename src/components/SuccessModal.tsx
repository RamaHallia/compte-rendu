import { CheckCircle, X } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

export function SuccessModal({ isOpen, message, onClose }: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-scaleIn relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-6 animate-bounce-once shadow-lg">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Succès !
          </h2>

          <p className="text-gray-600 mb-8 leading-relaxed">
            {message}
          </p>

          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-[#EF6855] to-[#E5503F] text-white rounded-xl font-semibold hover:from-[#E5503F] hover:to-[#D64838] transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
