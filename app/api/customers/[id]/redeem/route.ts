import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();

  const customer = await withTenantContext(user.companyId, async (tx) => {
    const config = await tx.loyaltyConfig.findUniqueOrThrow({ where: { companyId: user.companyId } });
    const existing = await tx.customer.findUniqueOrThrow({ where: { id: params.id } });

    if (existing.loyaltyPoints < config.threshold) {
      const err = new Error("Cliente ainda não atingiu o limiar de pontos") as Error & { status?: number };
      err.status = 400;
      throw err;
    }

    const updated = await tx.customer.update({
      where: { id: params.id },
      data: { loyaltyPoints: existing.loyaltyPoints - config.threshold },
    });

    await logAction(tx, user.companyId, user.id, `Recompensa resgatada — ${updated.name} — ${config.rewardLabel}`);
    return updated;
  });

  return NextResponse.json({ data: customer });
}
