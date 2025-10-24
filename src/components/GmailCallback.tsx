import { useEffect, useState } from 'react';

export const GmailCallback = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connexion à Gmail en cours...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        if (!code) {
          throw new Error('Code d\'autorisation manquant');
        }

        // Récupérer le token d'accès stocké dans le state
        let accessToken: string | null = null;

        if (state) {
          try {
            const stateData = JSON.parse(atob(state));
            accessToken = stateData.token;
          } catch (e) {
            console.error('Erreur parsing state:', e);
          }
        }

        // Si pas de token dans le state, essayer de le récupérer depuis le window.opener
        if (!accessToken && window.opener) {
          try {
            const openerData = (window.opener as any).__gmailAuthToken;
            if (openerData) {
              accessToken = openerData;
            }
          } catch (e) {
            console.error('Erreur récupération token depuis opener:', e);
          }
        }

        if (!accessToken) {
          throw new Error('Token d\'authentification introuvable. Veuillez réessayer.');
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/gmail-oauth-callback`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Erreur lors de la connexion Gmail');
        }

        setStatus('success');
        setMessage(`Gmail connecté avec succès ! (${result.email})`);

        // Notifier la fenêtre parente
        if (window.opener) {
          try {
            (window.opener as any).postMessage({
              type: 'GMAIL_AUTH_SUCCESS',
              email: result.email
            }, '*');
          } catch (e) {
            console.error('Erreur notification opener:', e);
          }
        }

        setTimeout(() => {
          window.close();
        }, 2000);
      } catch (error: any) {
        console.error('Erreur callback Gmail:', error);
        setStatus('error');
        setMessage(error.message || 'Erreur lors de la connexion Gmail');

        // Notifier la fenêtre parente de l'erreur
        if (window.opener) {
          try {
            (window.opener as any).postMessage({
              type: 'GMAIL_AUTH_ERROR',
              error: error.message
            }, '*');
          } catch (e) {
            console.error('Erreur notification opener:', e);
          }
        }
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 via-white to-coral-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-coral-500 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-cocoa-900 mb-2">Connexion en cours...</h2>
            <p className="text-cocoa-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Succès !</h2>
            <p className="text-cocoa-700">{message}</p>
            <p className="text-sm text-cocoa-500 mt-4">Cette fenêtre va se fermer automatiquement...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Erreur</h2>
            <p className="text-cocoa-700 mb-6">{message}</p>
            <button
              onClick={() => window.close()}
              className="px-6 py-3 bg-gradient-to-r from-coral-500 to-sunset-500 text-white rounded-xl font-semibold hover:from-coral-600 hover:to-sunset-600 transition-all shadow-md"
            >
              Fermer
            </button>
          </>
        )}
      </div>
    </div>
  );
};
