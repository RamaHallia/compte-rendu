import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};
const ANALYSIS_PROMPT = `Tu es un assistant expert qui analyse des transcriptions de réunions en temps réel.

OBJECTIF: Analyser un segment de transcription et fournir des insights utiles pour améliorer la réunion en cours.

FORMAT JSON OBLIGATOIRE:
{
  "summary": "Résumé concis de ce segment (2-3 phrases maximum)",
  "key_points": ["Point clé 1", "Point clé 2", "Point clé 3"],
  "suggestions": ["Question ou clarification suggérée 1", "Question ou clarification suggérée 2"],
  "topics_to_explore": ["Sujet non abordé qui pourrait être pertinent"]
}

RÈGLES:
1. CONCISION: Résumé très court (2-3 phrases max)
2. PERTINENCE: Ne suggérer que des questions vraiment utiles
3. PROACTIVITÉ: Identifier ce qui manque ou pourrait être clarifié
4. NEUTRALITÉ: Rester objectif et professionnel

TYPES DE SUGGESTIONS:
- Questions de clarification sur des points ambigus
- Demandes de détails sur des décisions mentionnées
- Suggestions d'approfondir certains sujets
- Rappel de définir des responsables ou deadlines si mentionnés vaguement

Si le segment est trop court ou sans contenu pertinent, retourne des arrays vides.`;
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  try {
    const { transcript, segment_number } = await req.json();
    if (!transcript) {
      return new Response(JSON.stringify({
        error: "No transcript provided"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Si la transcription est trop courte, ne pas analyser
    if (transcript.trim().length < 100) {
      return new Response(JSON.stringify({
        summary: "",
        key_points: [],
        suggestions: [],
        topics_to_explore: []
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const openaiApiKey = Deno.env.get("VITE_OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(JSON.stringify({
        error: "OpenAI API key not configured"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    console.log(`Analyse du segment ${segment_number || 'unknown'}, longueur: ${transcript.length} caractères`);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: ANALYSIS_PROMPT
          },
          {
            role: "user",
            content: `Segment ${segment_number || ''} de la transcription:\n\n${transcript}\n\nAnalyse ce segment et fournis des insights utiles.`
          }
        ],
        temperature: 1,
        max_completion_tokens: 200,
        response_format: {
          type: "json_object"
        }
      })
    });
    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return new Response(JSON.stringify({
        error: "Analysis failed",
        details: error
      }), {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const result = await response.json();
    const content = result.choices[0]?.message?.content || "{}";
    console.log("Tokens utilisés:", result.usage);
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Erreur parsing JSON:", e);
      return new Response(JSON.stringify({
        error: "Invalid JSON response from AI",
        raw_content: content
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    return new Response(JSON.stringify({
      summary: parsed.summary || "",
      key_points: parsed.key_points || [],
      suggestions: parsed.suggestions || [],
      topics_to_explore: parsed.topics_to_explore || [],
      segment_number: segment_number
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
