import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

/** Fecha o dia: agrupa a produção de hoje por barbeiro e grava (ou
 * atualiza, se rodar de novo no mesmo dia) uma linha em CommissionEntry.
 * Isso é o que faz a comissão "de hoje" — calculada ao vivo pelas
 * vendas do dia — zerar no dia seguinte: a partir da meia-noite,
 * `createdAt` das vendas já não cai mais no intervalo de "hoje" usado
 * em /api/commissions/today. */
export async function POST() {
  const user = await requireUser();
  requireRole(user, ["ADMIN"]);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entries = await withTenantContext(user.companyId, async (tx) => {
    const barbers = await tx.user.findMany({ where: { role: "BARBER", isActive: true } });

    const items = await tx.saleItem.findMany({
      where: { barberId: { in: barbers.map((b) => b.id) }, sale: { status: "concluida", createdAt: { gte: start, lte: end } } },
      select: { barberId: true, unitPrice: true, quantity: true },
    });

    const created = [];
    for (const barber of barbers) {
      const production = items.filter((i) => i.barberId === barber.id).reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
      if (production === 0) continue;

      const commission = Math.round(production * (Number(barber.commissionPercent ?? 0) / 100) * 100) / 100;

      const entry = await tx.commissionEntry.upsert({
        where: { barberId_date: { barberId: barber.id, date: today } },
        update: { production, commission },
        create: { companyId: user.companyId, barberId: barber.id, date: today, production, commission },
      });
      created.push(entry);
    }

    await logAction(tx, user.companyId, user.id, `Dia fechado — comissões arquivadas (${created.length} barbeiro(s))`);
    return created;
  });

  return NextResponse.json({ data: entries });
}
