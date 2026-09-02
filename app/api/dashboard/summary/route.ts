import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";

const META_MENSAL = 8000;

/** Um payload único pra alimentar o dashboard — evita a tela inicial
 * disparar N chamadas separadas. */
export async function GET() {
  try {
    const user = await requireUser();
    requireRole(user, ["ADMIN"]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);

    const data = await withTenantContext(user.companyId, async (tx) => {
      const [salesAgg, salesCount, appointmentsToday, products, customers, barbers] = await Promise.all([
        tx.sale.aggregate({ where: { status: "concluida", createdAt: { gte: monthStart } }, _sum: { total: true } }),
        tx.sale.count({ where: { status: "concluida", createdAt: { gte: monthStart } } }),
        tx.appointment.findMany({ where: { scheduledAt: { gte: dayStart, lte: dayEnd } }, select: { status: true } }),
        tx.product.findMany({ where: { isActive: true }, select: { stock: true, minStock: true } }),
        tx.customer.findMany({ select: { tag: true } }),
        tx.user.findMany({ where: { role: "BARBER", isActive: true }, select: { id: true, name: true, colorHex: true, commissionPercent: true } }),
      ]);

      const totalMes = Number(salesAgg._sum.total ?? 0);
      const ticketMedio = salesCount ? totalMes / salesCount : 0;

      const atendConcluidos = appointmentsToday.filter((a) => a.status === "DONE").length;
      const atendAgendados = appointmentsToday.filter((a) => ["SCHEDULED", "CONFIRMED"].includes(a.status)).length;

      const estoqueBaixo = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
      const esgotados = products.filter((p) => p.stock === 0).length;

      const novos = customers.filter((c) => c.tag === "novo").length;
      const vip = customers.filter((c) => c.tag === "vip").length;
      const inativos = customers.filter((c) => c.tag === "inativo").length;

      const items = await tx.saleItem.findMany({
        where: { barberId: { in: barbers.map((b) => b.id) }, sale: { status: "concluida", createdAt: { gte: dayStart, lte: dayEnd } } },
        select: { barberId: true, unitPrice: true, quantity: true },
      });
      const ranking = barbers
        .map((b) => {
          const total = items.filter((i) => i.barberId === b.id).reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
          return { ...b, total };
        })
        .sort((a, b) => b.total - a.total);

      return {
        totalMes,
        ticketMedio,
        atendConcluidos,
        atendAgendados,
        estoqueBaixo,
        esgotados,
        novos,
        vip,
        inativos,
        ranking,
        metaMensal: META_MENSAL,
      };
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[dashboard/summary] ERRO REAL:", err);
    return NextResponse.json({ error: { message: err instanceof Error ? err.message : String(err) } }, { status: 500 });
  }
}
