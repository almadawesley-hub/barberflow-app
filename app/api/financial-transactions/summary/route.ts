import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";

/** Receita vem das vendas concluídas (comanda + avulsa); despesa vem
 * dos lançamentos manuais em /api/financial-transactions. Aqui juntamos
 * os dois pra dar o resumo de caixa — mesma lógica do protótipo. */
export async function GET(req: NextRequest) {
  const user = await requireUser();
  requireRole(user, ["ADMIN"]);
  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("date_from") ? new Date(searchParams.get("date_from")!) : undefined;
  const dateTo = searchParams.get("date_to") ? new Date(searchParams.get("date_to")!) : undefined;

  const summary = await withTenantContext(user.companyId, async (tx) => {
    const [salesAgg, expensesAgg] = await Promise.all([
      tx.sale.aggregate({
        where: { status: "concluida", createdAt: { gte: dateFrom, lte: dateTo } },
        _sum: { total: true },
      }),
      tx.financialTransaction.aggregate({
        where: { type: "EXPENSE", date: { gte: dateFrom, lte: dateTo } },
        _sum: { amount: true },
      }),
    ]);

    const receita = Number(salesAgg._sum.total ?? 0);
    const despesas = Number(expensesAgg._sum.amount ?? 0);
    return { receita, despesas, lucro: receita - despesas };
  });

  return NextResponse.json({ data: summary });
}
