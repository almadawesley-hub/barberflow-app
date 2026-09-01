import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

const schema = z.object({
  pointsPerReal: z.number().positive(),
  threshold: z.number().int().positive(),
  rewardLabel: z.string().min(1),
});

export async function GET() {
  const user = await requireUser();
  const config = await withTenantContext(user.companyId, (tx) =>
    tx.loyaltyConfig.findUnique({ where: { companyId: user.companyId } })
  );
  return NextResponse.json({ data: config });
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  requireRole(user, ["ADMIN"]);
  const body = schema.parse(await req.json());

  const config = await withTenantContext(user.companyId, async (tx) => {
    const updated = await tx.loyaltyConfig.upsert({
      where: { companyId: user.companyId },
      update: body,
      create: { companyId: user.companyId, ...body },
    });
    await logAction(tx, user.companyId, user.id, "Configuração de fidelidade alterada");
    return updated;
  });

  return NextResponse.json({ data: config });
}
