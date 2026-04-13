import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

export async function proxy(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const supabase = createMiddlewareClient(req, res);

  // Refresh session — this writes updated cookies to the response
  const { data: { user } } = await supabase.auth.getUser();

  // Protect portal routes
  const isPortalRoute = req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/api-keys") ||
    req.nextUrl.pathname.startsWith("/usage") ||
    req.nextUrl.pathname.startsWith("/billing") ||
    req.nextUrl.pathname.startsWith("/docs");

  if (isPortalRoute && !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Protect admin routes — check for admin session cookie
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  const adminToken = req.cookies.get("admin_token")?.value;

  if (isAdminRoute && adminToken !== process.env.ADMIN_SECRET) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|login|admin/login).*)",
  ],
};
