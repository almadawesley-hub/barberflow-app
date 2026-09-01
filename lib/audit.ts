import { Prisma } from "@prisma/client";

/** Grava uma linha no histórico geral (auditoria). Sempre chamado de dentro
 * da mesma transação da operação que está sendo registrada. */
export async function logAction(
  tx: Prisma.TransactionClient,
  companyId: string,
  userId: string | null,
  action: string
) {
  await tx.auditLog.create({ data: { companyId, userId: userId ?? undefined, action } });
}
