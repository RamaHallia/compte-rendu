import { X, Plus, Trash2, Send, Paperclip } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './EmailComposer.css';
import { EmailAttachment } from '../lib/supabase';

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

  const quillRef = useRef<ReactQuill>(null);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#EF6855] to-[#E5503F] text-white p-6 rounded-t-2xl flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Send className="w-6 h-6" />
            Nouveau message
          </h2>
          <button
            onClick={onClose}
            disabled={isSending}
            className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
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
          {attachments.length > 0 && (
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <Paperclip className="w-5 h-5 text-[#EF6855] hover:text-[#E5503F]600" />
                <span className="text-sm font-semibold text-gray-700">
                  Pièces jointes ({attachments.length})
                </span>
              </div>
              <div className="space-y-2">
                {attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#EF6855] hover:text-[#E5503F] hover:underline flex-1 truncate"
                    >
                      {attachment.name}
                    </a>
                    <button
                      onClick={() => removeAttachment(index)}
                      disabled={isSending}
                      className="ml-3 p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Éditeur de contenu */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Message:</label>
            <div className="border border-gray-300 rounded-lg overflow-hidden bg-white email-composer-quill" style={{ height: '400px' }}>
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
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-2xl border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={onClose}
            disabled={isSending}
            className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSend}
            disabled={isSending}
            className="px-8 py-3 bg-gradient-to-r from-[#EF6855] to-[#E5503F] text-white rounded-xl font-semibold hover:from-[#E5503F] hover:to-[#D64838] transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Envoyer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

