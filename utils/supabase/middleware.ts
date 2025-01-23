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

    // IMPORTANT: Get user before any other Supabase calls
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // Handle auth protected routes
    if (request.nextUrl.pathname.startsWith("/protected") && userError) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // If user is authenticated, check registration status
    if (user && !userError) {
      // Skip registration check for auth and api routes
      if (
        !request.nextUrl.pathname.startsWith("/sign-") &&
        !request.nextUrl.pathname.startsWith("/api/")
      ) {
        // Check if user exists in our database and get their role
        const { data: dbUser } = await supabase
          .from("users")
          .select("id, role")
          .eq("id", user.id)
          .single();

        // User is authenticated but not registered
        if (!dbUser) {
          // Allow access to registration
          if (request.nextUrl.pathname === "/register") {
            return response;
          }
          // Redirect to registration for all other routes
          return NextResponse.redirect(new URL("/register", request.url));
        }

        // If user is an admin, check if they have an organization
        if (dbUser.role === "admin") {
          const { data: org } = await supabase
            .from("organizations")
            .select("id")
            .eq("admin_id", user.id)
            .single();

          // Admin without organization needs to complete registration
          if (!org) {
            // Allow access to registration
            if (request.nextUrl.pathname === "/register") {
              return response;
            }
            // Redirect to registration for all other routes
            return NextResponse.redirect(new URL("/register", request.url));
          }
        }
        // If user is an agent, check if they're part of an organization
        else if (dbUser.role === "agent") {
          const { data: membership } = await supabase
            .from("organization_members")
            .select("id")
            .eq("user_id", user.id)
            .single();

          // Agent without organization needs to complete registration
          if (!membership) {
            // Allow access to registration
            if (request.nextUrl.pathname === "/register") {
              return response;
            }
            // Redirect to registration for all other routes
            return NextResponse.redirect(new URL("/register", request.url));
          }
        }

        // User is registered but trying to access registration
        if (request.nextUrl.pathname === "/register") {
          // Redirect customers to customer portal, others to inbox
          const redirectPath = dbUser.role === "customer" 
            ? "/protected/customer-portal" 
            : "/protected/inbox";
          return NextResponse.redirect(new URL(redirectPath, request.url));
        }

        // Handle root redirect for registered users
        if (request.nextUrl.pathname === "/") {
          const redirectPath = dbUser.role === "customer" 
            ? "/protected/customer-portal" 
            : "/protected/inbox";
          return NextResponse.redirect(new URL(redirectPath, request.url));
        }
      }
    }

    // Handle root redirect for authenticated but unregistered users
    if (request.nextUrl.pathname === "/" && !userError) {
      return NextResponse.redirect(new URL("/register", request.url));
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
    console.error("Middleware error:", e);
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
