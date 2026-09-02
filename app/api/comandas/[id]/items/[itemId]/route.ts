import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";

const schema = z.object({ quantity: z.number().int() });

export async function PATCH(req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "RECEPTIONIST"]);
  const body = schema.parse(await req.json());

  const result = await withTenantContext(user.companyId, async (tx) => {
    if (body.quantity <= 0) {
      await tx.saleItem.delete({ where: { id: params.itemId } });
      return { deleted: true };
    }
    return tx.saleItem.update({ where: { id: params.itemId }, data: { quantity: body.quantity } });
  });

  return NextResponse.json({ data: result });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "RECEPTIONIST"]);
  await withTenantContext(user.companyId, (tx) => tx.saleItem.delete({ where: { id: params.itemId } }));
  return NextResponse.json({ data: { deleted: true } });
}
