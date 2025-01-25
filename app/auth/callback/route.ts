import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString() ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the user after exchanging the code
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user exists in users table and has a role
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!userData || !userData.role) {
          // If no user record or no role, redirect to registration
          return NextResponse.redirect(`${origin}/register`);
        }

        // If user has a role, redirect to appropriate dashboard
        switch (userData.role) {
          case 'admin':
          case 'agent':
            return NextResponse.redirect(`${origin}/protected/inbox`);
          case 'customer':
            return NextResponse.redirect(`${origin}/protected/customer-portal`);
          default:
            return NextResponse.redirect(`${origin}/register`);
        }
      }
    }
  }

  // If there's an error or no code, redirect to error page
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
