import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  userId: string;
  to: string[];
  cc?: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    const emailRequest: EmailRequest = await req.json()

    // Verify userId matches authenticated user
    if (emailRequest.userId !== user.id) {
      throw new Error('Unauthorized: User ID mismatch')
    }

    // Get SMTP configuration from user_settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('user_settings')
      .select('smtp_host, smtp_port, smtp_user, smtp_password_encrypted, smtp_secure, sender_name, sender_email')
      .eq('user_id', user.id)
      .single()

    if (settingsError || !settings) {
      throw new Error('SMTP configuration not found')
    }

    if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password_encrypted) {
      throw new Error('SMTP configuration incomplete')
    }

    // Déchiffrer le mot de passe SMTP
    const { data: decryptedPassword, error: decryptError } = await supabaseClient
      .rpc('decrypt_smtp_password', {
        encrypted_password: settings.smtp_password_encrypted,
        user_id: user.id
      })

    if (decryptError || !decryptedPassword) {
      console.error('Failed to decrypt SMTP password:', decryptError)
      throw new Error('Failed to decrypt SMTP password')
    }

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: settings.smtp_host,
        port: settings.smtp_port || 587,
        tls: settings.smtp_secure !== false,
        auth: {
          username: settings.smtp_user,
          password: decryptedPassword,
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

