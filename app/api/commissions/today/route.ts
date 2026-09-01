import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";

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
    });

    const items = await tx.saleItem.findMany({
      where: { barberId: { in: barbers.map((b) => b.id) }, sale: { status: "concluida", createdAt: { gte: start, lte: end } } },
      select: { barberId: true, unitPrice: true, quantity: true },
    });

    return barbers
      .map((b) => {
        const production = items.filter((i) => i.barberId === b.id).reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
        const commission = Math.round(production * (Number(b.commissionPercent ?? 0) / 100) * 100) / 100;
        return { ...b, production, commission };
      })
      .sort((a, b) => b.production - a.production);
  });

  return NextResponse.json({ data });
}
