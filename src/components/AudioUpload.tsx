import { useState, useRef } from 'react';
import { Upload, FileAudio, X, Loader } from 'lucide-react';
import { transcribeLongAudio, generateSummary } from '../services/transcription';
import { supabase } from '../lib/supabase';

interface AudioUploadProps {
  userId: string;
  onSuccess: () => void;
}

export const AudioUpload = ({ userId, onSuccess }: AudioUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier que c'est un fichier audio ou vidéo (webm peut être video/webm)
      const validTypes = ['audio/', 'video/webm', 'video/mp4', 'video/ogg'];
      const isValid = validTypes.some(type => file.type.startsWith(type)) || 
                      file.name.match(/\.(mp3|wav|m4a|webm|ogg|flac|aac|wma)$/i);
      
      if (!isValid) {
        alert('Veuillez sélectionner un fichier audio valide (MP3, WAV, M4A, WebM, etc.).');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      // 1) Upload de l'audio original dans Supabase Storage
      setProgress('Téléversement du fichier audio...');
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10);
      const timePart = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
      const safeTitle = (meetingTitle || 'upload')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'upload';
      const filePath = `${userId}/${datePart}/${safeTitle}_${timePart}_upload.${selectedFile.name.split('.').pop()}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('Compte-rendu')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage
        .from('Compte-rendu')
        .getPublicUrl(filePath);
      const audioUrl = pub.publicUrl;

      // 2) Créer une réunion minimale
      setProgress('Création de la réunion...');
      const provisionalTitle = meetingTitle || `Upload du ${new Date().toLocaleDateString('fr-FR')}`;
      const { data: meeting, error: createError } = await supabase
        .from('meetings')
        .insert({
          title: provisionalTitle,
          transcript: null,
          summary: null,
          duration: 0, // On ne connaît pas la durée exacte
          user_id: userId,
          notes: notes || null,
          suggestions: [],
          audio_url: audioUrl,
        })
        .select()
        .maybeSingle();

      if (createError) throw createError;

      // 3) Transcrire avec l'endpoint /transcribe_long
      setProgress('Transcription en cours...');
      const fullTranscript = await transcribeLongAudio(selectedFile, (msg) => {
        setProgress(msg);
      });

      // 4) Générer le résumé
      setProgress('Génération du résumé IA...');
      const { title, summary } = await generateSummary(fullTranscript);

      // 5) Mettre à jour la réunion
      const finalTitle = meetingTitle || title || provisionalTitle;
      await supabase
        .from('meetings')
        .update({
          title: finalTitle,
          transcript: fullTranscript,
          summary,
        })
        .eq('id', meeting?.id);

      setProgress('Terminé !');
      alert('Audio transcrit et résumé généré avec succès !');
      
      // Reset
      setSelectedFile(null);
      setMeetingTitle('');
      setNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      onSuccess();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`Erreur: ${error.message || 'Une erreur est survenue'}`);
    } finally {
      setIsProcessing(false);
      setProgress('');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-10 border border-orange-100">
      <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-coral-500 to-sunset-500 bg-clip-text text-transparent mb-6">
        Importer un fichier audio
      </h2>

      <div className="space-y-6">
        {/* Zone de drop/sélection */}
        <div className="border-2 border-dashed border-coral-300 rounded-xl p-8 text-center hover:border-coral-500 transition-all bg-gradient-to-br from-orange-50 to-coral-50">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/webm,video/mp4,.webm,.mp3,.wav,.m4a,.ogg"
            onChange={handleFileSelect}
            className="hidden"
            id="audio-upload"
            disabled={isProcessing}
          />
          <label
            htmlFor="audio-upload"
            className="cursor-pointer flex flex-col items-center gap-4"
          >
            {selectedFile ? (
              <>
                <FileAudio className="w-16 h-16 text-coral-500" />
                <div className="text-center">
                  <p className="font-semibold text-cocoa-800">{selectedFile.name}</p>
                  <p className="text-sm text-cocoa-600">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-sm text-coral-600 hover:text-coral-700 font-semibold flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Supprimer
                </button>
              </>
            ) : (
              <>
                <Upload className="w-16 h-16 text-coral-400" />
                <div>
                  <p className="font-semibold text-cocoa-800">
                    Cliquez pour sélectionner un fichier audio
                  </p>
                  <p className="text-sm text-cocoa-600 mt-1">
                    MP3, WAV, M4A, WebM, OGG, FLAC, etc.
                  </p>
                </div>
              </>
            )}
          </label>
        </div>

        {/* Titre */}
        <div>
          <label htmlFor="upload-title" className="block text-sm font-semibold text-cocoa-800 mb-2">
            Titre de la réunion (optionnel)
          </label>
          <input
            type="text"
            id="upload-title"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            placeholder="Ex: Réunion client - Projet X"
            className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:border-coral-500 focus:ring-4 focus:ring-coral-500/20 text-cocoa-800"
            disabled={isProcessing}
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="upload-notes" className="block text-sm font-semibold text-cocoa-800 mb-2">
            Notes complémentaires (optionnel)
          </label>
          <textarea
            id="upload-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ajoutez vos notes ici..."
            className="w-full h-24 px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:border-coral-500 focus:ring-4 focus:ring-coral-500/20 resize-none text-cocoa-800"
            disabled={isProcessing}
          />
        </div>

        {/* Bouton traiter */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isProcessing}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
            !selectedFile || isProcessing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-coral-500 to-coral-600 text-white hover:from-coral-600 hover:to-coral-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader className="w-6 h-6 animate-spin" />
              <span>Traitement en cours...</span>
            </>
          ) : (
            <>
              <FileAudio className="w-6 h-6" />
              <span>Transcrire et générer le résumé</span>
            </>
          )}
        </button>

        {/* Progression */}
        {progress && (
          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              {progress}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

