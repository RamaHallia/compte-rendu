import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  userId: string;
  to: string;
  subject: string;
  htmlBody: string;
  attachments?: Array<{
    filename: string;
    content: string;
    mimeType: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { userId, to, subject, htmlBody, attachments }: EmailRequest = await req.json();

    if (!userId || !to || !subject || !htmlBody) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Récupérer les tokens OAuth depuis l'autre edge function
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    const tokenResponse = await fetch(`${supabaseUrl}/functions/v1/get-gmail-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ userId }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      return new Response(
        JSON.stringify({
          error: "Failed to retrieve Gmail token",
          details: errorData,
        }),
        {
          status: tokenResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData[0]?.token) {
      return new Response(
        JSON.stringify({ error: "Gmail not connected or token unavailable" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const gmailAccessToken = tokenData[0].token;

    // Créer le message email au format RFC 2822
    const boundary = "boundary_" + Math.random().toString(36).substring(2);
    let message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: 7bit",
      "",
      htmlBody,
    ];

    // Ajouter les pièces jointes si présentes
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        message.push(
          `--${boundary}`,
          `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
          "Content-Transfer-Encoding: base64",
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
          "",
          attachment.content
        );
      }
    }

    message.push(`--${boundary}--`);

    const emailContent = message.join("\r\n");

    // Encoder en base64url
    const base64Email = btoa(emailContent)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Envoyer via Gmail API
    const gmailResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${gmailAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: base64Email,
      }),
    });

    if (!gmailResponse.ok) {
      const errorData = await gmailResponse.json();
      console.error("Gmail API error:", errorData);
      return new Response(
        JSON.stringify({
          error: "Failed to send email via Gmail",
          details: errorData
        }),
        {
          status: gmailResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await gmailResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});