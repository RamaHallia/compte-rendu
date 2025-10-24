import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TokenRequest {
  userId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { userId }: TokenRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");

    if (!clerkSecretKey) {
      return new Response(
        JSON.stringify({ error: "Clerk secret key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Récupérer les tokens OAuth depuis Clerk
    const url = `https://api.clerk.com/v1/users/${userId}/oauth_access_tokens/oauth_google`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Clerk API error:", errorData);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch Gmail token from Clerk",
          details: errorData,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error fetching Gmail token:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});