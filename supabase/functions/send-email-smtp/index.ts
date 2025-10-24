import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Fonction pour convertir une image URL en base64 data URI
async function imageUrlToDataUri(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error('Failed to fetch image:', response.status);
      return imageUrl; // Fallback to original URL
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = blob.type || 'image/png';

    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting image to data URI:', error);
    return imageUrl; // Fallback to original URL
  }
}

// Fonction pour remplacer les URLs d'images dans le HTML par des data URIs
async function embedImagesInHtml(html: string): Promise<string> {
  // Trouver toutes les balises img avec src="http..."
  const imgRegex = /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi;
  const matches = Array.from(html.matchAll(imgRegex));

  let newHtml = html;

  for (const match of matches) {
    const fullTag = match[0];
    const beforeSrc = match[1];
    const srcUrl = match[2];
    const afterSrc = match[3];

    // Ne convertir que les URLs externes (pas les data URIs déjà présents)
    if (srcUrl.startsWith('http://') || srcUrl.startsWith('https://')) {
      const dataUri = await imageUrlToDataUri(srcUrl);
      const newTag = `<img${beforeSrc}src="${dataUri}"${afterSrc}>`;
      newHtml = newHtml.replace(fullTag, newTag);
    }
  }

  return newHtml;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

interface EmailRequest {
  userId: string;
  to: string[];
  cc?: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from auth token
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    let emailRequest: EmailRequest = await req.json()

    // Convertir toutes les images dans le HTML en data URIs
    emailRequest.htmlBody = await embedImagesInHtml(emailRequest.htmlBody)

    // Verify userId matches authenticated user
    if (emailRequest.userId !== user.id) {
      throw new Error('Unauthorized: User ID mismatch')
    }

    // Get SMTP configuration from user_settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('user_settings')
      .select('smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure, sender_name, sender_email')
      .eq('user_id', user.id)
      .maybeSingle()

    if (settingsError) {
      console.error('Error fetching settings:', settingsError)
      throw new Error(`Database error: ${settingsError.message}`)
    }

    if (!settings) {
      throw new Error('SMTP configuration not found. Please configure SMTP settings in the Settings page.')
    }

    if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password) {
      throw new Error('SMTP configuration incomplete')
    }

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: settings.smtp_host,
        port: settings.smtp_port || 587,
        tls: settings.smtp_secure !== false,
        auth: {
          username: settings.smtp_user,
          password: settings.smtp_password,
        },
      },
    });

    // Send email with HTML for clickable links but simple formatting
    await client.send({
      from: settings.sender_email || settings.smtp_user,
      to: emailRequest.to,
      cc: emailRequest.cc || [],
      subject: emailRequest.subject,
      content: emailRequest.textBody, // Plain text fallback
      html: emailRequest.htmlBody, // HTML with clickable links
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send email' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})