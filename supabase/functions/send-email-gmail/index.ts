import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
    contentType: string;
  }>;
}

interface GmailMessage {
  raw: string;
}

// Fonction pour encoder le sujet en RFC 2047 (MIME encoded-word)
function encodeSubject(subject: string): string {
  // Vérifier si le sujet contient des caractères non-ASCII
  if (!/[^\x00-\x7F]/.test(subject)) {
    return subject;
  }

  // Encoder en base64 pour les caractères UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(subject);
  const base64 = btoa(String.fromCharCode(...data));
  return `=?UTF-8?B?${base64}?=`;
}

// Fonction pour créer un message MIME multipart
function createMimeMessage(to: string, subject: string, html: string, attachments?: EmailRequest['attachments']): string {
  const boundary = `boundary_${Date.now()}`;
  const attachmentBoundary = `attachment_${Date.now()}`;

  let message = [
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    'MIME-Version: 1.0',
  ];

  if (attachments && attachments.length > 0) {
    message.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    message.push('');
    message.push(`--${boundary}`);
    message.push(`Content-Type: multipart/alternative; boundary="${attachmentBoundary}"`);
    message.push('');
    message.push(`--${attachmentBoundary}`);
    message.push('Content-Type: text/html; charset=UTF-8');
    message.push('Content-Transfer-Encoding: quoted-printable');
    message.push('');
    message.push(html);
    message.push(`--${attachmentBoundary}--`);
    
    // Ajouter les pièces jointes
    for (const attachment of attachments) {
      message.push(`--${boundary}`);
      message.push(`Content-Type: ${attachment.contentType}; name="${attachment.filename}"`);
      message.push('Content-Transfer-Encoding: base64');
      message.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
      message.push('');
      message.push(attachment.content);
    }
    
    message.push(`--${boundary}--`);
  } else {
    message.push('Content-Type: text/html; charset=UTF-8');
    message.push('Content-Transfer-Encoding: quoted-printable');
    message.push('');
    message.push(html);
  }

  return message.join('\r\n');
}

// Fonction pour encoder en base64url (sans padding)
function base64UrlEncode(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Fonction pour rafraîchir le token d'accès
async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return await response.json();
}

// Fonction pour envoyer l'email via l'API Gmail
async function sendGmailMessage(accessToken: string, message: GmailMessage): Promise<any> {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail API error: ${error}`);
  }

  return await response.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer l'utilisateur authentifié
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Récupérer les paramètres de l'email
    const emailRequest: EmailRequest = await req.json();
    let { to, subject, html, attachments } = emailRequest;

    // Convertir toutes les images dans le HTML en data URIs
    html = await embedImagesInHtml(html);

    if (!to || !subject || !html) {
      throw new Error('Missing required fields: to, subject, html');
    }

    // Récupérer les tokens Gmail de l'utilisateur
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('gmail_access_token, gmail_refresh_token, gmail_token_expiry, gmail_email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError || !settings) {
      throw new Error('Failed to fetch user settings');
    }

    if (!settings.gmail_refresh_token) {
      throw new Error('Gmail not connected. Please connect your Gmail account in settings.');
    }

    let accessToken = settings.gmail_access_token;
    const tokenExpiry = settings.gmail_token_expiry ? new Date(settings.gmail_token_expiry) : null;
    const now = new Date();

    // Vérifier si le token a expiré et le rafraîchir si nécessaire
    if (!accessToken || !tokenExpiry || tokenExpiry <= now) {
      console.log('Access token expired or missing, refreshing...');
      
      const clientId = Deno.env.get('GMAIL_CLIENT_ID');
      const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        throw new Error('Gmail OAuth credentials not configured');
      }

      const tokenData = await refreshAccessToken(settings.gmail_refresh_token, clientId, clientSecret);
      accessToken = tokenData.access_token;

      // Mettre à jour le token dans la base de données
      const expiryDate = new Date(now.getTime() + tokenData.expires_in * 1000);
      await supabase
        .from('user_settings')
        .update({
          gmail_access_token: accessToken,
          gmail_token_expiry: expiryDate.toISOString(),
        })
        .eq('user_id', user.id);
    }

    // Créer le message MIME
    const mimeMessage = createMimeMessage(to, subject, html, attachments);
    const encodedMessage = base64UrlEncode(mimeMessage);

    // Envoyer l'email via l'API Gmail
    const result = await sendGmailMessage(accessToken, { raw: encodedMessage });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.id,
        message: 'Email sent successfully via Gmail'
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send email' 
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});