import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore - fourni par l'environnement Supabase Edge Runtime
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Fonction pour formater le temps en HH:MM:SS
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Fonction pour nettoyer le texte des phrases parasites
function cleanTranscriptText(text: string): string {
  // Liste des phrases parasites courantes à supprimer
  const parasitePhrases = [
    /Sous-titres réalisés para la communauté d'Amara\.org/gi,
    /Sous-titres réalisés par la communauté d'Amara\.org/gi,
    /Subtitles by the Amara\.org community/gi,
    /Transcription par Céline Martel/gi,
    /Merci d'avoir regardé/gi,
    /N'oubliez pas de vous abonner/gi,
    /Likez et partagez/gi,
  ];

  let cleanedText = text;
  for (const pattern of parasitePhrases) {
    cleanedText = cleanedText.replace(pattern, '');
  }

  return cleanedText.trim();
}

// Fonction pour transcrire avec retry et gestion du rate limiting
async function transcribeWithRetry(transcriptionFormData: FormData, openaiApiKey: string, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Tentative de transcription ${attempt}/${maxRetries}`);
      
      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: transcriptionFormData,
        }
      );

      if (response.ok) {
        console.log(`Transcription réussie à la tentative ${attempt}`);
        return await response.json();
      }

      // Gestion spécifique de l'erreur 429 (rate limit)
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        let delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff: 1s, 2s, 4s
        
        // Utiliser le header retry-after d'OpenAI si disponible
        if (retryAfter) {
          delay = parseInt(retryAfter) * 1000;
          console.log(`Rate limit détecté, retry-after: ${retryAfter}s`);
        } else {
          console.log(`Rate limit détecté, délai calculé: ${delay}ms`);
        }

        if (attempt < maxRetries) {
          console.log(`Attente de ${delay}ms avant la tentative ${attempt + 1}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          console.error(`Échec après ${maxRetries} tentatives - Rate limit persistant`);
          throw new Error(`Rate limit persistant après ${maxRetries} tentatives`);
        }
      }

      // Autres erreurs HTTP
      const error = await response.text();
      console.error(`Erreur HTTP ${response.status} à la tentative ${attempt}:`, error);
      
      if (attempt === maxRetries) {
        throw new Error(`Transcription failed after ${maxRetries} attempts: ${error}`);
      }
      
      // Retry pour les autres erreurs avec délai
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`Erreur ${response.status}, retry dans ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      console.error(`Erreur à la tentative ${attempt}:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Retry avec délai exponentiel
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`Retry dans ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Fonction pour formater la transcription avec timestamps et paragraphes
function formatTranscriptWithTimestamps(result: any): string {
  if (!result.segments || result.segments.length === 0) {
    console.log("No segments available in result");
    return cleanTranscriptText(result.text || "");
  }

  console.log(`Formatting ${result.segments.length} segments`);

  let formattedText = "";
  let currentParagraph: string[] = [];
  let lastTimestamp = 0;
  const TIMESTAMP_INTERVAL = 10; // Toutes les 10 secondes
  const SILENCE_THRESHOLD = 3; // Silence de plus de 3 secondes

  for (let i = 0; i < result.segments.length; i++) {
    const segment = result.segments[i];
    const startTime = segment.start || 0;
    const endTime = segment.end || 0;
    let text = (segment.text || "").trim();

    // Nettoyer le texte des phrases parasites
    text = cleanTranscriptText(text);

    if (!text) continue;

    console.log(`Segment ${i}: start=${startTime}, text="${text.substring(0, 50)}..."`);

    // Détecter les silences significatifs
    if (i > 0) {
      const previousSegment = result.segments[i - 1];
      const previousEnd = previousSegment.end || 0;
      const silenceDuration = startTime - previousEnd;
      
      if (silenceDuration >= SILENCE_THRESHOLD) {
        // Terminer le paragraphe actuel
        if (currentParagraph.length > 0) {
          formattedText += currentParagraph.join(" ") + "\n\n";
          currentParagraph = [];
        }
        // Indiquer le silence
        formattedText += `[Silence - ${Math.round(silenceDuration)}s]\n\n`;
        lastTimestamp = startTime;
      }
    }

    // Ajouter un timestamp toutes les 10 secondes ou au début
    if (startTime - lastTimestamp >= TIMESTAMP_INTERVAL || i === 0) {
      // Terminer le paragraphe actuel si nécessaire
      if (currentParagraph.length > 0) {
        formattedText += currentParagraph.join(" ") + "\n\n";
        currentParagraph = [];
      }
      // Ajouter le timestamp
      formattedText += `[${formatTime(startTime)}]\n`;
      lastTimestamp = startTime;
    }

    // Ajouter le texte au paragraphe actuel
    currentParagraph.push(text);

    // Si c'est le dernier segment, terminer le paragraphe
    if (i === result.segments.length - 1 && currentParagraph.length > 0) {
      formattedText += currentParagraph.join(" ") + "\n";
    }
  }

  let finalText = formattedText.trim();
  
  // Si le texte final est vide ou ne contient que des silences
  if (!finalText || finalText.replace(/\[Silence.*?\]/g, '').trim().length === 0) {
    console.log("No transcribable content found");
    return "Pas de données à transcrire. L'enregistrement est silencieux ou ne contient pas de paroles audibles.";
  }
  
  console.log(`Final formatted text length: ${finalText.length} chars`);
  return finalText;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "No audio file provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiApiKey = Deno.env.get("VITE_OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const fileName = (audioFile as any).name || "recording.webm";
    // Première tentative avec gpt-4o-mini-transcribe
    const form4o = new FormData();
    form4o.append("file", audioFile, fileName);
    form4o.append("model", "gpt-4o-mini-transcribe");
    form4o.append("language", "fr");
    form4o.append("response_format", "verbose_json");

    let result: any;
    try {
      // Utiliser la fonction de retry pour gérer les erreurs 429
      result = await transcribeWithRetry(form4o, openaiApiKey);
    } catch (e: any) {
      const message = String(e?.message || e || "");
      // Fallback automatique si le fichier est jugé invalide/non supporté par 4o-mini-transcribe
      if (message.includes("invalid_value") || message.includes("unsupported") || message.includes("corrupted")) {
        console.log("Fallback vers whisper-1 à cause d'un format non supporté par gpt-4o-mini-transcribe");
        const formWhisper = new FormData();
        formWhisper.append("file", audioFile, fileName);
        formWhisper.append("model", "whisper-1");
        formWhisper.append("language", "fr");
        formWhisper.append("response_format", "verbose_json");
        result = await transcribeWithRetry(formWhisper, openaiApiKey);
      } else {
        throw e;
      }
    }
    
    console.log("Transcription result:", JSON.stringify(result, null, 2));
    
    // Retourner seulement le texte sans timestamps pour éviter de polluer le résumé
    let formattedTranscript;
    if (result.segments && result.segments.length > 0) {
      // Extraire seulement le texte des segments sans timestamps
      const segments = result.segments.map((segment: any) => segment.text || "").join(" ");
      formattedTranscript = cleanTranscriptText(segments);
      console.log("Plain transcript (no timestamps):", formattedTranscript.substring(0, 100) + "...");
    } else {
      // Fallback si pas de segments
      const plainText = cleanTranscriptText(result.text || "");
      if (!plainText || plainText.trim().length === 0) {
        formattedTranscript = "Pas de données à transcrire. L'enregistrement est silencieux ou ne contient pas de paroles audibles.";
      } else {
        formattedTranscript = plainText;
      }
      console.log("No segments found, using plain text");
    }

    return new Response(
      JSON.stringify({ transcript: formattedTranscript }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});