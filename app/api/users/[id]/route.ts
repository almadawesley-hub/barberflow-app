import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireUser, requireRole } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "RECEPTIONIST", "BARBER"]).optional(),
  commissionPercent: z.number().min(0).max(100).optional(),
  colorHex: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  requireRole(user, ["ADMIN"]);
  const body = schema.parse(await req.json());

  const updated = await withTenantContext(user.companyId, async (tx) => {
    const { password, ...rest } = body;
    const data: Record<string, unknown> = { ...rest };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const result = await tx.user.update({ where: { id: params.id }, data });
    await logAction(tx, user.companyId, user.id, `Usuário alterado — ${result.name} (${result.role})`);
    return result;
  });

  return NextResponse.json({ data: { id: updated.id, name: updated.name, email: updated.email, role: updated.role } });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  requireRole(user, ["ADMIN"]);

  await withTenantContext(user.companyId, async (tx) => {
    // Soft delete: usuário some das listas mas não quebra vendas/agendamentos antigos que apontam pra ele.
    const target = await tx.user.update({ where: { id: params.id }, data: { isActive: false } });
    await logAction(tx, user.companyId, user.id, `Usuário excluído — ${target.name}`);
  });

  return NextResponse.json({ data: { deleted: true } });
}
