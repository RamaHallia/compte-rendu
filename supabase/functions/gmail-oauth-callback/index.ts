import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface UserInfoResponse {
  email: string;
  verified_email: boolean;
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

    // Récupérer le code d'autorisation
    const { code } = await req.json();

    if (!code) {
      throw new Error('Missing authorization code');
    }

    const clientId = Deno.env.get('GMAIL_CLIENT_ID');
    const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');
    const redirectUri = Deno.env.get('GMAIL_REDIRECT_URI') || `${supabaseUrl.replace('.supabase.co', '')}/gmail-callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Gmail OAuth credentials not configured');
    }

    // Échanger le code contre des tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    const tokens: TokenResponse = await tokenResponse.json();

    // Récupérer les informations de l'utilisateur Gmail
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info from Gmail');
    }

    const userInfo: UserInfoResponse = await userInfoResponse.json();

    // Calculer la date d'expiration
    const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);

    // Mettre à jour ou insérer les paramètres utilisateur
    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        gmail_access_token: tokens.access_token,
        gmail_refresh_token: tokens.refresh_token,
        gmail_token_expiry: expiryDate.toISOString(),
        gmail_connected: true,
        gmail_email: userInfo.email,
        email_method: 'gmail',
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      throw new Error(`Failed to save tokens: ${upsertError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        email: userInfo.email,
        message: 'Gmail connected successfully'
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
    console.error('Error in Gmail OAuth callback:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to connect Gmail' 
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