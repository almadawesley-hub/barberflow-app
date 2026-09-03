import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

type AuthLookupRow = {
  id: string;
  company_id: string;
  branch_id: string | null;
  name: string;
  email: string;
  password_hash: string;
  role: "ADMIN" | "RECEPTIONIST" | "BARBER";
  is_active: boolean;
};

// O login é a única operação que consulta `users` sem saber a empresa
// ainda (buscamos por e-mail primeiro). Como a conexão do app usa o
// papel "app_user" (sem BYPASSRLS — ver /sql/002_app_user_role.sql),
// essa consulta bateria na política de RLS e não acharia ninguém.
// Por isso ela passa por uma função SQL "auth_lookup_user", criada com
// SECURITY DEFINER: só essa função específica ignora o RLS, nada mais
// no resto do app ganha esse privilégio.
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
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        try {
          const rows = await prisma.$queryRaw<AuthLookupRow[]>`
            select * from auth_lookup_user(${credentials.email})
          `;
          const user = rows[0];
          if (!user) return null;

          const valid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!valid) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            companyId: user.company_id,
            role: user.role,
            branchId: user.branch_id,
          } as any;
        } catch (err) {
          console.error("[auth] ERRO REAL durante authorize:", err);
          return null;
        }
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
