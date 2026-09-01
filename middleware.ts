import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  // Tudo dentro do grupo (dashboard) exige sessão. /login e /api/auth
  // ficam de fora automaticamente por não baterem com o matcher.
  matcher: ["/dashboard/:path*", "/agenda/:path*", "/clientes/:path*", "/pdv/:path*", "/mais/:path*"],
};
