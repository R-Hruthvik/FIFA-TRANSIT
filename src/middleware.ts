import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const authPages = ["/login", "/signup", "/api/auth"];
const adminRoutes = ["/admin", "/api/admin"];
const staffRoutes = ["/staff", "/staff/*", "/api/track/event", "/api/track/plan", "/api/track/stream", "/api/fan/queries/stream", "/api/chat"];

export async function middleware(request: NextRequest) {
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

  // Protect admin routes
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin")
  ) {
    if (!isAuthenticated) {
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
    pathname.startsWith("/staff") ||
    pathname.startsWith("/api/track/event") ||
    pathname.startsWith("/api/track/plan") ||
    pathname.startsWith("/api/track/stream") ||
    pathname.startsWith("/api/fan/queries/stream") ||
    pathname.startsWith("/api/chat")
  ) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (userRole !== "staff" && userRole !== "admin") {
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