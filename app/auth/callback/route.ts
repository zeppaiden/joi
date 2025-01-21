import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    // Check if user exists in users table
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: dbUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!dbUser) {
        // New user - redirect to onboarding
        return NextResponse.redirect(`${origin}/onboarding`);
      }

      // Existing user - redirect based on role
      const redirectPath = dbUser.role === "customer" ? "/portal" : "/dashboard";
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  // If there's a specific redirect URL, use it
  if (redirectTo) {
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // Fallback redirect to sign-in
  return NextResponse.redirect(`${origin}/sign-in`);
}
