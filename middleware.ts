import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const isSuperAdminArea = pathname.startsWith("/super-admin") && pathname !== "/super-admin/login";

  if (isSuperAdminArea) {
    if (!token || token.role !== "PLATFORM_ADMIN") {
      return NextResponse.redirect(new URL("/super-admin/login", req.url));
    }
    return NextResponse.next();
  }

  // Rotas normais de empresa — exige sessão de usuário de empresa (nunca
  // uma sessão de plataforma, que não tem companyId).
  if (!token || token.role === "PLATFORM_ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agenda/:path*",
    "/clientes/:path*",
    "/pdv/:path*",
    "/mais/:path*",
    "/super-admin/:path*",
  ],
};
