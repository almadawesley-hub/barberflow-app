import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";

/** Lista de barbeiros com produção e comissão de hoje (ainda não fechada).
 * Barbeiro logado só vê a si mesmo. */
export async function GET() {
  const user = await requireUser();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const data = await withTenantContext(user.companyId, async (tx) => {
    const barbers = await tx.user.findMany({
      where: { role: "BARBER", isActive: true, ...(user.role === "BARBER" ? { id: user.id } : {}) },
      select: { id: true, name: true, colorHex: true, commissionPercent: true },
      orderBy: { name: "asc" },
    });

    const items = await tx.saleItem.findMany({
      where: {
        barberId: { in: barbers.map((b) => b.id) },
        sale: { status: "concluida", createdAt: { gte: start, lte: end } },
      },
      select: { barberId: true, unitPrice: true, quantity: true },
    });

    return barbers.map((b) => {
      const total = items
        .filter((i) => i.barberId === b.id)
        .reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
      const pct = Number(b.commissionPercent ?? 0);
      return { ...b, todayProduction: total, todayCommission: Math.round(total * (pct / 100) * 100) / 100 };
    });
  });

  return NextResponse.json({ data });
}
