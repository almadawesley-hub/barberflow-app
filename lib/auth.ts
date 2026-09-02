import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

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
        console.log("AUTH DEBUG", credentials?.email, process.env.DATABASE_URL ? "DB_URL_SET" : "DB_URL_MISSING");
        if (!credentials?.email || !credentials.password) {
          return null;
        }
        try {
          const user = await prisma.user.findFirst({
            where: { email: credentials.email, isActive: true },
          });
          console.log("AUTH DEBUG user found:", !!user);
          if (!user) return null;
          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          console.log("AUTH DEBUG password valid:", valid);
          if (!valid) return null;
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            companyId: user.companyId,
            role: user.role,
            branchId: user.branchId,
          } as any;
        } catch (err) {
          console.error("AUTH DEBUG ERROR:", err);
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
