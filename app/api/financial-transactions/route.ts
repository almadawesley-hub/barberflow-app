import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

const schema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().optional(),
});

export async function GET() {
  const user = await requireUser();
  requireRole(user, ["ADMIN"]);

  const transactions = await withTenantContext(user.companyId, (tx) =>
    tx.financialTransaction.findMany({ orderBy: { date: "desc" }, take: 200 })
  );

  return NextResponse.json({ data: transactions });
}

/** Só lança despesas manualmente — receitas vêm sempre de uma venda
 * (comanda ou avulsa), nunca digitadas direto aqui. */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  requireRole(user, ["ADMIN"]);
  const body = schema.parse(await req.json());

  const transaction = await withTenantContext(user.companyId, async (tx) => {
    const created = await tx.financialTransaction.create({
      data: { companyId: user.companyId, type: "EXPENSE", ...body },
    });
    await logAction(tx, user.companyId, user.id, `Despesa lançada — ${created.description} — R$ ${Number(created.amount).toFixed(2)}`);
    return created;
  });

  return NextResponse.json({ data: transaction }, { status: 201 });
}
