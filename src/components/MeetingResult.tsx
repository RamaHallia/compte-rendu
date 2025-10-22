import { ArrowLeft, Calendar, FileText, Mail, Plus, Trash2, Download, Upload, Copy, FileDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase, EmailAttachment } from '../lib/supabase';
import { generatePDFFromHTML } from '../services/pdfGenerator';
import { EmailComposer } from './EmailComposer';
import { generateEmailBody } from '../services/emailTemplates';
import { SuccessModal } from './SuccessModal';

interface MeetingResultProps {
  title: string;
  transcript: string;
  summary: string;
  suggestions?: Array<{
    segment_number?: number;
    summary?: string;
    key_points?: string[];
    suggestions?: string[];
    topics_to_explore?: string[];
    timestamp?: number;
  }>;
  userId: string;
  onClose: () => void;
}

export const MeetingResult = ({ title, transcript, summary, suggestions = [], userId, onClose }: MeetingResultProps) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'suggestions'>('summary');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailMethod, setEmailMethod] = useState<'gmail' | 'local' | 'smtp'>('gmail');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Charger les paramètres utilisateur
  useEffect(() => {
    const loadSettings = async () => {
      if (!userId) return;
      
      const { data } = await supabase
        .from('user_settings')
        .select('email_method')
        .eq('user_id', userId)
        .maybeSingle();

      if (data?.email_method) {
        setEmailMethod(data.email_method);
      }
    };

    loadSettings();
  }, [userId]);

  const handleDownloadPDF = async () => {
    try {
      await generatePDFFromHTML(title, summary);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
    }
  };

  const formatDate = () => {
    const date = new Date();
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCopyReport = async () => {
    const report = `${title}\n\n${summary}`;
    try {
      await navigator.clipboard.writeText(report);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      alert('Erreur lors de la copie');
    }
  };

  // Préparer le body initial de l'email
  const prepareInitialEmailBody = (): string => {
    return generateEmailBody({
      title,
      date: formatDate(),
      summary,
      attachments: [],
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
            userId,
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

        setSuccessMessage('Email envoyé avec succès via SMTP !');
        setShowSuccessModal(true);
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
        setSuccessMessage('Gmail ouvert dans un nouvel onglet. Veuillez finaliser l\'envoi dans Gmail.');
        setShowSuccessModal(true);
        setShowEmailComposer(false);
      } else {
        // Envoi via client local
        const emailList = emailData.recipients.map(r => r.email).join(',');
        const ccList = emailData.ccRecipients.map(r => r.email).join(',');
        
        const mailtoLink = `mailto:${emailList}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.textBody)}${ccList ? `&cc=${encodeURIComponent(ccList)}` : ''}`;

        // Utiliser un lien temporaire au lieu de window.location.href
        const link = document.createElement('a');
        link.href = mailtoLink;
        link.click();

        setSuccessMessage('Votre client email local a été ouvert. Veuillez finaliser l\'envoi.');
        setShowSuccessModal(true);
        setShowEmailComposer(false);
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      alert(`❌ Erreur lors de l'envoi de l'email:\n${error.message}\n\n${emailMethod === 'smtp' ? 'Vérifiez votre configuration SMTP dans les Paramètres.' : ''}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownloadReport = () => {
    const report = `${title}\n\n${summary}`;
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_resume.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const convertMarkdownToPlainText = (text: string) => {
    let plainText = text;
    
    // Convertir les titres ### et #### en MAJUSCULES pour les faire ressortir
    plainText = plainText.replace(/^### (.+)$/gm, '$1'.toUpperCase());
    plainText = plainText.replace(/^#### (.+)$/gm, '$1'.toUpperCase());
    
    // Supprimer le texte en gras **texte** et le garder normal
    plainText = plainText.replace(/\*\*([^*]+)\*\*/g, '$1');
    
    // Améliorer les checkboxes [ ] et [x]
    plainText = plainText.replace(/^- \[ \] (.+)$/gm, '☐ $1');
    plainText = plainText.replace(/^- \[x\] (.+)$/gm, '☑ $1');
    
    // Améliorer les listes avec -
    plainText = plainText.replace(/^- (.+)$/gm, '• $1');
    
    // Améliorer les sous-listes avec indentation
    plainText = plainText.replace(/^  - (.+)$/gm, '  ○ $1');
    
    return plainText;
  };

  const convertMarkdownToRichText = (text: string) => {
    let richText = text;
    
    // Convertir les titres ### en texte en gras (sans emoji, séparateur court)
    richText = richText.replace(/^### (.+)$/gm, '\n$1\n' + '-'.repeat(30));
    
    // Convertir les titres #### en texte simple
    richText = richText.replace(/^#### (.+)$/gm, '\n> $1');
    
    // Convertir le texte en gras **texte** en utilisant des caractères Unicode gras
    richText = richText.replace(/\*\*([^*]+)\*\*/g, (match, p1) => {
      // Convertir en caractères gras Unicode
      return p1.split('').map((char: string) => {
        const code = char.charCodeAt(0);
        // A-Z -> 𝗔-𝗭
        if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D5D4 + (code - 65));
        // a-z -> 𝗮-𝘇
        if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D5EE + (code - 97));
        // 0-9 -> 𝟬-𝟵
        if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7EC + (code - 48));
        return char;
      }).join('');
    });
    
    // Convertir les checkboxes [ ] et [x] (sans emoji)
    richText = richText.replace(/^- \[ \] (.+)$/gm, '  [ ] $1');
    richText = richText.replace(/^- \[x\] (.+)$/gm, '  [x] $1');
    
    // Convertir les listes avec -
    richText = richText.replace(/^- (.+)$/gm, '  - $1');
    
    // Améliorer les sous-listes avec indentation
    richText = richText.replace(/^  - (.+)$/gm, '    - $1');
    
    return richText;
  };

  const renderSummaryWithBold = (text: string) => {
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


  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl md:rounded-3xl max-w-4xl w-full max-h-[95vh] md:max-h-[90vh] overflow-hidden shadow-2xl border-2 border-orange-100 flex flex-col">
        <div className="border-b-2 border-orange-100">
          <div className="p-4 md:p-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <button
                onClick={onClose}
                className="flex items-center gap-1 md:gap-2 text-cocoa-600 hover:text-coral-600 transition-colors font-semibold text-sm md:text-base"
              >
                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                <span className="md:text-lg">Fermer</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyReport}
                  className="p-2 md:p-3 bg-gray-100 hover:bg-gray-200 text-cocoa-700 rounded-lg transition-all shadow-sm"
                  title="Copier le rapport"
                >
                  <Copy className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 rounded-lg transition-all shadow-sm font-semibold"
                  title="Télécharger en PDF"
                >
                  <FileDown className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline text-sm">Télécharger PDF</span>
                </button>
                <button
                  onClick={() => setShowEmailComposer(true)}
                  className="flex items-center gap-1 md:gap-2 px-3 md:px-5 py-2 md:py-3 bg-gradient-to-r from-coral-500 to-coral-600 text-white hover:from-coral-600 hover:to-coral-700 rounded-lg md:rounded-xl transition-all font-semibold shadow-lg shadow-coral-500/30 text-sm md:text-base"
                >
                  <Mail className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Envoyer par email</span>
                  <span className="sm:hidden">Email</span>
                </button>
              </div>
            </div>
            
            {copySuccess && (
              <div className="mt-2 text-right">
                <span className="text-sm text-green-600 font-semibold">✓ Copié !</span>
              </div>
            )}

            <div className="flex items-start gap-3 md:gap-5">
              <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-coral-500 to-sunset-500 rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl">
                <FileText className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-4xl font-bold bg-gradient-to-r from-coral-600 to-sunset-600 bg-clip-text text-transparent mb-2 md:mb-4 break-words">
                  {title}
                </h1>
                <div className="flex items-center gap-3 md:gap-6 text-cocoa-600 font-medium text-xs md:text-base">
                  <div className="flex items-center gap-1 md:gap-2">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-sunset-500" />
                    <span className="truncate">{formatDate()}</span>
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

        <div className="overflow-y-auto p-4 md:p-10 flex-1">
          {activeTab === 'summary' ? (
            <div className="max-w-4xl">
              <div className="prose prose-slate max-w-none">
                <div className="text-cocoa-800 whitespace-pre-wrap leading-relaxed text-lg">
                  {renderSummaryWithBold(summary)}
                </div>
              </div>
            </div>
          ) : activeTab === 'transcript' ? (
            <div className="max-w-4xl">
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8 border-2 border-orange-100">
                <div className="max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-coral-300 scrollbar-track-coral-100">
                  {transcript ? (
                    <div className="space-y-3">
                      {transcript.split(/--- \d+s ---/).map((chunk, index) => {
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
            </div>
          ) : (
            <div className="max-w-4xl">
              {suggestions && suggestions.length > 0 ? (
                <div className="space-y-4">
                  {suggestions.some(s => s.suggestions && s.suggestions.length > 0) && (
                    <div className="bg-white rounded-2xl p-6 border-2 border-purple-100 shadow-sm">
                      <h4 className="text-sm font-bold text-purple-900 mb-2">Points à clarifier</h4>
                      <div className="max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-50">
                        <ul className="space-y-1">
                          {suggestions.flatMap(s => s.suggestions || []).map((q, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-purple-500 mt-1">•</span>
                              <span className="text-cocoa-700">{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  {suggestions.some(s => s.topics_to_explore && s.topics_to_explore.length > 0) && (
                    <div className="bg-white rounded-2xl p-6 border-2 border-purple-100 shadow-sm">
                      <h4 className="text-sm font-bold text-purple-900 mb-2">Sujets à explorer</h4>
                      <div className="max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-50">
                        <div className="flex flex-wrap gap-2">
                          {suggestions.flatMap(s => s.topics_to_explore || []).map((t, idx) => (
                            <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                              {t}
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
          subject={title}
          initialBody={prepareInitialEmailBody()}
          recipients={[{ name: '', email: '' }]}
          ccRecipients={[]}
          bccRecipients={[]}
          attachments={[]}
          onSend={handleEmailSend}
          onClose={() => setShowEmailComposer(false)}
          isSending={isSendingEmail}
        />
      )}

      {/* Modal de succès */}
      <SuccessModal
        isOpen={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  );
};
