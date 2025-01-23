import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
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
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // If no session and trying to access protected routes, redirect to login
    if (request.nextUrl.pathname.startsWith("/protected")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // Get user role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = userData?.role;

  // Handle routing based on role
  if (role === 'customer') {
    // If customer tries to access admin/agent routes, redirect to customer portal
    if (request.nextUrl.pathname.startsWith('/protected/inbox') || 
        request.nextUrl.pathname.startsWith('/protected/tickets/')) {
      return NextResponse.redirect(new URL('/protected/customer-portal', request.url));
    }
  } else if (role === 'admin' || role === 'agent') {
    // If admin/agent tries to access customer routes, redirect to inbox
    if (request.nextUrl.pathname.startsWith('/protected/customer')) {
      return NextResponse.redirect(new URL('/protected/inbox', request.url));
    }
  }

  return response;
}
