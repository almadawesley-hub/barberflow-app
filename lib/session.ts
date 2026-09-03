import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  companyId: string;
  role: "ADMIN" | "RECEPTIONIST" | "BARBER";
  branchId: string | null;
};

export type PlatformSessionUser = {
  role: "PLATFORM_ADMIN";
  email: string;
};

/** Lê o usuário logado a partir da sessão NextAuth, ou null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const role = (session.user as any).role;
  if (role === "PLATFORM_ADMIN") return null; // sessão de plataforma não é um usuário de empresa
  return session.user as unknown as SessionUser;
}

/** Como getCurrentUser, mas lança 401 se não houver sessão — use em API routes. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const err = new Error("Não autenticado") as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  return user;
}

/** Garante que o usuário logado tem um dos papéis informados. */
export function requireRole(user: SessionUser, roles: SessionUser["role"][]) {
  if (!roles.includes(user.role)) {
    const err = new Error("Sem permissão") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
}

/** Sessão da área /super-admin — completamente separada dos usuários de
 * empresa. Lança 401/403 se não for uma sessão de plataforma válida. */
export async function requirePlatformAdmin(): Promise<PlatformSessionUser> {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "PLATFORM_ADMIN") {
    const err = new Error("Acesso restrito à plataforma") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
  return { role: "PLATFORM_ADMIN", email: (session!.user as any).email };
}
