import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { longUrl } = await req.json()

    if (!longUrl) {
      throw new Error('longUrl is required')
    }

    // Créer un hash court à partir de l'URL
    const encoder = new TextEncoder()
    const data = encoder.encode(longUrl + Date.now())
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const shortCode = hashArray
      .slice(0, 6)
      .map(b => b.toString(36))
      .join('')
      .substring(0, 8)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Sauvegarder dans la table shortened_urls
    const { data: urlData, error } = await supabase
      .from('shortened_urls')
      .insert({
        short_code: shortCode,
        original_url: longUrl,
      })
      .select()
      .single()

    if (error) {
      // Si le code existe déjà, en générer un nouveau
      if (error.code === '23505') {
        const newShortCode = shortCode + Math.random().toString(36).substring(2, 4)
        const { data: retryData, error: retryError } = await supabase
          .from('shortened_urls')
          .insert({
            short_code: newShortCode,
            original_url: longUrl,
          })
          .select()
          .single()

        if (retryError) throw retryError
        
        return new Response(
          JSON.stringify({ 
            shortUrl: `${Deno.env.get('SUPABASE_URL')}/s/${newShortCode}`,
            shortCode: newShortCode 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw error
    }

    return new Response(
      JSON.stringify({ 
        shortUrl: `${Deno.env.get('SUPABASE_URL')}/s/${shortCode}`,
        shortCode: shortCode
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

