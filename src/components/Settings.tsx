import { useState, useEffect } from 'react';
import { Save, Upload, X, CreditCard as Edit2, Mail, Crown, Zap, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingsProps {
  userId: string;
}

interface Subscription {
  plan_type: 'starter' | 'unlimited';
  minutes_quota: number | null;
  minutes_used_this_month: number;
  billing_cycle_end: string;
  is_active: boolean;
}

export const Settings = ({ userId }: SettingsProps) => {
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [signatureText, setSignatureText] = useState('');
  const [signatureLogoUrl, setSignatureLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [emailMethod, setEmailMethod] = useState<'gmail' | 'local' | 'smtp'>('gmail');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'unlimited'>('starter');
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState('');
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);

  useEffect(() => {
    loadSettings();
    loadSubscription();

    // Écouter les messages de la popup OAuth
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'GMAIL_AUTH_SUCCESS') {
        console.log('✅ Gmail connecté !', event.data.email);
        setGmailConnected(true);
        setGmailEmail(event.data.email);
        // Recharger les settings pour avoir les dernières données
        loadSettings();
      } else if (event.data.type === 'GMAIL_AUTH_ERROR') {
        console.error('❌ Erreur Gmail:', event.data.error);
        alert(`Erreur de connexion Gmail : ${event.data.error}`);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [userId]);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('user_settings')
      .select('sender_email, sender_name, signature_text, signature_logo_url, email_method, smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure, gmail_connected, gmail_email')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setSenderEmail(data.sender_email || '');
      setSenderName(data.sender_name || '');
      setSignatureText(data.signature_text || '');
      setSignatureLogoUrl(data.signature_logo_url || '');
      setLogoPreview(data.signature_logo_url || '');
      setEmailMethod(data.email_method || 'gmail');
      setSmtpHost(data.smtp_host || '');
      setSmtpPort(data.smtp_port || 587);
      setSmtpUser(data.smtp_user || '');
      setSmtpPassword(data.smtp_password || '');
      setSmtpSecure(data.smtp_secure !== false);
      setGmailConnected(data.gmail_connected || false);
      setGmailEmail(data.gmail_email || '');
    }
  };

  const loadSubscription = async () => {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setSubscription(data);
      setSelectedPlan(data.plan_type);
    }
  };

  const handleChangePlan = async () => {
    if (!subscription) {
      // Créer un nouvel abonnement
      const { error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_type: selectedPlan,
          minutes_quota: selectedPlan === 'starter' ? 600 : null,
          minutes_used_this_month: 0,
        });

      if (!error) {
        alert(`Votre abonnement ${selectedPlan === 'starter' ? 'Starter' : 'Illimité'} a été activé!`);
        loadSubscription();
      }
    } else {
      // Mettre à jour l'abonnement existant
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          plan_type: selectedPlan,
          minutes_quota: selectedPlan === 'starter' ? 600 : null,
        })
        .eq('user_id', userId);

      if (!error) {
        alert(`Votre formule a été changée vers ${selectedPlan === 'starter' ? 'Starter' : 'Illimitée'}!`);
        loadSubscription();
      }
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setSignatureLogoUrl('');
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return signatureLogoUrl;

    setIsUploading(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${userId}/signature-logo-${Date.now()}.${fileExt}`;

      if (signatureLogoUrl) {
        const oldFileName = signatureLogoUrl.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('logos')
            .remove([`${userId}/${oldFileName}`]);
        }
      }

      const { error: uploadError, data } = await supabase.storage
        .from('logos')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      alert(`Erreur lors du téléchargement du logo: ${error.message || 'Erreur inconnue'}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalLogoUrl = signatureLogoUrl;

      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          finalLogoUrl = uploadedUrl;
        }
      }

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          sender_email: senderEmail,
          sender_name: senderName,
          signature_text: signatureText,
          signature_logo_url: finalLogoUrl,
          email_method: emailMethod,
          // Toujours sauvegarder les paramètres SMTP même si la méthode n'est pas SMTP
          smtp_host: smtpHost || null,
          smtp_port: smtpPort || null,
          smtp_user: smtpUser || null,
          smtp_password: smtpPassword || null,
          smtp_secure: smtpSecure,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setSignatureLogoUrl(finalLogoUrl);
      setLogoPreview(finalLogoUrl);
      setLogoFile(null);

      // Afficher le message de succès
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 5000);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setIsSaving(false);
    }
  };

  // Supprimer l'affichage du récapitulatif séparé - tout sera affiché dans le mode édition

  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 via-white to-coral-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-cocoa-900 mb-8">
          Paramètres
        </h2>

        {/* Message de succès - Modal centré */}
        {showSaveSuccess && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform animate-scaleIn">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-cocoa-900 mb-2">Paramètres sauvegardés !</h3>
                <p className="text-cocoa-600 mb-6">Vos paramètres ont été enregistrés avec succès et seront utilisés dans tous vos emails.</p>
                <button
                  onClick={() => setShowSaveSuccess(false)}
                  className="px-6 py-3 bg-gradient-to-r from-coral-500 to-sunset-500 text-white rounded-xl font-semibold hover:from-coral-600 hover:to-sunset-600 transition-all shadow-md"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

      <div className="space-y-6">
        {/* Section Abonnement */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-coral-200 p-6">
          <h3 className="text-2xl font-bold text-cocoa-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-coral-600" />
            Gérer mon abonnement
          </h3>
          <p className="text-sm text-cocoa-600 mb-6">
            Choisissez la formule qui correspond à vos besoins
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Formule Starter */}
            <div
              onClick={() => setSelectedPlan('starter')}
              className={`relative rounded-2xl p-6 border-2 cursor-pointer transition-all ${
                selectedPlan === 'starter'
                  ? 'border-coral-500 bg-gradient-to-br from-coral-50 to-sunset-50 shadow-xl scale-105'
                  : 'border-coral-200 bg-white hover:border-coral-300 hover:shadow-lg'
              }`}
            >
              {selectedPlan === 'starter' && (
                <div className="absolute -top-3 right-4 px-3 py-1 bg-coral-500 text-white text-xs font-bold rounded-full shadow-lg">
                  Sélectionné
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-coral-500 to-sunset-500 rounded-xl shadow-md">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-cocoa-900">Formule Starter</h4>
                  <p className="text-2xl font-bold text-coral-600">29€<span className="text-sm text-cocoa-600">/mois</span></p>
                </div>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-cocoa-700">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">600 minutes/mois</span>
                </li>
                <li className="flex items-center gap-2 text-cocoa-700">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Transcription IA</span>
                </li>
                <li className="flex items-center gap-2 text-cocoa-700">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Résumés automatiques</span>
                </li>
                <li className="flex items-center gap-2 text-cocoa-700">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Envoi d'emails</span>
                </li>
              </ul>
            </div>

            {/* Formule Illimitée */}
            <div
              onClick={() => setSelectedPlan('unlimited')}
              className={`relative rounded-2xl p-6 border-2 cursor-pointer transition-all ${
                selectedPlan === 'unlimited'
                  ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-xl scale-105'
                  : 'border-amber-200 bg-white hover:border-amber-300 hover:shadow-lg'
              }`}
            >
              {selectedPlan === 'unlimited' && (
                <div className="absolute -top-3 right-4 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full shadow-lg">
                  Sélectionné
                </div>
              )}
              <div className="absolute -top-3 left-4 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-lg">
                ⭐ POPULAIRE
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl shadow-md">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-cocoa-900">Formule Illimitée</h4>
                  <p className="text-2xl font-bold text-amber-600">39€<span className="text-sm text-cocoa-600">/mois</span></p>
                </div>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-cocoa-700">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">Minutes illimitées</span>
                </li>
                <li className="flex items-center gap-2 text-cocoa-700">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Transcription IA</span>
                </li>
                <li className="flex items-center gap-2 text-cocoa-700">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Résumés automatiques</span>
                </li>
                <li className="flex items-center gap-2 text-cocoa-700">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Envoi d'emails</span>
                </li>
                <li className="flex items-center gap-2 text-cocoa-700">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Support prioritaire</span>
                </li>
              </ul>
            </div>
          </div>

          {subscription && subscription.plan_type !== selectedPlan && (
            <button
              onClick={handleChangePlan}
              className="w-full px-6 py-3 bg-gradient-to-r from-coral-500 to-sunset-500 text-white rounded-xl font-semibold hover:from-coral-600 hover:to-sunset-600 transition-all shadow-lg"
            >
              Changer pour la formule {selectedPlan === 'starter' ? 'Starter (29€)' : 'Illimitée (39€)'}
            </button>
          )}

          {!subscription && (
            <button
              onClick={handleChangePlan}
              className="w-full px-6 py-3 bg-gradient-to-r from-coral-500 to-sunset-500 text-white rounded-xl font-semibold hover:from-coral-600 hover:to-sunset-600 transition-all shadow-lg"
            >
              Activer la formule {selectedPlan === 'starter' ? 'Starter (29€)' : 'Illimitée (39€)'}
            </button>
          )}

          <p className="text-xs text-center text-cocoa-500 mt-4">
            Note: Le blocage à 4h par réunion s'applique à toutes les formules
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border-2 border-coral-200 p-6">
          <h3 className="text-xl font-bold text-cocoa-900 mb-6">Configuration Email</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-cocoa-700 mb-2">
                Nom de l'expéditeur
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Votre nom"
                className="w-full px-4 py-3 border-2 border-coral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500 text-cocoa-800 bg-white"
              />
              <p className="text-xs text-cocoa-600 mt-2">
                Ce nom apparaîtra comme expéditeur dans les emails
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-cocoa-700 mb-2">
                Email de l'expéditeur
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="votre.email@exemple.com"
                className="w-full px-4 py-3 border-2 border-coral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500 text-cocoa-800 bg-white"
              />
              <p className="text-xs text-cocoa-600 mt-2">
                Cette adresse sera utilisée pour l'envoi des comptes-rendus
              </p>
            </div>
          </div>
        </div>

        {/* Choix de la méthode d'envoi email */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-coral-200 p-6">
          <h3 className="text-xl font-bold text-cocoa-900 mb-4">Méthode d'envoi email</h3>
          <p className="text-sm text-cocoa-600 mb-4">
            Choisissez comment vous souhaitez envoyer vos emails de compte-rendu
          </p>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 bg-gradient-to-br from-peach-50 to-coral-50 rounded-xl border-2 border-coral-200 cursor-pointer hover:border-coral-300 transition-all">
              <input
                type="radio"
                name="emailMethod"
                value="gmail"
                checked={emailMethod === 'gmail'}
                onChange={(e) => setEmailMethod(e.target.value as 'gmail' | 'local' | 'smtp')}
                className="mt-1 w-5 h-5 text-coral-600 border-gray-300 focus:ring-coral-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="#EA4335"/>
                  </svg>
                  <span className="font-semibold text-cocoa-800">Gmail (API OAuth)</span>
                </div>
                <p className="text-sm text-cocoa-600 mt-1">
                  Envoi direct via votre compte Gmail (supporte les emails longs)
                </p>
                {gmailConnected && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">✓ Connecté</span>
                    <span className="text-cocoa-600">{gmailEmail}</span>
                  </div>
                )}
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 bg-gradient-to-br from-peach-50 to-coral-50 rounded-xl border-2 border-coral-200 cursor-pointer hover:border-coral-300 transition-all">
              <input
                type="radio"
                name="emailMethod"
                value="local"
                checked={emailMethod === 'local'}
                onChange={(e) => setEmailMethod(e.target.value as 'gmail' | 'local' | 'smtp')}
                className="mt-1 w-5 h-5 text-coral-600 border-gray-300 focus:ring-coral-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-cocoa-800">Client email local</span>
                </div>
                <p className="text-sm text-cocoa-600 mt-1">
                  Ouvre votre client email par défaut (Outlook, Thunderbird, etc.)
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 bg-gradient-to-br from-peach-50 to-coral-50 rounded-xl border-2 border-coral-200 cursor-pointer hover:border-coral-300 transition-all">
              <input
                type="radio"
                name="emailMethod"
                value="smtp"
                checked={emailMethod === 'smtp'}
                onChange={(e) => setEmailMethod(e.target.value as 'gmail' | 'local' | 'smtp')}
                className="mt-1 w-5 h-5 text-coral-600 border-gray-300 focus:ring-coral-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <span className="font-semibold text-cocoa-800">Serveur SMTP personnalisé</span>
                </div>
                <p className="text-sm text-cocoa-600 mt-1">
                  Configurez votre propre serveur SMTP (Gmail, Outlook, serveur dédié...)
                </p>
              </div>
            </label>
          </div>

          {/* Formulaire de configuration SMTP */}
          {emailMethod === 'gmail' && !gmailConnected && (
            <div className="mt-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 space-y-4">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="#EA4335"/>
                </svg>
                <h4 className="font-bold text-cocoa-900">Connecter votre compte Gmail</h4>
              </div>
              <p className="text-sm text-cocoa-700">
                Pour utiliser l'envoi direct via Gmail, vous devez d'abord connecter votre compte Gmail.
                Vos emails seront envoyés directement depuis votre compte Gmail sans limite de longueur.
              </p>
              <button
                onClick={async () => {
                  setIsConnectingGmail(true);
                  try {
                    // Récupérer le token d'accès de la session Supabase
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) {
                      throw new Error('Session non trouvée');
                    }

                    // Stocker le token dans une variable globale accessible par la popup
                    (window as any).__gmailAuthToken = session.access_token;

                    const clientId = import.meta.env.VITE_GMAIL_CLIENT_ID;
                    const redirectUri = `${window.location.origin}/gmail-callback`;
                    const scope = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email';

                    // Encoder le token dans le state
                    const state = btoa(JSON.stringify({ token: session.access_token }));

                    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;

                    window.open(authUrl, '_blank', 'width=500,height=600');
                  } catch (error) {
                    console.error('Erreur lors de la connexion Gmail:', error);
                    alert('Erreur lors de la connexion Gmail');
                  } finally {
                    setIsConnectingGmail(false);
                  }
                }}
                disabled={isConnectingGmail}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {isConnectingGmail ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Connexion...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="white"/>
                    </svg>
                    Connecter mon compte Gmail
                  </>
                )}
              </button>
            </div>
          )}

          {emailMethod === 'gmail' && gmailConnected && (
            <div className="mt-4 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 space-y-3">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <h4 className="font-bold text-cocoa-900">Gmail connecté</h4>
              </div>
              <p className="text-sm text-cocoa-700">
                Votre compte Gmail <strong>{gmailEmail}</strong> est connecté. Vos emails seront envoyés directement via Gmail.
              </p>
              <button
                onClick={async () => {
                  if (confirm('Voulez-vous vraiment déconnecter votre compte Gmail ?')) {
                    await supabase
                      .from('user_settings')
                      .update({
                        gmail_connected: false,
                        gmail_email: null,
                        gmail_access_token: null,
                        gmail_refresh_token: null,
                        gmail_token_expiry: null,
                      })
                      .eq('user_id', userId);

                    setGmailConnected(false);
                    setGmailEmail('');
                    alert('Compte Gmail déconnecté');
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all text-sm"
              >
                Déconnecter Gmail
              </button>
            </div>
          )}

          {emailMethod === 'smtp' && (
            <div className="mt-4 p-5 bg-gradient-to-br from-peach-50 to-coral-50 rounded-xl border-2 border-coral-200 space-y-4">
              <h4 className="font-bold text-cocoa-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-coral-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Configuration SMTP
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-cocoa-700 mb-2">
                    Serveur SMTP *
                  </label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="w-full px-4 py-2 border-2 border-coral-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-coral-500 bg-white text-cocoa-800"
                  />
                  <p className="text-xs text-cocoa-500 mt-1">Ex: smtp.gmail.com, smtp.office365.com</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-cocoa-700 mb-2">
                    Port SMTP *
                  </label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                    placeholder="587"
                    className="w-full px-4 py-2 border-2 border-coral-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-coral-500 bg-white text-cocoa-800"
                  />
                  <p className="text-xs text-cocoa-500 mt-1">587 (TLS) ou 465 (SSL)</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-cocoa-700 mb-2">
                    Email / Utilisateur *
                  </label>
                  <input
                    type="email"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full px-4 py-2 border-2 border-coral-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-coral-500 bg-white text-cocoa-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-cocoa-700 mb-2">
                    Mot de passe *
                  </label>
                  <input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border-2 border-coral-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-coral-500 bg-white text-cocoa-800"
                  />
                  <p className="text-xs text-cocoa-500 mt-1">
                    Pour Gmail: utilisez un mot de passe d'application
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-peach-50 to-coral-50 rounded-lg border border-coral-200">
                <input
                  type="checkbox"
                  id="smtp-secure"
                  checked={smtpSecure}
                  onChange={(e) => setSmtpSecure(e.target.checked)}
                  className="w-4 h-4 text-coral-600 border-gray-300 rounded focus:ring-coral-500"
                />
                <label htmlFor="smtp-secure" className="text-sm text-cocoa-700 cursor-pointer">
                  Utiliser une connexion sécurisée (TLS/SSL) - Recommandé
                </label>
              </div>

              <div className="p-3 bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-lg">
                <p className="text-xs text-amber-800">
                  <strong>⚠️ Important:</strong> Pour Gmail, vous devez créer un "Mot de passe d'application" 
                  dans les paramètres de sécurité de votre compte Google. Les mots de passe normaux ne fonctionnent pas.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg border-2 border-coral-200 p-6">
          <h3 className="text-xl font-bold text-cocoa-900 mb-6">Signature Email</h3>
          <p className="text-sm text-cocoa-600 mb-4">
            Cette signature sera ajoutée automatiquement en bas de tous les emails de compte-rendu
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-cocoa-700 mb-2">
                Logo de signature (optionnel)
              </label>
              <div className="flex items-start gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Aperçu du logo"
                      className="w-32 h-32 object-contain rounded-lg border-2 border-coral-200 bg-white p-2"
                    />
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : null}
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-coral-500 to-sunset-500 text-white rounded-xl hover:from-coral-600 hover:to-sunset-600 transition-all cursor-pointer font-semibold shadow-md hover:shadow-lg">
                    <Upload className="w-5 h-5" />
                    {logoPreview ? 'Changer le logo' : 'Ajouter un logo'}
                  </div>
                </label>
              </div>
              <p className="text-xs text-cocoa-600 mt-2">
                Le logo sera affiché dans votre signature email (formats acceptés : PNG, JPG, SVG)
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-cocoa-700 mb-2">
                Informations de signature
              </label>
              <textarea
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                placeholder="Jean Dupont&#10;Directeur Commercial&#10;Mon Entreprise SA&#10;Tél : +33 1 23 45 67 89&#10;www.exemple.com"
                rows={6}
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500 text-cocoa-800 resize-none font-mono text-sm"
              />
              <p className="text-xs text-cocoa-600 mt-2">
                Saisissez toutes les informations que vous souhaitez voir apparaître dans votre signature (nom, poste, entreprise, téléphone, site web, etc.). Les retours à la ligne seront préservés.
              </p>

              {/* Aperçu de la signature */}
              {signatureText && (
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-cocoa-700 mb-2">
                    Aperçu de la signature
                  </label>
                  <div className="bg-gradient-to-br from-peach-50 to-coral-50 rounded-lg p-4 border-2 border-coral-200">
                    <pre className="whitespace-pre-wrap text-cocoa-800 font-sans text-sm">{signatureText}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || isUploading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-coral-500 to-sunset-500 text-white hover:from-coral-600 hover:to-sunset-600 rounded-xl transition-all shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {isUploading ? 'Téléchargement...' : isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
      </div>
    </div>
  );
};
