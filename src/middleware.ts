import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith("/login");

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL("/tasks/tracker", req.url));
      }
      return null;
    }

    if (!isAuth) {
      let from = req.nextUrl.pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }
      return NextResponse.redirect(
        new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
      );
    }
  },
  {
    callbacks: {
      authorized: () => true, // We handle the auth check in the middleware function above
    },
  }
);

export const config = {
  matcher: [
    "/action-center/:path*",
    "/billing/:path*",
    "/chat/:path*",
    "/clients/:path*",
    "/emails/:path*",
    "/hr/:path*",
    "/leads/:path*",
    "/registers/:path*",
    "/reports/:path*",
    "/tasks/:path*",
    "/todo/:path*",
    "/login"
  ],
};
