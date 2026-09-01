import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// O login é a única operação que consulta `users` sem passar por
// withTenantContext: nesse ponto ainda não sabemos a empresa do
// usuário, então buscamos por e-mail (único por empresa, ver
// schema.prisma) usando o client direto. Depois de autenticado,
// toda outra query do app passa pelo contexto de tenant.
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findFirst({
          where: { email: credentials.email, isActive: true },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          companyId: user.companyId,
          role: user.role,
          branchId: user.branchId,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.companyId = (user as any).companyId;
        token.role = (user as any).role;
        token.branchId = (user as any).branchId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).companyId = token.companyId;
        (session.user as any).role = token.role;
        (session.user as any).branchId = token.branchId;
      }
      return session;
    },
  },
};
