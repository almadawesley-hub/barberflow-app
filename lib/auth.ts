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

        console.log("[auth] authorize chamado, email recebido:", credentials?.email);

        if (!credentials?.email || !credentials.password) {
          console.error("[auth] credenciais ausentes no request");
          return null;
        }

        try {
          const user = await prisma.user.findFirst({
            where: { email: credentials.email, isActive: true },
          });
          console.log("[auth] usuário encontrado no banco?", !!user);

          if (!user) return null;

          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
