import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  durationMinutes: z.number().int().positive().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "RECEPTIONIST"]);
  const body = schema.parse(await req.json());

  const service = await withTenantContext(user.companyId, async (tx) => {
    const updated = await tx.service.update({ where: { id: params.id }, data: body });
    await logAction(tx, user.companyId, user.id, `Serviço alterado — ${updated.name}`);
    return updated;
  });

  return NextResponse.json({ data: service });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "RECEPTIONIST"]);

  await withTenantContext(user.companyId, async (tx) => {
    const service = await tx.service.update({ where: { id: params.id }, data: { isActive: false } });
    await logAction(tx, user.companyId, user.id, `Serviço excluído — ${service.name}`);
  });

  return NextResponse.json({ data: { deleted: true } });
}
