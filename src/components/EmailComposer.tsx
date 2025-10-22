import { X, Plus, Trash2, Send, Paperclip, Upload, Download } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './EmailComposer.css';
import { EmailAttachment, supabase } from '../lib/supabase';

interface Recipient {
  name: string;
  email: string;
}

interface EmailComposerProps {
  subject: string;
  initialBody: string;
  recipients: Recipient[];
  ccRecipients?: Recipient[];
  bccRecipients?: Recipient[];
  attachments?: EmailAttachment[];
  onSend: (data: {
    recipients: Recipient[];
    ccRecipients: Recipient[];
    bccRecipients: Recipient[];
    subject: string;
    htmlBody: string;
    textBody: string;
    attachments: EmailAttachment[];
  }) => Promise<void>;
  onClose: () => void;
  isSending: boolean;
}

export function EmailComposer({
  subject: initialSubject,
  initialBody,
  recipients: initialRecipients,
  ccRecipients: initialCcRecipients = [],
  bccRecipients: initialBccRecipients = [],
  attachments: initialAttachments = [],
  onSend,
  onClose,
  isSending,
}: EmailComposerProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients.length > 0 ? initialRecipients : [{ name: '', email: '' }]);
  const [ccRecipients, setCcRecipients] = useState<Recipient[]>(initialCcRecipients);
  const [bccRecipients, setBccRecipients] = useState<Recipient[]>(initialBccRecipients);
  const [showCC, setShowCC] = useState(initialCcRecipients.length > 0);
  const [showBCC, setShowBCC] = useState(initialBccRecipients.length > 0);
  const [attachments, setAttachments] = useState<EmailAttachment[]>(initialAttachments);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quillRef = useRef<ReactQuill>(null);

  // Mettre à jour le corps de l'email quand les pièces jointes changent
  useEffect(() => {
    // Éviter la boucle infinie en vérifiant si une mise à jour est nécessaire
    const hasAttachmentsSection = body.includes('Documents joints');
    const shouldHaveAttachmentsSection = attachments.length > 0;

    // Si la section existe et qu'elle devrait exister, ou si elle n'existe pas et qu'elle ne devrait pas exister
    if (hasAttachmentsSection === shouldHaveAttachmentsSection && hasAttachmentsSection) {
      // Vérifier si les pièces jointes dans le body correspondent aux pièces jointes actuelles
      const allAttachmentsPresent = attachments.every(att => body.includes(att.name));
      if (allAttachmentsPresent) {
        return; // Pas besoin de mise à jour
      }
    } else if (!hasAttachmentsSection && !shouldHaveAttachmentsSection) {
      return; // Pas besoin de mise à jour
    }

    // Retirer d'abord toute section existante de pièces jointes
    let bodyWithoutAttachments = body.replace(/<hr[^>]*>[\s\S]*?<h2[^>]*>Documents joints<\/h2>[\s\S]*?<\/ul>\s*/g, '');

    if (attachments.length > 0) {
      // Ajouter la section des pièces jointes avant "Je reste à votre disposition"
      let attachmentsHtml = `<hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">

<h2 style="color: #EF6855; font-size: 1.3em; margin-bottom: 15px;">Documents joints</h2>
<ul style="list-style-type: none; padding: 0;">
`;
      attachments.forEach(att => {
        attachmentsHtml += `  <li style="margin-bottom: 8px;">📎 <a href="${att.url}" style="color: #EF6855; text-decoration: none; font-weight: 500;">${att.name}</a></li>\n`;
      });
      attachmentsHtml += `</ul>\n\n`;

      // Trouver où insérer (juste avant "Je reste à votre disposition")
      const dispositionText = '<p>Je reste à votre disposition';
      const insertPosition = bodyWithoutAttachments.indexOf(dispositionText);

      if (insertPosition !== -1) {
        const newBody = bodyWithoutAttachments.slice(0, insertPosition) +
                        attachmentsHtml +
                        bodyWithoutAttachments.slice(insertPosition);
        setBody(newBody);
      }
    } else {
      if (bodyWithoutAttachments !== body) {
        setBody(bodyWithoutAttachments);
      }
    }
  }, [attachments]);

  // Configuration de l'éditeur Quill
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link'
  ];

  // Gestion des destinataires
  const addRecipient = () => {
    setRecipients(prev => [...prev, { name: '', email: '' }]);
  };

  const removeRecipient = (index: number) => {
    setRecipients(prev => prev.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, field: 'name' | 'email', value: string) => {
    setRecipients(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  // Gestion CC
  const addCcRecipient = () => {
    setCcRecipients(prev => [...prev, { name: '', email: '' }]);
  };

  const removeCcRecipient = (index: number) => {
    setCcRecipients(prev => prev.filter((_, i) => i !== index));
  };

  const updateCcRecipient = (index: number, field: 'name' | 'email', value: string) => {
    setCcRecipients(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  // Gestion BCC
  const addBccRecipient = () => {
    setBccRecipients(prev => [...prev, { name: '', email: '' }]);
  };

  const removeBccRecipient = (index: number) => {
    setBccRecipients(prev => prev.filter((_, i) => i !== index));
  };

  const updateBccRecipient = (index: number, field: 'name' | 'email', value: string) => {
    setBccRecipients(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  // Gestion des pièces jointes
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier la taille du fichier (limite à 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('❌ Le fichier est trop volumineux. Taille maximale: 10 MB');
      return;
    }

    setIsUploadingAttachment(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `email-attachments/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('meeting-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('meeting-attachments')
        .getPublicUrl(fileName);

      const newAttachment: EmailAttachment = {
        name: file.name,
        url: urlData.publicUrl,
        size: file.size,
        type: file.type
      };

      setAttachments(prev => [...prev, newAttachment]);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('❌ Erreur lors du téléchargement du fichier');
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Conversion HTML vers texte brut
  const htmlToPlainText = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Envoi de l'email
  const handleSend = async () => {
    // Validation
    const validRecipients = recipients.filter(r => r.email.trim());
    if (validRecipients.length === 0) {
      alert('❌ Veuillez ajouter au moins un destinataire');
      return;
    }

    if (!subject.trim()) {
      alert('❌ Veuillez saisir un objet');
      return;
    }

    const validCcRecipients = ccRecipients.filter(r => r.email.trim());
    const validBccRecipients = bccRecipients.filter(r => r.email.trim());

    await onSend({
      recipients: validRecipients,
      ccRecipients: validCcRecipients,
      bccRecipients: validBccRecipients,
      subject,
      htmlBody: body,
      textBody: htmlToPlainText(body),
      attachments,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#EF6855] via-[#E5503F] to-[#D64838] text-white p-6 flex justify-between items-center z-10 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Nouveau message</h2>
              <p className="text-sm text-white/80">Composez et envoyez votre email</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSending}
            className="p-2 hover:bg-white/20 rounded-xl transition-all disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Destinataires */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700 w-16">À:</label>
              <div className="flex-1 space-y-2">
                {recipients.map((recipient, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nom"
                      value={recipient.name}
                      onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF6855] focus:border-transparent"
                      disabled={isSending}
                    />
                    <input
                      type="email"
                      placeholder="email@exemple.com"
                      value={recipient.email}
                      onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                      className="flex-[2] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF6855] focus:border-transparent"
                      disabled={isSending}
                      required
                    />
                    {recipients.length > 1 && (
                      <button
                        onClick={() => removeRecipient(index)}
                        disabled={isSending}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addRecipient}
                  disabled={isSending}
                  className="flex items-center gap-2 text-sm text-[#EF6855] hover:text-[#E5503F] font-medium disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un destinataire
                </button>
              </div>
            </div>

            {/* Boutons CC/BCC */}
            <div className="flex gap-3 ml-[4.5rem]">
              {!showCC && (
                <button
                  onClick={() => {
                    setShowCC(true);
                    if (ccRecipients.length === 0) {
                      setCcRecipients([{ name: '', email: '' }]);
                    }
                  }}
                  disabled={isSending}
                  className="text-sm text-[#EF6855] hover:text-[#E5503F] font-medium disabled:opacity-50"
                >
                  + CC
                </button>
              )}
              {!showBCC && (
                <button
                  onClick={() => {
                    setShowBCC(true);
                    if (bccRecipients.length === 0) {
                      setBccRecipients([{ name: '', email: '' }]);
                    }
                  }}
                  disabled={isSending}
                  className="text-sm text-[#EF6855] hover:text-[#E5503F] font-medium disabled:opacity-50"
                >
                  + BCC
                </button>
              )}
            </div>

            {/* CC Recipients */}
            {showCC && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700 w-16">CC:</label>
                <div className="flex-1 space-y-2">
                  {ccRecipients.map((recipient, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nom"
                        value={recipient.name}
                        onChange={(e) => updateCcRecipient(index, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF6855] focus:border-transparent"
                        disabled={isSending}
                      />
                      <input
                        type="email"
                        placeholder="email@exemple.com"
                        value={recipient.email}
                        onChange={(e) => updateCcRecipient(index, 'email', e.target.value)}
                        className="flex-[2] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF6855] focus:border-transparent"
                        disabled={isSending}
                      />
                      <button
                        onClick={() => {
                          removeCcRecipient(index);
                          if (ccRecipients.length === 1) {
                            setShowCC(false);
                          }
                        }}
                        disabled={isSending}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addCcRecipient}
                    disabled={isSending}
                    className="flex items-center gap-2 text-sm text-[#EF6855] hover:text-[#E5503F] font-medium disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter CC
                  </button>
                </div>
              </div>
            )}

            {/* BCC Recipients */}
            {showBCC && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700 w-16">BCC:</label>
                <div className="flex-1 space-y-2">
                  {bccRecipients.map((recipient, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nom"
                        value={recipient.name}
                        onChange={(e) => updateBccRecipient(index, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF6855] focus:border-transparent"
                        disabled={isSending}
                      />
                      <input
                        type="email"
                        placeholder="email@exemple.com"
                        value={recipient.email}
                        onChange={(e) => updateBccRecipient(index, 'email', e.target.value)}
                        className="flex-[2] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF6855] focus:border-transparent"
                        disabled={isSending}
                      />
                      <button
                        onClick={() => {
                          removeBccRecipient(index);
                          if (bccRecipients.length === 1) {
                            setShowBCC(false);
                          }
                        }}
                        disabled={isSending}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addBccRecipient}
                    disabled={isSending}
                    className="flex items-center gap-2 text-sm text-[#EF6855] hover:text-[#E5503F] font-medium disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter BCC
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Objet */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700 w-16">Objet:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet de l'email"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF6855] focus:border-transparent"
              disabled={isSending}
              required
            />
          </div>

          {/* Pièces jointes */}
          <div className="border border-gray-300 rounded-lg p-4 bg-gradient-to-br from-orange-50 to-red-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-[#EF6855]" />
                <span className="text-sm font-semibold text-gray-700">
                  Pièces jointes {attachments.length > 0 && `(${attachments.length})`}
                </span>
              </div>
              <label className="cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isSending || isUploadingAttachment}
                />
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#EF6855] to-[#E5503F] text-white rounded-lg hover:from-[#E5503F] hover:to-[#D64838] transition-all font-semibold text-sm shadow-md hover:shadow-lg disabled:opacity-50">
                  {isUploadingAttachment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Upload...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Ajouter un fichier</span>
                    </>
                  )}
                </div>
              </label>
            </div>
            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((attachment, index) => (
                  <div key={index} className="attachment-item flex items-center justify-between bg-white p-3 rounded-lg border-2 border-orange-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Paperclip className="w-4 h-4 text-[#EF6855] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{attachment.name}</p>
                        <p className="text-xs text-gray-500">{(attachment.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-[#EF6855] hover:bg-orange-100 rounded-lg transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => removeAttachment(index)}
                        disabled={isSending}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic text-center py-2">Aucune pièce jointe pour le moment</p>
            )}
          </div>

          {/* Éditeur de contenu */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Message:</label>
            <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-white email-composer-quill shadow-sm" style={{ height: '400px' }}>
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={body}
                onChange={setBody}
                modules={modules}
                formats={formats}
                placeholder="Écrivez votre message ici..."
                style={{ height: '340px' }}
                readOnly={isSending}
              />
            </div>
          </div>
        </div>

        {/* Footer avec boutons d'action */}
        <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-5 border-t-2 border-gray-200 flex justify-between items-center shadow-inner">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSending}
              className="px-6 py-2.5 text-gray-700 bg-white hover:bg-gray-50 border-2 border-gray-300 rounded-xl font-semibold transition-all disabled:opacity-50 shadow-sm hover:shadow"
            >
              Annuler
            </button>
            {attachments.length > 0 && (
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                {attachments.length} fichier{attachments.length > 1 ? 's' : ''} joint{attachments.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={isSending}
            className="px-8 py-3 bg-gradient-to-r from-[#EF6855] via-[#E5503F] to-[#D64838] text-white rounded-xl font-bold hover:from-[#E5503F] hover:via-[#D64838] hover:to-[#C73E2E] transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-105"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Envoyer le message
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

