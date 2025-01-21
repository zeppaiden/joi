import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  // This `try/catch` block is only here for the interactive tutorial.
  // Feel free to remove once you have Supabase connected.
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // Handle unauthenticated users
    if (userError || !user) {
      // Allow access to auth-related and public routes
      if (
        request.nextUrl.pathname.startsWith("/auth") ||
        request.nextUrl.pathname === "/" ||
        request.nextUrl.pathname === "/sign-in"
      ) {
        return response;
      }
      // Redirect to sign in for protected routes
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // Check if user exists in users table
    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    // If authenticated but not in users table, redirect to onboarding
    if (!dbUser && !request.nextUrl.pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    // Handle role-based routing if user exists
    if (dbUser) {
      const { role } = dbUser;
      const path = request.nextUrl.pathname;

      // Block customers from dashboard
      if (role === "customer" && path.startsWith("/dashboard")) {
        return NextResponse.redirect(new URL("/portal", request.url));
      }

      // Block admin/agent from portal
      if ((role === "admin" || role === "agent") && path.startsWith("/portal")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      // Redirect to appropriate section if at root
      if (path === "/") {
        const redirectPath = role === "customer" ? "/portal" : "/dashboard";
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }

    // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
    // creating a new response object with NextResponse.next() make sure to:
    // 1. Pass the request in it, like so:
    //    const myNewResponse = NextResponse.next({ request })
    // 2. Copy over the cookies, like so:
    //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. Change the myNewResponse object to fit your needs, but avoid changing
    //    the cookies!
    // 4. Finally:
    //    return myNewResponse
    // If this is not done, you may be causing the browser and server to go out
    // of sync and terminate the user's session prematurely!

    return response;
  } catch (e) {
    // If you are here, a Supabase client could not be created!
    // This is likely because you have not set up environment variables.
    // Check out http://localhost:3000 for Next Steps.
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
