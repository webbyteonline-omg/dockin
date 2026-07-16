import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC_PATHS = ["/welcome", "/login", "/signup", "/offline"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail OPEN, not closed: if Supabase env vars are missing/malformed, or the
  // auth check itself throws (e.g. a transient Supabase outage, a client
  // version incompatibility), letting the request through un-redirected is
  // far better than 500ing every single page on the site. Page-level auth
  // guards (AuthListener / useAuthStore) still catch unauthenticated access
  // client-side, so this is a redirect optimization, not the only defense.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("middleware: missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY — skipping auth redirect");
    return response;
  }

  let user: { id: string } | null = null;
  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    console.error("middleware: supabase.auth.getUser() threw, skipping auth redirect", err);
    return response;
  }

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup" || pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static files, images, icons, sw, manifest and api
     * routes that carry their own auth (cron uses a secret header).
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|api/cron|api/parse-calendar|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
