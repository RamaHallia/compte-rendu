import { useState, useEffect, useRef } from 'react';
import { Mic, History, LogOut, Settings as SettingsIcon, Upload, LayoutDashboard } from 'lucide-react';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useLiveSuggestions } from './hooks/useLiveSuggestions';
import { RecordingControls } from './components/RecordingControls';
import { AudioVisualizer } from './components/AudioVisualizer';
import { FloatingRecordButton } from './components/FloatingRecordButton';
import { FloatingStartButton } from './components/FloatingStartButton';
import { RecordingModeSelector } from './components/RecordingModeSelector';
import { ProcessingModal } from './components/ProcessingModal';
import { MeetingResult } from './components/MeetingResult';
import { MeetingHistory } from './components/MeetingHistory';
import { MeetingDetail } from './components/MeetingDetail';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
import { Settings } from './components/Settings';
import { Dashboard } from './components/Dashboard';
import { LiveSuggestions } from './components/LiveSuggestions';
import { AudioUpload } from './components/AudioUpload';
import { BackgroundProcessingIndicator } from './components/BackgroundProcessingIndicator';
import { supabase, Meeting } from './lib/supabase';
import { useBackgroundProcessing } from './hooks/useBackgroundProcessing';
import { transcribeAudio, generateSummary } from './services/transcription';
import { ensureWhisperCompatible } from './services/audioEncoding';

// Fonction pour nettoyer la transcription et supprimer les répétitions
const cleanTranscript = (transcript: string): string => {
  if (!transcript) return '';
  
  // Diviser en phrases
  const sentences = transcript.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  const uniqueSentences: string[] = [];
  
  for (const sentence of sentences) {
    const normalizedSentence = sentence.toLowerCase().trim();
    
    // Vérifier si cette phrase n'existe pas déjà (avec une tolérance)
    const isDuplicate = uniqueSentences.some(existing => {
      const normalizedExisting = existing.toLowerCase().trim();
      return normalizedExisting === normalizedSentence ||
             normalizedExisting.includes(normalizedSentence) ||
             normalizedSentence.includes(normalizedExisting);
    });
    
    if (!isDuplicate && sentence.length > 10) { // Ignorer les phrases trop courtes
      uniqueSentences.push(sentence);
    }
  }
  
  return uniqueSentences.join('. ').trim() + (uniqueSentences.length > 0 ? '.' : '');
};

// Fonction pour formater la transcription avec séparateurs entre les chunks
const formatTranscriptWithSeparators = (partialTranscripts: string[]): string => {
  if (!partialTranscripts || partialTranscripts.length === 0) return '';
  
  return partialTranscripts
    .map((chunk, index) => {
      const timestamp = `--- ${(index * 15) + 15}s ---`; // Estimation du temps
      const cleanChunk = chunk.trim();
      if (!cleanChunk) return '';
      
      return `\n\n${timestamp}\n${cleanChunk}`;
    })
    .filter(chunk => chunk.trim())
    .join('');
};

function App() {
  const [view, setView] = useState<'landing' | 'auth' | 'record' | 'history' | 'detail' | 'settings' | 'upload' | 'dashboard'>('landing');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [result, setResult] = useState<{ title: string; transcript: string; summary: string; audioUrl?: string | null } | null>(null);
  const [partialTranscripts, setPartialTranscripts] = useState<string[]>([]);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [historyScrollPosition, setHistoryScrollPosition] = useState<number>(0);
  const [isMeetingsLoading, setIsMeetingsLoading] = useState(false);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);
  const [recordingNotes, setRecordingNotes] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const lastProcessedSizeRef = useRef<number>(0);
  const [activeSuggestionsTab, setActiveSuggestionsTab] = useState<'clarify' | 'explore'>('clarify');
  const [isStartingRecording, setIsStartingRecording] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [selectedRecordingMode, setSelectedRecordingMode] = useState<'microphone' | 'system' | 'visio'>('microphone');

  const {
    tasks: backgroundTasks,
    removeTask,
    clearCompletedTasks,
    hasActiveTasks,
  } = useBackgroundProcessing(user?.id);

  const {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    recordingMode,
    audioStream,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    setRecordingMode,
    getLast15sWav,
  } = useAudioRecorder();

  const {
    suggestions,
    isAnalyzing,
    analyzePartialTranscript,
    clearSuggestions,
    getLatestSuggestion,
  } = useLiveSuggestions();

  const partialAnalysisTimerRef = useRef<number | null>(null);
  const liveTranscriptRef = useRef<string>('');
  const recentChunksRef = useRef<string[]>([]);


  useEffect(() => {
    checkUser();

    // Restaurer la vue depuis l'URL (hash) au chargement
    const hash = window.location.hash.replace('#', '');
    if (hash && ['record', 'history', 'upload', 'settings'].includes(hash)) {
      console.log('🔄 Restauration de la vue depuis l\'URL:', hash);
      setView(hash as any);
    } else if (hash === 'detail') {
      // Si on est sur detail sans réunion, rediriger vers history
      console.log('⚠️ Vue detail sans réunion, redirection vers history');
      setView('history');
      window.history.replaceState({ view: 'history' }, '', '#history');
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      // Ne changer la vue que lors de la connexion initiale, pas à chaque changement d'état
      if (session?.user && event === 'SIGNED_IN') {
        // Si on a déjà une vue depuis l'URL, ne pas la changer
        const currentHash = window.location.hash.replace('#', '');
        if (!currentHash || !['record', 'history', 'upload', 'settings'].includes(currentHash)) {
        setView('record');
        }
        loadMeetings();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Charger les réunions quand l'utilisateur change
  useEffect(() => {
    if (user) {
      loadMeetings();
    }
  }, [user]);

  // Gestion de la navigation avec le bouton retour du navigateur et changement de hash
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      // Ignorer si pas d'état ou si on est déjà sur la bonne vue
      if (!state || !state.view) {
        // Essayer de lire depuis le hash si pas d'état
        const hash = window.location.hash.replace('#', '');
        if (hash && ['record', 'history', 'upload', 'settings'].includes(hash)) {
          console.log('🔄 Restauration depuis hash:', hash);
          setView(hash as any);
        } else if (hash === 'detail') {
          // Rediriger vers history si on est sur detail sans réunion
          console.log('⚠️ Vue detail sans réunion, redirection vers history');
          setView('history');
          window.history.replaceState({ view: 'history' }, '', '#history');
        }
        return;
      }
      
      console.log('🔙 Navigation arrière vers:', state.view);
      setView(state.view);
      if (state.selectedMeetingId) {
        setSelectedMeetingId(state.selectedMeetingId);
      } else {
        setSelectedMeetingId(null);
      }
    };

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['record', 'history', 'upload', 'settings'].includes(hash)) {
        console.log('🔄 Hash changé:', hash);
        setView(hash as any);
      } else if (hash === 'detail') {
        // Ne rien faire - laisser le useEffect gérer la redirection si nécessaire
        console.log('🔄 Hash detail détecté, conservation de la vue actuelle');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [view, selectedMeeting]);

  // Rediriger automatiquement si on est sur detail sans réunion
  useEffect(() => {
    if (view === 'detail' && !selectedMeeting && !isAuthLoading && user) {
      console.log('⚠️ Vue detail sans réunion sélectionnée, redirection vers history');
      setView('history');
      window.history.replaceState({ view: 'history' }, '', '#history');
    }
  }, [view, selectedMeeting, isAuthLoading, user]);

  // Mettre à jour l'historique du navigateur quand la vue change
  useEffect(() => {
    if (!view || isAuthLoading || !user) {
      return;
    }
    
    const state = { view, selectedMeetingId };
    const currentState = window.history.state;
    
    // Si pas d'état, initialiser avec replaceState
    if (!currentState) {
      window.history.replaceState(state, '', `#${view}`);
      return;
    }
    
    // Sinon, vérifier si l'état est différent avant de pousser
    if (currentState.view !== view || currentState.selectedMeetingId !== selectedMeetingId) {
      console.log('📝 Mise à jour historique:', view);
      window.history.pushState(state, '', `#${view}`);
    }
  }, [view, selectedMeetingId, isAuthLoading, user]);

  useEffect(() => {
    if (audioBlob && !isRecording) {
      // Arrêter le timer d'analyse partielle
      if (partialAnalysisTimerRef.current) {
        clearInterval(partialAnalysisTimerRef.current);
        partialAnalysisTimerRef.current = null;
      }
      processRecording();
    }
  }, [audioBlob, isRecording]);

  // Forcer le rafraîchissement quand l'enregistrement démarre
  useEffect(() => {
    
    if (isRecording) {
      
      // Arrêter l'état de chargement
      setIsStartingRecording(false);
      // Forcer un re-render avec un délai plus long
      setTimeout(() => {
        setForceUpdate(prev => prev + 1);
        
      }, 500);
    } else {
      // Quand l'enregistrement s'arrête, remettre seulement le timer à zéro
      
      // Ne pas appeler resetRecording() ici car cela remet result à null
      // Le resetRecording() sera appelé après l'affichage du popup dans processRecording()
      
    }
  }, [isRecording]);

  // Nettoyer le timer si le composant est démonté
  useEffect(() => {
    return () => {
      if (partialAnalysisTimerRef.current) {
        clearInterval(partialAnalysisTimerRef.current);
      }
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    } catch (error) {
      
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMeetings([]);
    setView('landing');
  };

  const loadMeetings = async () => {
    
    if (!user) {
      console.log('⚠️ loadMeetings: Pas d\'utilisateur connecté');
      setMeetings([]);
      return;
    }

    setIsMeetingsLoading(true);
    setMeetingsError(null);
    
    try {
      console.log('📋 Chargement des réunions pour user:', user.id);
      console.log('📋 Supabase client:', !!supabase);
      
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
        .eq('user_id', user.id)
      .order('created_at', { ascending: false });

      console.log('📋 Résultat Supabase:', { data, error });

      if (error) {
        console.error('❌ Erreur chargement réunions:', error);
        setMeetingsError('Erreur lors du chargement des réunions: ' + error.message);
        setMeetings([]);
        return;
      }

      console.log(`✅ ${data?.length || 0} réunions chargées:`, data?.map(m => ({ id: m.id, title: m.title })));
      setMeetings(data || []);
      
    } catch (e) {
      console.error('❌ Exception chargement réunions:', e);
      setMeetingsError('Erreur lors du chargement des réunions: ' + (e as Error).message);
      setMeetings([]);
    } finally {
      setIsMeetingsLoading(false);
      console.log('🏁 loadMeetings terminé');
    }
  };

  const processRecording = async () => {
    if (!audioBlob || !user) return;

    setIsProcessing(true);

    try {
      // 1) Créer une réunion minimale immédiatement (sans audio pour l'instant)
      setProcessingStatus('Création de la réunion...');
      const provisionalTitle = meetingTitle || `Réunion du ${new Date().toLocaleDateString('fr-FR')}`;
      const { data: created, error: createErr } = await supabase
        .from('meetings')
        .insert({
          title: provisionalTitle,
          transcript: null,
          summary: null,
          duration: recordingTime,
          user_id: user.id,
          notes: recordingNotes || null,
          suggestions: [],
          audio_url: null,
        })
        .select()
        .maybeSingle();
      if (createErr) throw createErr;
      setCurrentMeetingId(created?.id || null);

      // 2) Utiliser la transcription cumulée obtenue en live (liveTranscriptRef)
      setProcessingStatus('Finalisation de la transcription...');
      const hasLive = (liveTranscriptRef.current || '').trim().length > 50;
      
      let finalTranscript = '';
      let displayTranscript = '';
      
      if (hasLive) {
        // Version pour l'affichage (avec séparateurs visuels)
        const formattedTranscript = formatTranscriptWithSeparators(partialTranscripts);
        if (formattedTranscript.trim()) {
          displayTranscript = formattedTranscript;
          console.log('📝 Transcription formatée avec séparateurs:', displayTranscript.substring(0, 100) + '...');
        } else {
          // Fallback: nettoyer la transcription cumulée
          displayTranscript = cleanTranscript(liveTranscriptRef.current.trim());
          console.log('🧹 Transcription nettoyée (fallback):', displayTranscript.substring(0, 100) + '...');
        }
        
        // Version pour le résumé (sans séparateurs, texte propre)
        const cleanForSummary = partialTranscripts.join(' ').trim();
        finalTranscript = cleanTranscript(cleanForSummary);
        console.log('📄 Transcription pour résumé (propre):', finalTranscript.substring(0, 100) + '...');
      } else {
        finalTranscript = await transcribeAudio(audioBlob); // Fallback si, pour une raison, on n'a rien accumulé
        displayTranscript = finalTranscript; // Même version pour l'affichage
      }

      setProcessingStatus('Génération du résumé IA...');
      
      const result = await generateSummary(finalTranscript);
      console.log('✅ Résumé généré:', { title: result.title, summaryLength: result.summary?.length });
      
      const { title, summary } = result;
      const finalTitle = meetingTitle || title || provisionalTitle;


      const { error: updateErr } = await supabase
        .from('meetings')
        .update({
          title: finalTitle,
          transcript: finalTranscript, // Version propre pour le résumé
          display_transcript: displayTranscript, // Version avec séparateurs pour l'affichage
          summary,
        })
        .eq('id', created?.id);
      
      if (updateErr) {
        console.error('❌ Erreur mise à jour réunion:', updateErr);
        throw updateErr;
      }
      
      console.log('✅ Réunion mise à jour avec succès');

      if (created) {
        // Helpers déduplication sémantique (fr)
        const removeDiacritics = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const boilerplatePatterns = [
          /^pourriez[-\s]vous\s+/i,
          /^est[-\s]ce\s+que\s+/i,
          /^est[-\s]il\s+possible\s+de\s+/i,
          /^pourrait[-\s]on\s+/i,
          /^peut[-\s]on\s+/i,
          /^serait[-\s]il\s+utile\s+de\s+/i,
          /^pouvez[-\s]vous\s+/i,
        ];
        const stopwords = new Set([
          'le','la','les','de','des','du','un','une','et','ou','dans','au','aux','pour','sur','avec','chez','par','que','qui','quoi','dont','leur','leurs','vos','nos','ses','son','sa','ce','cette','ces','il','elle','ils','elles','on','nous','vous','est','sont','sera','etre','été','etre','devoir','falloir','faire','peut','possible','utile'
        ]);
        const canonical = (raw: string) => {
          let t = String(raw).trim().toLowerCase();
          t = removeDiacritics(t).replace(/[\?\.!]+$/,'');
          boilerplatePatterns.forEach(r => { t = t.replace(r, ''); });
          t = t.replace(/\b(clarifier|preciser|definir|discuter|etablir|cacher)\b/g, (m) => m); // garder verbes utiles
          const tokens = t.split(/[^a-z0-9]+/).filter(w => w && !stopwords.has(w));
          return tokens.join(' ');
        };
        const jaccard = (a: string, b: string) => {
          const A = new Set(a.split(' '));
          const B = new Set(b.split(' '));
          const inter = new Set([...A].filter(x => B.has(x))).size;
          const uni = new Set([...A, ...B]).size || 1;
          return inter / uni;
        };

        // Insérer en base les suggestions dans les tables normalisées
        try {
          // Déduplication sémantique des clarifications
          const clarifRows: Array<{meeting_id:string;content:string;segment_number:number;user_id:string; _canon?: string}> = [];
          (suggestions || []).forEach((s) => {
            (s.suggestions || []).forEach((raw) => {
              const canon = canonical(raw);
              if (!canon) return;
              const isDup = clarifRows.some(r => jaccard(r._canon || '', canon) >= 0.8);
              if (!isDup) {
                clarifRows.push({
                  meeting_id: created.id,
                  content: String(raw).trim(),
                  segment_number: s.segment_number,
                  user_id: user.id,
                  _canon: canon,
                });
              }
            });
          });

          if (clarifRows.length > 0) {
            await supabase.from('meeting_clarifications').insert(clarifRows.map(({_canon, ...r}) => r));
          }

          // Déduplication sémantique des topics
          const topicRows: Array<{meeting_id:string;topic:string;segment_number:number;user_id:string; _canon?: string}> = [];
          (suggestions || []).forEach((s) => {
            (s.topics_to_explore || []).forEach((raw) => {
              const canon = canonical(raw);
              if (!canon) return;
              const isDup = topicRows.some(r => jaccard(r._canon || '', canon) >= 0.8);
              if (!isDup) {
                topicRows.push({
                  meeting_id: created.id,
                  topic: String(raw).trim(),
                  segment_number: s.segment_number,
                  user_id: user.id,
                  _canon: canon,
                });
              }
            });
          });

          if (topicRows.length > 0) {
            await supabase.from('meeting_topics').insert(topicRows.map(({_canon, ...r}) => r));
          }
        } catch (_e) {
          // silencieux côté client
        }

        // Reset des états d'enregistrement AVANT d'afficher le résultat
        resetRecording();
        setRecordingNotes('');
        setMeetingTitle('');
        liveTranscriptRef.current = '';
        setPartialTranscripts([]);
        setCurrentMeetingId(null);
        lastProcessedSizeRef.current = 0;
        
        // Afficher le résumé immédiatement (sans audio pour l'instant)
        console.log('🎯 Définition du résultat:', { title: finalTitle, summaryLength: summary?.length });
        setResult({ title: finalTitle, transcript: displayTranscript, summary, audioUrl: null });
        loadMeetings();
        
        // Upload audio en arrière-plan (non-bloquant)
        const now = new Date();
        const datePart = now.toISOString().slice(0,10);
        const timePart = `${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}-${String(now.getSeconds()).padStart(2,'0')}`;
        const rawTitle = meetingTitle && meetingTitle.trim().length > 0 ? meetingTitle : 'reunion';
        const safeTitle = rawTitle
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 50) || 'reunion';
        const filePath = `${user.id}/${datePart}/${safeTitle}_${timePart}.webm`;
        
        // Upload asynchrone
        (async () => {
          try {
            console.log('📤 Upload audio en arrière-plan vers:', filePath);
            const { error: upErr } = await supabase.storage
              .from('Compte-rendu')
              .upload(filePath, audioBlob);
            
            if (!upErr) {
              const { data: pub } = supabase.storage
                .from('Compte-rendu')
                .getPublicUrl(filePath);
              const audioUrl = pub.publicUrl || null;
              
              // Mettre à jour la réunion avec l'audio
              await supabase
                .from('meetings')
                .update({ audio_url: audioUrl })
                .eq('id', created.id);
              
              console.log('✅ Audio uploadé et lié à la réunion');
              
              // Mettre à jour le résultat affiché
              setResult(prev => prev ? { ...prev, audioUrl } : null);
            } else {
              console.error('❌ Erreur upload arrière-plan:', upErr);
            }
          } catch (e) {
            console.error('❌ Erreur upload async:', e);
          }
        })();
        
      } else {
        throw new Error('Aucune donnée retournée lors de l\'insertion');
      }
    } catch (error) {
      console.error('Erreur processRecording:', error);
      alert('Une erreur est survenue lors du traitement.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette réunion ?')) return;

    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id);

    if (!error) {
      loadMeetings();
    }
  };

  const handleStartRecording = async () => {
    setIsStartingRecording(true);
    try {
      await startRecording(selectedRecordingMode);
      clearSuggestions();
      lastProcessedSizeRef.current = 0; // Réinitialiser le compteur
    } catch (error) {
      
    } finally {
      setIsStartingRecording(false);
    }
    
    // Timer 15s: construire une fenêtre glissante 15s via WebAudio et l'envoyer
    partialAnalysisTimerRef.current = window.setInterval(async () => {
      try {
        const wav = await getLast15sWav();
        if (!wav || wav.size < 5000) return;
        console.log(`📝 Transcription fenêtre 15s ${(wav.size/1024).toFixed(0)} KB`);
        const text = await transcribeAudio(wav, 0, `window15s_${Date.now()}.wav`);
        if (text && text.trim().length > 5) {
          // Déduplication: vérifier si ce texte n'existe pas déjà
          setPartialTranscripts(prev => {
            const normalizedText = text.trim().toLowerCase();
            const isDuplicate = prev.some(existing => 
              existing.trim().toLowerCase() === normalizedText ||
              existing.trim().toLowerCase().includes(normalizedText) ||
              normalizedText.includes(existing.trim().toLowerCase())
            );
            
            if (isDuplicate) {
              console.log('🔄 Transcription dupliquée ignorée:', text.substring(0, 50) + '...');
              return prev; // Ne pas ajouter le doublon
            }
            
            console.log('✅ Nouvelle transcription ajoutée:', text.substring(0, 50) + '...');
            return [...prev, text];
          });
          
          // Construire un transcript cumulatif robuste (évite le stale state)
          liveTranscriptRef.current = `${(liveTranscriptRef.current || '').trim()} ${text}`.trim();
          // Fenêtre glissante: 2 derniers chunks pour suggestions plus contextuelles
          recentChunksRef.current.push(text);
          if (recentChunksRef.current.length > 2) recentChunksRef.current.shift();
          const twoChunkWindow = recentChunksRef.current.join(' ').trim();
          await analyzePartialTranscript(twoChunkWindow);
        }
      } catch (e) {
        console.error('❌ Erreur transcription 15s:', e);
      }
    }, 15000);
  };

  const handleViewMeeting = (meeting: Meeting) => {
    // Sauvegarder la position de scroll avant de naviguer
    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
    setHistoryScrollPosition(scrollPosition);
    
    setSelectedMeeting(meeting);
    setSelectedMeetingId(meeting.id);
    setView('detail');
  };

  const handleBackToHistory = () => {
    setSelectedMeeting(null);
    setSelectedMeetingId(null);
    setView('history');
    // Ne pas recharger les réunions, elles sont déjà en mémoire
    // Restaurer la position de scroll après un court délai pour laisser le rendu se faire
    setTimeout(() => {
      window.scrollTo(0, historyScrollPosition);
    }, 100);
  };

  const handleMeetingUpdate = async () => {
    await loadMeetings();
    if (selectedMeeting) {
      const updatedMeetings = await supabase
        .from('meetings')
        .select('*')
        .eq('id', selectedMeeting.id)
        .single();

      if (updatedMeetings.data) {
        setSelectedMeeting(updatedMeetings.data);
      }
    }
  };


  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cocoa-600 text-lg">Chargement...</p>
        </div>
      </div>
    );
  }

  if (view === 'landing') {
    return <LandingPage onGetStarted={() => setView('auth')} />;
  }

  if (!user) {
    return <Login onSuccess={() => {
      setIsAuthLoading(false);
      setView('record');
    }} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-amber-50 flex flex-col md:flex-row">
      {/* Sidebar - Responsive */}
      <aside className="w-full md:w-72 bg-white border-b-2 md:border-b-0 md:border-r-2 border-orange-100 shadow-xl flex flex-col md:h-screen sticky top-0 z-10">
        <div className="p-4 md:p-6 border-b-2 border-orange-100">
          <div className="flex items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <img src="/logohallia.png" alt="Logo" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
            <div>
                <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-coral-500 to-sunset-500 bg-clip-text text-transparent">Réunions</h1>
              </div>
            </div>
            {/* Bouton déconnexion mobile uniquement */}
            <button
              onClick={handleLogout}
              className="md:hidden p-2 rounded-lg text-cocoa-700 hover:bg-orange-50 transition-all"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-2 md:p-4">
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible scrollbar-hide">
            <button
              onClick={() => setView('record')}
              className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-semibold transition-all text-sm md:text-base whitespace-nowrap ${
                view === 'record'
                  ? 'bg-gradient-to-r from-coral-500 to-coral-600 text-white shadow-lg shadow-coral-500/30'
                  : 'text-cocoa-700 hover:bg-orange-50'
              }`}
            >
              <Mic className="w-4 h-4 md:w-5 md:h-5" />
              <span>Enregistrer</span>
            </button>
            <button
                onClick={() => {
                loadMeetings();
                setView('history');
              }}
              className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-semibold transition-all text-sm md:text-base whitespace-nowrap ${
                view === 'history'
                  ? 'bg-gradient-to-r from-coral-500 to-coral-600 text-white shadow-lg shadow-coral-500/30'
                  : 'text-cocoa-700 hover:bg-orange-50'
              }`}
            >
              <History className="w-4 h-4 md:w-5 md:h-5" />
              <span>Historique</span>
            </button>
            <button
              onClick={() => setView('dashboard')}
              className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-semibold transition-all text-sm md:text-base whitespace-nowrap ${
                view === 'dashboard'
                  ? 'bg-gradient-to-r from-coral-500 to-coral-600 text-white shadow-lg shadow-coral-500/30'
                  : 'text-cocoa-700 hover:bg-orange-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 md:w-5 md:h-5" />
              <span>Tableau de bord</span>
            </button>
            <button
              onClick={() => setView('upload')}
              className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-semibold transition-all text-sm md:text-base whitespace-nowrap ${
                view === 'upload'
                  ? 'bg-gradient-to-r from-coral-500 to-coral-600 text-white shadow-lg shadow-coral-500/30'
                  : 'text-cocoa-700 hover:bg-orange-50'
              }`}
            >
              <Upload className="w-4 h-4 md:w-5 md:h-5" />
              <span>Importer</span>
            </button>
            <button
              onClick={() => setView('settings')}
              className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-semibold transition-all text-sm md:text-base whitespace-nowrap ${
                view === 'settings'
                  ? 'bg-gradient-to-r from-coral-500 to-coral-600 text-white shadow-lg shadow-coral-500/30'
                  : 'text-cocoa-700 hover:bg-orange-50'
              }`}
            >
              <SettingsIcon className="w-4 h-4 md:w-5 md:h-5" />
              <span>Paramètres</span>
            </button>
          </div>
        </nav>

        {/* Bouton rectangulaire pour démarrer l'enregistrement - MOBILE uniquement, juste après la navigation */}
        <div className="md:hidden p-3 border-t-2 border-orange-100">
          {view !== 'record' && !isRecording && (
            <button
              onClick={() => setView('record')}
              className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-semibold transition-all bg-gradient-to-r from-coral-500 to-coral-600 text-white shadow-lg active:scale-95"
            >
              <Mic className="w-5 h-5" />
              <span>Démarrer un enregistrement</span>
            </button>
          )}
        </div>

        {/* Bouton déconnexion - DESKTOP uniquement */}
        <div className="hidden md:block p-2 md:p-4 border-t-2 border-orange-100 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-semibold transition-all text-sm md:text-base text-cocoa-700 hover:bg-orange-50"
          >
            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className={view === 'record' ? 'flex gap-6 h-full' : 'max-w-6xl mx-auto px-4 md:px-8 py-4 md:py-8 min-h-screen'}>
          {view === 'record' ? (
            <>
              {/* Contenu principal de l'enregistrement */}
              <div className="flex-1 px-4 md:px-8 py-4 md:py-8 overflow-auto">
              {!isRecording ? (
                <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-12 border border-orange-100">
                  <div className="flex flex-col items-center justify-center py-8 md:py-16">
                    {/* Bouton démarrer en premier */}
                    <div className="mb-12">
                    <RecordingControls
                      isRecording={isRecording}
                      isPaused={isPaused}
                      recordingTime={recordingTime}
                      onStart={handleStartRecording}
                      onPause={pauseRecording}
                      onResume={resumeRecording}
                      onStop={stopRecording}
                  isStarting={isStartingRecording}
                />
                    </div>

                    

                    <div className="mb-8 w-full max-w-2xl px-4">
                      <label htmlFor="meetingTitle" className="block text-xs md:text-sm font-semibold text-cocoa-800 mb-3 text-center">
                        Nom de la réunion (optionnel)
                      </label>
                      <input
                        type="text"
                        id="meetingTitle"
                        value={meetingTitle}
                        onChange={(e) => setMeetingTitle(e.target.value)}
                        placeholder="Ex: Réunion d'équipe - Planning Q4"
                        className="w-full px-4 md:px-6 py-3 md:py-4 border-2 border-orange-200 rounded-xl md:rounded-2xl focus:outline-none focus:border-coral-500 focus:ring-4 focus:ring-coral-500/20 text-sm md:text-base text-cocoa-800 placeholder-cocoa-400 transition-all text-center"
                      />
                      <p className="text-xs text-cocoa-500 mt-2 text-center">
                        Si vide, l'IA générera un titre automatiquement
                      </p>
                    </div>

                    <div className="mb-8 w-full max-w-4xl px-4">
                      <RecordingModeSelector
                        selectedMode={selectedRecordingMode}
                        onModeChange={setSelectedRecordingMode}
                        disabled={isRecording}
                      />
                    </div>

                    <div className="mt-12 max-w-2xl text-center text-cocoa-600">
                      <p className="text-base mb-4">
                        {recordingMode === 'microphone' && "Mode Présentiel : enregistre votre voix pour les réunions en personne. Simple et efficace."}
                        {recordingMode === 'system' && "Mode Visio : capture l'audio de votre écran pour enregistrer les réunions Discord, Zoom, Meet, etc."}
                      </p>
                      <p className="text-sm text-cocoa-500">
                        La transcription sera générée automatiquement à la fin.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-12 border border-orange-100">
                  <div className="flex flex-col items-center py-4 md:py-8">
                    <div className="mb-6 md:mb-8">
                      {/* Animation de pulsation pendant l'enregistrement */}
                      <div className="relative w-20 h-20 md:w-24 md:h-24">
                        <div className="absolute inset-0 bg-coral-400 rounded-full animate-ping opacity-75"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-coral-500 to-coral-600 rounded-full flex items-center justify-center">
                          <Mic className="w-10 h-10 md:w-12 md:h-12 text-white" />
                        </div>
                      </div>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-cocoa-800 mb-2">Enregistrement en cours...</h3>
                    <p className="text-sm md:text-base text-cocoa-600 text-center max-w-md mb-6 md:mb-8 px-4">
                      L'audio est en cours d'enregistrement. Le résumé se génère progressivement.
                    </p>

                    {/* Visualisation audio en direct */}
                    <div className="w-full max-w-3xl px-2 md:px-4 mb-6 md:mb-10">
                      <AudioVisualizer
                        stream={audioStream}
                        isActive={isRecording && !isPaused}
                        barColor="#FF6B4A"
                        bgColor="linear-gradient(180deg, rgba(255,237,231,0.6) 0%, rgba(255,250,247,0.6) 100%)"
                      />
                    </div>

                    {/* Suggestions pendant l'enregistrement */}
                    <div className="w-full max-w-6xl xl:max-w-7xl mt-4 md:mt-6 px-4">
                      {/* Onglets */}
                      <div className="flex items-center gap-2 mb-4">
                        <button
                          onClick={() => setActiveSuggestionsTab('clarify')}
                          className={`px-4 py-2 rounded-full text-sm md:text-base font-semibold transition-all border-2 ${
                            activeSuggestionsTab === 'clarify'
                              ? 'bg-white border-purple-300 text-purple-900 shadow-sm'
                              : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                          }`}
                        >
                          Points à clarifier
                        </button>
                        <button
                          onClick={() => setActiveSuggestionsTab('explore')}
                          className={`px-4 py-2 rounded-full text-sm md:text-base font-semibold transition-all border-2 ${
                            activeSuggestionsTab === 'explore'
                              ? 'bg-white border-orange-300 text-coral-900 shadow-sm'
                              : 'bg-orange-50 border-orange-200 text-coral-700 hover:bg-orange-100'
                          }`}
                        >
                          Sujets à explorer
                        </button>
                      </div>

                      {activeSuggestionsTab === 'clarify' ? (
                      // Bloc Points à clarifier
                      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl md:rounded-2xl p-4 md:p-6 border-2 border-purple-200">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                            {/* Icône ampoule avec animation */}
                            <svg className="w-5 h-5 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <h4 className="text-lg md:text-xl font-bold text-purple-900">Points à clarifier</h4>
                        </div>

                        {suggestions.some(s => s.suggestions && s.suggestions.length > 0) ? (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {suggestions.filter(s => s.suggestions && s.suggestions.length > 0).slice(-5).reverse().map((suggestion, index) => (
                              <div key={index} className="bg-white rounded-lg p-4 border border-purple-100 animate-slide-in-right">
                                {suggestion.suggestions.map((q, qIndex) => (
                                  <div key={qIndex} className="flex items-start gap-2 py-1">
                                    <span className="text-purple-500 mt-1">•</span>
                                    <p className="text-sm md:text-base text-cocoa-800">{q}</p>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="flex flex-col items-center gap-4">
                              {/* Animation ampoule qui bouge */}
                              <div className="relative">
                                <svg className="w-16 h-16 text-purple-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                {/* Ondes autour de l'ampoule */}
                                <div className="absolute inset-0 -m-2 border-2 border-purple-300 rounded-full animate-ping opacity-50"></div>
                              </div>
                              <p className="text-sm md:text-base text-purple-700 font-medium">
                                Analyse en cours...
                              </p>
                              <p className="text-xs text-purple-600">
                                Les suggestions apparaîtront automatiquement
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      ) : (
                      // Bloc Sujets à explorer
                      <div className="bg-gradient-to-br from-orange-50 to-coral-50 rounded-xl md:rounded-2xl p-4 md:p-6 border-2 border-orange-200">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 bg-coral-500 rounded-full flex items-center justify-center">
                            {/* Icône boussole avec animation */}
                            <svg className="w-5 h-5 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                          </div>
                          <h4 className="text-lg md:text-xl font-bold text-coral-900">Sujets à explorer</h4>
                        </div>

                        {suggestions.some(s => s.topics_to_explore && s.topics_to_explore.length > 0) ? (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {suggestions.filter(s => s.topics_to_explore && s.topics_to_explore.length > 0).slice(-5).reverse().map((suggestion, index) => (
                              <div key={index} className="bg-white rounded-lg p-4 border border-orange-100 animate-slide-in-right">
                                <div className="flex flex-wrap gap-2">
                                  {suggestion.topics_to_explore.map((topic, topicIndex) => (
                                    <span key={topicIndex} className="px-3 py-1 bg-coral-100 text-coral-700 rounded-full text-xs md:text-sm font-medium">
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="flex flex-col items-center gap-4">
                              {/* Animation boussole qui bouge */}
                              <div className="relative">
                                <svg className="w-16 h-16 text-coral-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                                {/* Ondes autour de la boussole */}
                                <div className="absolute inset-0 -m-2 border-2 border-coral-300 rounded-full animate-ping opacity-50"></div>
                              </div>
                              <p className="text-sm md:text-base text-coral-700 font-medium">
                                Analyse en cours...
                              </p>
                              <p className="text-xs text-coral-600">
                                Les sujets apparaîtront automatiquement
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      )}

                      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl md:rounded-2xl p-4 md:p-6 border-2 border-orange-200 mt-6">
                        <label htmlFor="notes" className="block text-xs md:text-sm font-semibold text-cocoa-800 mb-3">
                          Notes complémentaires
                      </label>
                      <textarea
                        id="notes"
                        value={recordingNotes}
                        onChange={(e) => setRecordingNotes(e.target.value)}
                          placeholder="Ajoutez vos propres notes ici..."
                          className="w-full h-32 md:h-40 px-4 md:px-6 py-3 md:py-4 border-2 border-orange-200 rounded-xl focus:outline-none focus:border-coral-500 focus:ring-4 focus:ring-coral-500/20 resize-none text-sm md:text-base text-cocoa-800 placeholder-cocoa-400 transition-all bg-white"
                      />
                        <p className="text-xs text-cocoa-500 mt-2">
                          Ces notes seront ajoutées au résumé final
                      </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </div>

              {/* Barre latérale droite avec la liste des réunions */}
              <aside className="hidden xl:block w-80 bg-white border-l-2 border-orange-100 p-6 overflow-y-auto">
                <h3 className="text-xl font-bold bg-gradient-to-r from-coral-500 to-sunset-500 bg-clip-text text-transparent mb-6">
                  Réunions récentes
                </h3>
                <div className="space-y-3">
                  {meetings.slice(0, 10).map((meeting) => (
                    <div
                      key={meeting.id}
                      onClick={() => {
                        setSelectedMeeting(meeting);
                        setView('detail');
                      }}
                      className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border-2 border-orange-100 hover:border-coral-300 hover:shadow-lg transition-all cursor-pointer group"
                    >
                      <h4 className="font-bold text-cocoa-800 text-sm truncate mb-2 group-hover:text-coral-600 transition-colors">
                        {meeting.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-cocoa-600">
                        <span className="truncate">
                          {new Date(meeting.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                        <span>•</span>
                        <span>
                          {Math.floor(meeting.duration / 60)}:{(meeting.duration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {meetings.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-cocoa-500 text-sm">Aucune réunion enregistrée</p>
                    </div>
                  )}

                  {meetings.length > 5 && (
                    <button
                      onClick={() => {
                        loadMeetings();
                        setView('history');
                      }}
                      className="w-full mt-4 px-4 py-2 text-sm font-semibold text-coral-600 hover:text-coral-700 hover:bg-coral-50 rounded-lg transition-colors"
                    >
                      Voir tout l'historique →
                    </button>
                  )}
                </div>
              </aside>
            </>
          ) : view === 'history' ? (
            <div className="bg-white rounded-3xl shadow-2xl p-10 border border-orange-100 w-full">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-coral-500 to-sunset-500 bg-clip-text text-transparent mb-8">
                Historique des réunions
              </h2>

              {meetingsError && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
                  <span>{meetingsError}</span>
                  <button 
                    onClick={() => {
                      setMeetingsError(null);
                      loadMeetings();
                    }}
                    className="ml-4 text-sm font-semibold text-red-600 hover:text-red-800 underline"
                  >
                    Réessayer
                  </button>
            </div>
              )}
              <MeetingHistory meetings={meetings} onDelete={handleDelete} onView={handleViewMeeting} isLoading={isMeetingsLoading} />
            </div>
          ) : view === 'upload' ? (
            <AudioUpload
              userId={user?.id || ''}
              onSuccess={(meetingId) => {
                loadMeetings();
                if (meetingId) {
                  const meeting = meetings.find(m => m.id === meetingId);
                  if (meeting) {
                    handleViewMeeting(meeting);
                  } else {
                    setView('history');
                  }
                } else {
                  setView('history');
                }
              }}
            />
          ) : view === 'settings' ? (
            <Settings userId={user?.id || ''} />
          ) : view === 'dashboard' ? (
            <Dashboard />
          ) : view === 'detail' && selectedMeeting ? (
            <>
            <MeetingDetail meeting={selectedMeeting} onBack={handleBackToHistory} onUpdate={handleMeetingUpdate} />
            </>
          ) : (
            <div className="bg-white rounded-3xl shadow-2xl p-10 border border-orange-100 w-full">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-coral-500 to-sunset-500 bg-clip-text text-transparent mb-8">
                Page non trouvée
              </h2>
              <p className="text-cocoa-600">View actuelle: {view}</p>
              <button 
                onClick={() => setView('record')}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-coral-500 to-sunset-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Retour à l'accueil
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Bouton flottant pendant l'enregistrement - Visible sur mobile et desktop */}
      <FloatingRecordButton
        isRecording={isRecording}
        isPaused={isPaused}
        recordingTime={recordingTime}
        onPause={pauseRecording}
        onResume={resumeRecording}
        onStop={stopRecording}
      />

      {/* Bouton flottant "Démarrer" visible sur DESKTOP uniquement, sur toutes les pages sauf la page d'enregistrement */}
      <div className="hidden md:block">
        <FloatingStartButton
          onStartRecording={() => setView('record')}
          isVisible={!isRecording && view !== 'record'}
        />
      </div>

      {/* LiveSuggestions désactivé */}

      {/* Indicateur de traitement en arrière-plan */}
      <BackgroundProcessingIndicator
        tasks={backgroundTasks}
        onDismiss={removeTask}
        onViewResult={async (meetingId) => {
          console.log('🔍 Recherche de la réunion:', meetingId);

          // Charger directement la réunion depuis la base
          const { data: meeting, error } = await supabase
            .from('meetings')
            .select('*')
            .eq('id', meetingId)
            .maybeSingle();

          console.log('📋 Réunion trouvée:', meeting);

          if (error) {
            console.error('❌ Erreur chargement réunion:', error);
            alert('Erreur lors du chargement de la réunion');
            return;
          }

          if (!meeting) {
            console.error('❌ Réunion non trouvée:', meetingId);
            alert('Réunion non trouvée');
            return;
          }

          // Recharger toutes les réunions pour mettre à jour la liste
          await loadMeetings();

          // Afficher la réunion
          handleViewMeeting(meeting);

          // Supprimer la tâche
          const taskToRemove = backgroundTasks.find(t => t.meeting_id === meetingId);
          if (taskToRemove) {
            removeTask(taskToRemove.id);
          }
        }}
      />

      <ProcessingModal isOpen={isProcessing} status={processingStatus} onClose={() => setIsProcessing(false)} />

      {result && result.title && result.summary && (
        <>
          {console.log('🎯 Rendu MeetingResult:', { title: result.title, hasSummary: !!result.summary })}
        <MeetingResult
          title={result.title}
          transcript={result.transcript}
          summary={result.summary}
          suggestions={suggestions}
          userId={user?.id || ''}
          onClose={() => setResult(null)}
        />
        </>
      )}
    </div>
  );
}

export default App;
