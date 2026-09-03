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

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    // Login normal — administradores/recepcionistas/barbeiros de cada empresa.
    CredentialsProvider({
      id: "credentials",
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        try {
          // Não sabemos a empresa ainda, então usamos a função SQL
          // auth_lookup_user (SECURITY DEFINER) em vez de uma query normal
          // — é a única exceção autorizada a ignorar o RLS, só pra isso.
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
    // Login da plataforma — só para /super-admin, totalmente separado dos
    // usuários de empresa. Credenciais fixas em variável de ambiente,
    // sem tabela própria (é uso pessoal, não multiusuário).
    CredentialsProvider({
      id: "platform",
      name: "Plataforma",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const expectedEmail = process.env.PLATFORM_ADMIN_EMAIL;
        const expectedHash = process.env.PLATFORM_ADMIN_PASSWORD_HASH;
        console.log("[platform-auth] PLATFORM_ADMIN_EMAIL definida?", !!expectedEmail);
        console.log("[platform-auth] PLATFORM_ADMIN_PASSWORD_HASH definida?", !!expectedHash);
        console.log("[platform-auth] email recebido:", credentials.email, "| email esperado:", expectedEmail);

        if (!expectedEmail || !expectedHash) {
          console.error("[platform-auth] variáveis de ambiente ausentes");
          return null;
        }

        const receivedEmail = credentials.email.trim().toLowerCase();
        const expectedEmailNormalized = expectedEmail.trim().toLowerCase();
        console.log("[platform-auth] comparação exata:", JSON.stringify(receivedEmail), "vs", JSON.stringify(expectedEmailNormalized));

        if (receivedEmail !== expectedEmailNormalized) {
          console.error("[platform-auth] e-mail não bate");
          return null;
        }
        const valid = await bcrypt.compare(credentials.password, expectedHash.trim());
        console.log("[platform-auth] senha bateu?", valid);
        if (!valid) return null;

        return { id: "platform", name: "Super Admin", email: expectedEmail, role: "PLATFORM_ADMIN" } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        if ((user as any).role !== "PLATFORM_ADMIN") {
          token.companyId = (user as any).companyId;
          token.branchId = (user as any).branchId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).companyId = token.companyId;
        (session.user as any).branchId = token.branchId;
      }
      return session;
    },
  },
};
