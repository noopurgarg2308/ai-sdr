import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/client-admin")) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || "change-me-in-production",
    });
    if (pathname.startsWith("/client-admin/login")) {
      if (token) return NextResponse.redirect(new URL("/client-admin", request.url));
    } else if (!token) {
      const loginUrl = new URL("/client-admin/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/client-admin/:path*"],
};
