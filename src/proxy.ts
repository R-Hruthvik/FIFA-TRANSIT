import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const authPages = ["/login", "/signup", "/api/auth"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow auth routes and API auth callbacks
  if (authPages.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;
  const userRole = token?.role as "fan" | "staff" | "admin" | null;
  const isApiRoute = pathname.startsWith("/api/");

  // Protect admin routes
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin")
  ) {
    if (!isAuthenticated) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  // Protect staff routes
  if (
    (pathname.startsWith("/staff") && pathname !== "/staff/register") ||
    pathname.startsWith("/api/track/event") ||
    pathname.startsWith("/api/track/stream") ||
    pathname.startsWith("/api/fan/queries/stream") ||
    pathname.startsWith("/api/chat")
  ) {
    if (!isAuthenticated) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (userRole !== "staff" && userRole !== "admin") {
      if (isApiRoute) {
        return NextResponse.json({ error: "Staff access required" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Protect fan egress plan calculation endpoints
  if (pathname.startsWith("/api/track/plan")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Fans, staff, and admins are all authorized to access plan logic definitions
    if (userRole !== "fan" && userRole !== "staff" && userRole !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|ico|svg)$).*)",
  ],
};
