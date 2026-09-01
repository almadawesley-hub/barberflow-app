import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Executa `callback` dentro de uma transação que seta
 * `app.current_company_id` na sessão do Postgres. As policies de RLS
 * (ver /sql/001_rls_policies.sql) usam esse valor para filtrar toda
 * query automaticamente — mesmo que o código da aplicação esqueça um
 * `where: { companyId }`, o banco não deixa vazar dado de outra empresa.
 *
 * Toda rota de API que lê/escreve dado de tenant deve passar por aqui,
 * nunca usar `prisma` diretamente para essas tabelas.
 */
export async function withTenantContext<T>(
  companyId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  if (!UUID_RE.test(companyId)) {
    throw new Error("companyId inválido");
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_company_id = '${companyId}'`);
    return callback(tx);
  });
}
