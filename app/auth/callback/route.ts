import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // These can be used to customize the redirect behavior
  // const origin = requestUrl.origin;  // The base URL of the application
  // const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString() ?? "/";  // Custom redirect path from auth provider

  if (code) {
    const supabase = await createClient();

    // Exchange the auth code for the user's session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // Get the user to check if they need to register
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Failed to get user:', userError);
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // Check if user exists in users table
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userCheckError || !existingUser || !existingUser.role) {
      // User needs to complete registration
      return NextResponse.redirect(new URL('/protected/register', request.url));
    }

    // User exists and has a role, redirect to their dashboard
    return NextResponse.redirect(new URL('/protected/dashboard', request.url));
  }

  // No code, redirect to sign in
  return NextResponse.redirect(new URL('/sign-in', request.url));
}
