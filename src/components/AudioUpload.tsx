import { useState, useRef, useEffect } from 'react';
import { Upload, FileAudio, X, Loader } from 'lucide-react';
import { transcribeLongAudio, generateSummary } from '../services/transcription';
import { supabase } from '../lib/supabase';
import { useBackgroundProcessing } from '../hooks/useBackgroundProcessing';

interface AudioUploadProps {
  userId: string;
  onSuccess: (meetingId?: string) => void;
}

export const AudioUpload = ({ userId, onSuccess }: AudioUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [audioDuration, setAudioDuration] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { addTask, updateTask } = useBackgroundProcessing(userId);

  // Fonction pour extraire la durée d'un fichier audio
  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'metadata';

      audio.onloadedmetadata = () => {
        window.URL.revokeObjectURL(audio.src);
        resolve(Math.floor(audio.duration));
      };

      audio.onerror = () => {
        resolve(0);
      };

      audio.src = window.URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      // Extraire la durée
      const duration = await getAudioDuration(file);
      setAudioDuration(duration);
      console.log('📊 Durée audio détectée:', duration, 'secondes');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    const taskId = await addTask({
      type: 'upload_transcription',
      status: 'processing',
      progress: 'Démarrage du traitement...',
    });

    if (!taskId) {
      alert('Erreur lors de la création de la tâche');
      setIsProcessing(false);
      return;
    }

    try {
      // 1) Upload de l'audio original dans Supabase Storage
      const uploadProgress = 'Téléversement du fichier audio...';
      setProgress(uploadProgress);
      await updateTask(taskId, { progress: uploadProgress, progress_percent: 10 });
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
      const createProgress = 'Création de la réunion...';
      setProgress(createProgress);
      await updateTask(taskId, { progress: createProgress, progress_percent: 20 });
      const provisionalTitle = meetingTitle || `Upload du ${new Date().toLocaleDateString('fr-FR')}`;
      const { data: meeting, error: createError } = await supabase
        .from('meetings')
        .insert({
          title: provisionalTitle,
          transcript: null,
          summary: null,
          duration: audioDuration,
          user_id: userId,
          notes: notes || null,
          suggestions: [],
          audio_url: audioUrl,
        })
        .select()
        .maybeSingle();

      if (createError || !meeting) {
        throw new Error('Erreur lors de la création de la réunion');
      }

      console.log('✅ Réunion créée avec ID:', meeting.id);

      // 3) Transcrire avec l'endpoint /transcribe_long
      setProgress('Envoi au serveur de transcription...');
      await updateTask(taskId, { progress: 'Envoi au serveur de transcription...', meeting_id: meeting.id, progress_percent: 30 });
      const fullTranscript = await transcribeLongAudio(selectedFile, async (msg) => {
        setProgress(msg);
        await updateTask(taskId, { progress: msg, progress_percent: 60 });
      });

      // 4) Générer le résumé
      const summaryProgress = 'Génération du résumé IA...';
      setProgress(summaryProgress);
      await updateTask(taskId, { progress: summaryProgress, progress_percent: 80 });
      const { title, summary } = await generateSummary(fullTranscript);

      // 5) Mettre à jour la réunion
      const finalTitle = meetingTitle || title || provisionalTitle;
      const { error: updateError } = await supabase
        .from('meetings')
        .update({
          title: finalTitle,
          transcript: fullTranscript,
          summary,
        })
        .eq('id', meeting.id);

      if (updateError) {
        console.error('❌ Erreur mise à jour réunion:', updateError);
        throw updateError;
      }

      console.log('✅ Réunion mise à jour avec succès:', meeting.id);

      setProgress('Terminé !');

      // Reset UI immediately
      setSelectedFile(null);
      setMeetingTitle('');
      setNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Mark task as completed - this will trigger the notification
      console.log('✅ Marquage de la tâche comme terminée avec meeting_id:', meeting.id);
      setTimeout(async () => {
        await updateTask(taskId, {
          status: 'completed',
          progress: 'Transcription terminée',
          meeting_id: meeting.id,
          progress_percent: 100
        });
      }, 100);

      // Don't call onSuccess here to avoid navigation
      // Let the user click "Voir le résultat" button in notification
    } catch (error: any) {
      console.error('Erreur:', error);
      await updateTask(taskId, {
        status: 'error',
        error: error.message || 'Une erreur est survenue'
      });
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

