import { ArrowLeft, Calendar, Clock, Edit2, FileText, Mail, Save, X, Upload, Paperclip, Download, FileDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Meeting, EmailAttachment, supabase } from '../lib/supabase';
import { generatePDFFromHTML } from '../services/pdfGenerator';
import { EmailComposer } from './EmailComposer';
import { generateEmailBody } from '../services/emailTemplates';

interface MeetingDetailProps {
  meeting: Meeting;
  onBack: () => void;
  onUpdate: () => void;
}

export const MeetingDetail = ({ meeting, onBack, onUpdate }: MeetingDetailProps) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'suggestions'>('summary');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(meeting.title);
  const [editedSummary, setEditedSummary] = useState(meeting.summary || '');
  const [editedTranscript, setEditedTranscript] = useState(meeting.display_transcript || meeting.transcript || '');
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailMethod, setEmailMethod] = useState<'gmail' | 'local' | 'smtp'>('gmail');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [firstName, setFirstName] = useState(meeting.participant_first_name || '');
  const [lastName, setLastName] = useState(meeting.participant_last_name || '');
  const [participantEmail, setParticipantEmail] = useState(meeting.participant_email || '');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [emailAttachments, setEmailAttachments] = useState<EmailAttachment[]>(meeting.email_attachments || []);
  const [senderName, setSenderName] = useState('');
  const [signatureText, setSignatureText] = useState('');
  const [signatureLogoUrl, setSignatureLogoUrl] = useState('');
  const [clarifications, setClarifications] = useState<Array<{ id: string; content: string }>>([]);
  const [topics, setTopics] = useState<Array<{ id: string; topic: string }>>([]);
  const [isDownloadingAudio, setIsDownloadingAudio] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    loadSignature();
    loadSuggestionsData();
    checkAudioAvailability();
  }, [meeting.user_id, meeting.id]);

  const checkAudioAvailability = async () => {
    if (!meeting.audio_url) {
      setAudioAvailable(false);
      return;
    }

    try {
      // Méthode simple : faire une requête HEAD pour vérifier l'existence
      const response = await fetch(meeting.audio_url, { method: 'HEAD' });
      
      if (response.ok) {
        setAudioAvailable(true);
      } else {
        setAudioAvailable(false);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'audio:', error);
      // En cas d'erreur, on suppose que le fichier n'est pas encore disponible
      setAudioAvailable(false);
    }
  };

  const loadSignature = async () => {
    const { data, error } = await supabase
      .from('user_settings')
      .select('sender_name, signature_text, signature_logo_url, email_method')
      .eq('user_id', meeting.user_id)
      .maybeSingle();

    if (error) {
      
    }

    if (data) {
      
      setSenderName(data.sender_name || '');
      setSignatureText(data.signature_text || '');
      setSignatureLogoUrl(data.signature_logo_url || '');
      setEmailMethod(data.email_method || 'gmail');
    } else {
      
    }
  };

  // Préparer le body initial de l'email
  const prepareInitialEmailBody = (): string => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const formatDuration = (seconds: number) => {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    return generateEmailBody({
      title: meeting.title,
      date: formatDate(meeting.created_at),
      duration: meeting.duration ? formatDuration(meeting.duration) : undefined,
      participantName: meeting.participant_first_name && meeting.participant_last_name
        ? `${meeting.participant_first_name} ${meeting.participant_last_name}`
        : undefined,
      participantEmail: meeting.participant_email || undefined,
      summary: meeting.summary || '',
      attachments: emailAttachments,
      senderName,
      signatureText,
      signatureLogoUrl,
    });
  };

  // Gérer l'envoi d'email avec le nouveau composant
  const handleEmailSend = async (emailData: {
    recipients: Array<{ name: string; email: string }>;
    ccRecipients: Array<{ name: string; email: string }>;
    bccRecipients: Array<{ name: string; email: string }>;
    subject: string;
    htmlBody: string;
    textBody: string;
    attachments: EmailAttachment[];
  }) => {
    setIsSendingEmail(true);
    
    try {
      if (emailMethod === 'smtp') {
        // Envoi via SMTP
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Non authentifié');
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/send-email-smtp`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: meeting.user_id,
            to: emailData.recipients.map(r => r.email),
            cc: emailData.ccRecipients.map(r => r.email),
            subject: emailData.subject,
            htmlBody: emailData.htmlBody,
            textBody: emailData.textBody,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Erreur lors de l\'envoi');
        }

        alert('✅ Email envoyé avec succès !');
        setShowEmailComposer(false);
      } else if (emailMethod === 'gmail') {
        // Envoi via Gmail
        const emailList = emailData.recipients.map(r => r.email).join(',');
        const ccList = emailData.ccRecipients.map(r => r.email).join(',');
        
        let gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailList)}`;
        
        if (ccList) {
          gmailUrl += `&cc=${encodeURIComponent(ccList)}`;
        }
        
        gmailUrl += `&su=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.textBody)}`;
        
        if (gmailUrl.length > 8000) {
          alert('⚠️ Le contenu de l\'email est trop long pour Gmail.\n\nVeuillez utiliser l\'option SMTP dans les paramètres pour envoyer des emails longs.');
          return;
        }
        
        window.open(gmailUrl, '_blank');
        setShowEmailComposer(false);
      } else {
        // Envoi via client local
        const emailList = emailData.recipients.map(r => r.email).join(',');
        const ccList = emailData.ccRecipients.map(r => r.email).join(',');
        
        const mailtoLink = `mailto:${emailList}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.textBody)}${ccList ? `&cc=${encodeURIComponent(ccList)}` : ''}`;
        window.location.href = mailtoLink;
        setShowEmailComposer(false);
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      alert(`❌ Erreur lors de l'envoi de l'email:\n${error.message}\n\n${emailMethod === 'smtp' ? 'Vérifiez votre configuration SMTP dans les Paramètres.' : ''}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const loadSuggestionsData = async () => {
    try {
      const [{ data: clarif }, { data: tpcs }] = await Promise.all([
        supabase
          .from('meeting_clarifications')
          .select('id, content')
          .eq('meeting_id', meeting.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('meeting_topics')
          .select('id, topic')
          .eq('meeting_id', meeting.id)
          .order('created_at', { ascending: true })
      ]);

      setClarifications(clarif || []);
      setTopics(tpcs || []);

      // DEBUG: Affichage console pour diagnostic
      // Meeting id + tailles + extraits
      // eslint-disable-next-line no-console
      console.log('Suggestions (history) — meeting_id:', meeting.id, {
        clarifications_count: (clarif || []).length,
        topics_count: (tpcs || []).length,
        clarifications_sample: (clarif || []).slice(0, 3),
        topics_sample: (tpcs || []).slice(0, 3),
      });
    } catch (_e) {
      // pas de log navigateur
    }
  };


  const renderSummaryWithBold = (text: string | null) => {
    if (!text) return <div className="text-cocoa-500 italic">Aucun résumé disponible</div>;
    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
      // Support des checkboxes markdown: - [ ] et - [x]
      const markdownCheckboxMatch = line.match(/^-\s+\[([ x])\]\s+(.+)$/);
      const legacyCheckboxMatch = line.match(/^(☐|☑)\s+(.+)$/);
      
      if (markdownCheckboxMatch || legacyCheckboxMatch) {
        const content = markdownCheckboxMatch ? markdownCheckboxMatch[2] : legacyCheckboxMatch![2];
        const isInitiallyChecked = markdownCheckboxMatch ? markdownCheckboxMatch[1] === 'x' : legacyCheckboxMatch![1] === '☑';
        const itemId = `${lineIndex}-${content}`;
        const isChecked = checkedItems.has(itemId) ? true : (checkedItems.size === 0 && isInitiallyChecked);

        return (
          <div key={lineIndex} className="flex items-start gap-3 mb-2">
            <button
              onClick={() => {
                setCheckedItems(prev => {
                  const newSet = new Set(prev);
                  if (isChecked) {
                    newSet.delete(itemId);
                  } else {
                    newSet.add(itemId);
                  }
                  return newSet;
                });
              }}
              className="flex-shrink-0 w-5 h-5 mt-0.5 border-2 border-coral-500 rounded flex items-center justify-center hover:bg-coral-50 transition-colors"
            >
              {isChecked && (
                <svg className="w-4 h-4 text-coral-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
              )}
            </button>
            <span className={`flex-1 ${isChecked ? 'line-through text-cocoa-400' : 'text-cocoa-800'}`}>
              {content}
            </span>
          </div>
        );
      }

      // Support des titres markdown ### et ####
      if (line.startsWith('### ')) {
        const titleText = line.substring(4).trim();
        return (
          <h3 key={lineIndex} className="text-xl font-bold text-cocoa-800 mt-6 mb-3">
            {titleText}
          </h3>
        );
      }

      if (line.startsWith('#### ')) {
        const titleText = line.substring(5).trim();
        return (
          <h4 key={lineIndex} className="text-lg font-semibold text-cocoa-700 mt-4 mb-2">
            {titleText}
          </h4>
        );
      }

      // Support des listes avec -
      if (line.match(/^-\s+/) && !line.match(/^-\s+\[/)) {
        const content = line.substring(2);
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        const renderedParts = parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const text = part.slice(2, -2);
            return <strong key={index}>{text}</strong>;
          }
          return part;
        });

        return (
          <div key={lineIndex} className="flex items-start gap-2 mb-1">
            <span className="text-coral-600 mt-1 text-sm">•</span>
            <span className="flex-1 text-cocoa-800">{renderedParts}</span>
          </div>
        );
      }

      // Support des sous-listes avec indentation (2 ou 4 espaces)
      if (line.match(/^\s{2,4}-\s+/) && !line.match(/^\s{2,4}-\s+\[/)) {
        const content = line.trim().substring(2);
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        const renderedParts = parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const text = part.slice(2, -2);
            return <strong key={index}>{text}</strong>;
          }
          return part;
        });
        
        return (
          <div key={lineIndex} className="flex items-start gap-2 ml-6 mb-1">
            <span className="text-cocoa-400 mt-1 text-xs">○</span>
            <span className="flex-1 text-cocoa-700">{renderedParts}</span>
          </div>
        );
      }

      // Texte normal avec support du gras **
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const renderedParts = parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const content = part.slice(2, -2);
          return <strong key={index}>{content}</strong>;
        }
        return part;
      });

      return (
        <div key={lineIndex} className={line.trim() === '' ? 'h-2' : ''}>
          {renderedParts}
          {lineIndex < lines.length - 1 && '\n'}
        </div>
      );
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  const handleSave = async () => {
    try {
      let attachmentUrl = meeting.attachment_url;
      let attachmentName = meeting.attachment_name;

      if (uploadedFile) {
        const fileExt = uploadedFile.name.split('.').pop();
        const fileName = `${meeting.id}-${Date.now()}.${fileExt}`;
        const filePath = `${meeting.user_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('meeting-attachments')
          .upload(filePath, uploadedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('meeting-attachments')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
        attachmentName = uploadedFile.name;
      }

      // Créer une version propre pour le résumé (sans séparateurs)
      const cleanTranscript = editedTranscript.replace(/--- \d+s ---/g, '').replace(/\n\n+/g, ' ').trim();
      
      const { error } = await supabase
        .from('meetings')
        .update({
          title: editedTitle,
          summary: editedSummary,
          transcript: cleanTranscript, // Version propre pour le résumé
          display_transcript: editedTranscript, // Version avec séparateurs pour l'affichage
          participant_first_name: firstName,
          participant_last_name: lastName,
          participant_email: participantEmail,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
        })
        .eq('id', meeting.id);

      if (error) throw error;

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      
      alert('Erreur lors de la sauvegarde des modifications');
    }
  };

  const handleCancelEdit = () => {
    setEditedTitle(meeting.title);
    setEditedSummary(meeting.summary || '');
    setEditedTranscript(meeting.transcript || '');
    setIsEditing(false);
  };


  const handleDownloadPDF = async () => {
    try {
      await generatePDFFromHTML(
        meeting.title,
        meeting.summary || ''
      );
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
    }
  };

  const handleDownloadAudio = async () => {
    if (!meeting.audio_url) {
      alert('Aucun fichier audio disponible pour cette réunion.');
      return;
    }

    setIsDownloadingAudio(true);

    try {
      // Télécharger directement depuis l'URL
      const response = await fetch(meeting.audio_url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audio_${meeting.title.replace(/[^a-z0-9]/gi, '_')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Marquer l'audio comme disponible
      setAudioAvailable(true);
    } catch (error: any) {
      console.error('Erreur lors du téléchargement de l\'audio:', error);
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        alert('L\'audio n\'est pas encore disponible. Veuillez patienter quelques instants et réessayer.');
        setAudioAvailable(false);
        // Revérifier après quelques secondes
        setTimeout(() => checkAudioAvailability(), 3000);
      } else {
        alert('Erreur lors du téléchargement de l\'audio. Veuillez réessayer.');
      }
    } finally {
      setIsDownloadingAudio(false);
    }
  };



  return (
    <>
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border-2 border-orange-100">
        <div className="border-b-2 border-orange-100">
          <div className="p-4 md:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
              <button
                onClick={onBack}
                className="flex items-center gap-1 md:gap-2 text-cocoa-600 hover:text-coral-600 transition-colors font-semibold text-sm md:text-base"
              >
                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                <span className="md:text-lg">Retour à l'historique</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1 md:gap-2 px-3 md:px-5 py-2 md:py-3 text-cocoa-600 hover:text-cocoa-800 hover:bg-orange-50 rounded-lg md:rounded-xl transition-colors font-semibold text-sm md:text-base flex-1 sm:flex-initial justify-center"
                    >
                      <X className="w-4 h-4 md:w-5 md:h-5" />
                      <span>Annuler</span>
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1 md:gap-2 px-3 md:px-5 py-2 md:py-3 bg-gradient-to-r from-coral-500 to-coral-600 text-white hover:from-coral-600 hover:to-coral-700 rounded-lg md:rounded-xl transition-all shadow-lg shadow-coral-500/30 text-sm md:text-base flex-1 sm:flex-initial justify-center"
                    >
                      <Save className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="font-semibold">Enregistrer</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleDownloadPDF}
                      className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 rounded-lg transition-all shadow-sm font-semibold text-sm flex-1 sm:flex-initial justify-center"
                    >
                      <FileDown className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="hidden sm:inline">Télécharger PDF</span>
                      <span className="sm:hidden">PDF</span>
                    </button>
                    
                    {/* Bouton télécharger audio */}
                    {meeting.audio_url && (
                      <button
                        onClick={audioAvailable === false ? checkAudioAvailability : handleDownloadAudio}
                        disabled={isDownloadingAudio}
                        className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all shadow-sm font-semibold text-sm flex-1 sm:flex-initial justify-center ${
                          audioAvailable === false
                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                            : isDownloadingAudio
                            ? 'bg-blue-400 text-white cursor-wait'
                            : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                        }`}
                        title={audioAvailable === false ? 'Cliquez pour revérifier la disponibilité' : 'Télécharger l\'audio'}
                      >
                        {isDownloadingAudio ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span className="hidden sm:inline">Téléchargement...</span>
                          </>
                        ) : audioAvailable === false ? (
                          <>
                            <Clock className="w-4 h-4 md:w-5 md:h-5" />
                            <span className="hidden sm:inline">Revérifier l'audio</span>
                            <span className="sm:hidden">Revérifier</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 md:w-5 md:h-5" />
                            <span className="hidden sm:inline">Télécharger Audio</span>
                            <span className="sm:hidden">Audio</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => setShowEmailComposer(true)}
                      className="flex items-center gap-1 md:gap-2 px-3 md:px-5 py-2 md:py-3 text-cocoa-600 hover:text-cocoa-800 hover:bg-orange-50 rounded-lg md:rounded-xl transition-colors font-semibold border-2 border-transparent hover:border-orange-200 text-sm md:text-base flex-1 sm:flex-initial justify-center"
                    >
                      <Mail className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="hidden sm:inline">Envoyer par email</span>
                      <span className="sm:hidden">Email</span>
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 md:gap-2 px-3 md:px-5 py-2 md:py-3 text-cocoa-600 hover:text-cocoa-800 hover:bg-orange-50 rounded-lg md:rounded-xl transition-colors font-semibold border-2 border-transparent hover:border-orange-200 text-sm md:text-base flex-1 sm:flex-initial justify-center"
                    >
                      <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="hidden sm:inline">Modifier</span>
                      <span className="sm:hidden">Modifier</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 md:gap-5">
              <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-coral-500 to-sunset-500 rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl">
                <FileText className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-xl md:text-4xl font-bold text-cocoa-800 mb-2 md:mb-4 w-full border-b-2 border-coral-500 focus:outline-none bg-transparent"
                  />
                ) : (
                  <h1 className="text-xl md:text-4xl font-bold bg-gradient-to-r from-coral-600 to-sunset-600 bg-clip-text text-transparent mb-2 md:mb-4 break-words">
                    {meeting.title}
                  </h1>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-cocoa-600 font-medium text-xs md:text-base">
                  <div className="flex items-center gap-1 md:gap-2">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-sunset-500" />
                    <span className="truncate">{formatDate(meeting.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-sunset-500" />
                    <span>Durée : {formatDuration(meeting.duration)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 md:px-8 border-t-2 border-orange-100 bg-gradient-to-r from-orange-50/50 to-red-50/50 overflow-x-auto">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 md:px-8 py-3 md:py-4 text-sm md:text-base font-bold transition-all relative rounded-t-xl whitespace-nowrap ${
                activeTab === 'summary'
                  ? 'text-coral-600 bg-white'
                  : 'text-cocoa-600 hover:text-coral-500 hover:bg-orange-50/50'
              }`}
            >
              Résumé
              {activeTab === 'summary' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-coral-500 to-sunset-500 rounded-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`px-4 md:px-8 py-3 md:py-4 text-sm md:text-base font-bold transition-all relative rounded-t-xl whitespace-nowrap ${
                activeTab === 'transcript'
                  ? 'text-coral-600 bg-white'
                  : 'text-cocoa-600 hover:text-coral-500 hover:bg-orange-50/50'
              }`}
            >
              Transcription
              {activeTab === 'transcript' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-coral-500 to-sunset-500 rounded-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`px-4 md:px-8 py-3 md:py-4 text-sm md:text-base font-bold transition-all relative rounded-t-xl whitespace-nowrap ${
                activeTab === 'suggestions'
                  ? 'text-coral-600 bg-white'
                  : 'text-cocoa-600 hover:text-coral-500 hover:bg-orange-50/50'
              }`}
            >
              Suggestions
              {activeTab === 'suggestions' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-coral-500 to-sunset-500 rounded-full"></div>
              )}
            </button>
          </div>
        </div>

        <div className="p-10 min-h-[500px]">
          {isEditing && (
            <div className="max-w-4xl mb-8">
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border-2 border-orange-100">
                <h3 className="text-xl font-bold text-cocoa-800 mb-4">Informations du participant</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-cocoa-700 mb-2">Prénom</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Prénom"
                      className="w-full px-4 py-2 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-cocoa-700 mb-2">Nom</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Nom"
                      className="w-full px-4 py-2 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-cocoa-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={participantEmail}
                    onChange={(e) => setParticipantEmail(e.target.value)}
                    placeholder="email@exemple.com"
                    className="w-full px-4 py-2 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-cocoa-700 mb-2">Fichier joint</label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center gap-2 px-4 py-2 border-2 border-orange-200 rounded-xl hover:border-coral-500 cursor-pointer transition-colors bg-white">
                      <Upload className="w-5 h-5 text-coral-600" />
                      <span className="text-cocoa-700">{uploadedFile ? uploadedFile.name : 'Choisir un fichier'}</span>
                      <input
                        type="file"
                        onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    {meeting.attachment_name && !uploadedFile && (
                      <a
                        href={meeting.attachment_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-coral-500 text-white rounded-xl hover:bg-coral-600 transition-colors"
                      >
                        <Paperclip className="w-4 h-4" />
                        {meeting.attachment_name}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isEditing && (meeting.participant_first_name || meeting.participant_last_name || meeting.participant_email || meeting.attachment_name) && (
            <div className="max-w-4xl mb-8">
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border-2 border-orange-100">
                <h3 className="text-xl font-bold text-cocoa-800 mb-4">Informations du participant</h3>
                {(meeting.participant_first_name || meeting.participant_last_name) && (
                  <p className="text-cocoa-700 mb-2">
                    <span className="font-semibold">Nom :</span> {meeting.participant_first_name} {meeting.participant_last_name}
                  </p>
                )}
                {meeting.participant_email && (
                  <p className="text-cocoa-700 mb-2">
                    <span className="font-semibold">Email :</span> {meeting.participant_email}
                  </p>
                )}
                {meeting.attachment_name && (
                  <div className="mt-3">
                    <span className="font-semibold text-cocoa-700">Fichier joint :</span>
                    <a
                      href={meeting.attachment_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 ml-2 px-4 py-2 bg-coral-500 text-white rounded-xl hover:bg-coral-600 transition-colors"
                    >
                      <Paperclip className="w-4 h-4" />
                      {meeting.attachment_name}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'summary' ? (
            <div className="max-w-4xl">
              {meeting.notes && (
                <div className="mb-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-amber-600" />
                    <h4 className="text-lg font-bold text-cocoa-800">Notes prises pendant l'enregistrement</h4>
                  </div>
                  <p className="text-cocoa-700 whitespace-pre-wrap leading-relaxed">
                    {meeting.notes}
                  </p>
                </div>
              )}

              {isEditing ? (
                <textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  className="w-full min-h-[400px] p-6 border-2 border-orange-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500 text-cocoa-800 text-lg leading-relaxed"
                />
              ) : (
                <div className="prose prose-slate max-w-none">
                  <div className="text-cocoa-800 whitespace-pre-wrap leading-relaxed text-lg">
                    {renderSummaryWithBold(meeting.summary)}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'transcript' ? (
            <div className="max-w-4xl">
              {isEditing ? (
                <textarea
                  value={editedTranscript}
                  onChange={(e) => setEditedTranscript(e.target.value)}
                  className="w-full min-h-[400px] p-6 border-2 border-orange-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500 text-cocoa-800 text-lg leading-relaxed"
                />
              ) : (
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8 border-2 border-orange-100">
                  <div className="max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-coral-300 scrollbar-track-coral-100">
                    {(meeting.display_transcript || meeting.transcript) ? (
                      <div className="space-y-3">
                        {(meeting.display_transcript || meeting.transcript || '').split(/--- \d+s ---/).map((chunk, index) => {
                          if (!chunk.trim()) return null;
                          
                          const timeInSeconds = index * 15;
                          const minutes = Math.floor(timeInSeconds / 60);
                          const seconds = timeInSeconds % 60;
                          const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                          
                          return (
                            <div key={index} className="relative">
                              {/* Séparateur élégant avec timestamp */}
                              {index > 0 && (
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-coral-200 to-transparent"></div>
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-coral-200">
                                    <div className="w-1.5 h-1.5 bg-coral-500 rounded-full animate-pulse"></div>
                                    <span className="text-coral-700 text-xs font-medium">{timeLabel}</span>
                                  </div>
                                  <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-coral-200 to-transparent"></div>
                                </div>
                              )}
                              
                              {/* Contenu du chunk avec header */}
                              <div className="bg-white rounded-xl shadow-sm border border-coral-100 overflow-hidden">
                                {/* Header du chunk */}
                                <div className="bg-gradient-to-r from-coral-50 to-orange-50 px-3 py-1.5 border-b border-coral-100">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 bg-coral-500 rounded-full"></div>
                                    <span className="text-coral-600 text-xs font-semibold uppercase tracking-wide">
                                      Segment {index + 1}
                                    </span>
                                    <span className="text-coral-400 text-xs">•</span>
                                    <span className="text-coral-500 text-xs">
                                      {timeLabel}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Contenu */}
                                <div className="p-3">
                                  <p className="text-cocoa-700 leading-relaxed text-sm">
                                    {chunk.trim()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-cocoa-500 text-center py-8">Aucune transcription disponible</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-4xl">
              {(clarifications.length > 0 || topics.length > 0) ? (
                <div className="space-y-4">
                  {clarifications.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 border-2 border-purple-100 shadow-sm">
                      <h4 className="text-sm font-bold text-purple-900 mb-3">Points à clarifier</h4>
                      <div className="max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-100">
                        <ul className="space-y-2">
                        {clarifications.map((c) => (
                          <li key={c.id} className="flex items-start gap-2">
                              <span className="text-purple-500 mt-1 flex-shrink-0">•</span>
                              <span className="text-cocoa-700 text-sm leading-relaxed">{c.content}</span>
                          </li>
                        ))}
                      </ul>
                      </div>
                    </div>
                  )}
                  {topics.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 border-2 border-purple-100 shadow-sm">
                      <h4 className="text-sm font-bold text-purple-900 mb-3">Sujets à explorer</h4>
                      <div className="max-h-32 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-100">
                      <div className="flex flex-wrap gap-2">
                        {topics.map((t) => (
                          <span key={t.id} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                            {t.topic}
                          </span>
                        ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 border-2 border-gray-200 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-gray-600 font-medium">Aucune suggestion disponible</p>
                  <p className="text-sm text-gray-500 mt-2">Les suggestions sont générées pendant l'enregistrement</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Nouveau composant EmailComposer */}
      {showEmailComposer && (
        <EmailComposer
          subject={meeting.title}
          initialBody={prepareInitialEmailBody()}
          recipients={[{ name: '', email: '' }]}
          ccRecipients={[]}
          bccRecipients={[]}
          attachments={emailAttachments}
          onSend={handleEmailSend}
          onClose={() => setShowEmailComposer(false)}
          isSending={isSendingEmail}
        />
      )}

    </>
  );
};
