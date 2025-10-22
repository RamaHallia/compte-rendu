import { useEffect, useState } from 'react';
import { Mail, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const EmailConfirmation = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        if (type === 'signup' && accessToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          });

          if (error) throw error;

          setStatus('success');
          setMessage('Votre email a été confirmé avec succès !');

          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Lien de confirmation invalide ou expiré.');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'Une erreur est survenue lors de la confirmation.');
      }
    };

    handleEmailConfirmation();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-amber-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-orange-100 text-center">
          <div className="mb-6 flex justify-center">
            {status === 'loading' && (
              <div className="w-20 h-20 border-4 border-coral-500 border-t-transparent rounded-full animate-spin"></div>
            )}
            {status === 'success' && (
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold text-cocoa-800 mb-4">
            {status === 'loading' && 'Confirmation en cours...'}
            {status === 'success' && 'Email confirmé !'}
            {status === 'error' && 'Erreur de confirmation'}
          </h2>

          <p className="text-cocoa-600 mb-6">{message}</p>

          {status === 'success' && (
            <div className="text-sm text-cocoa-500">
              Vous allez être redirigé automatiquement...
            </div>
          )}

          {status === 'error' && (
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 text-white font-semibold rounded-xl hover:from-coral-600 hover:to-coral-700 transition-all shadow-lg"
            >
              Retour à l'accueil
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
