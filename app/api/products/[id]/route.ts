import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().optional(),
  costPrice: z.number().nonnegative().optional(),
  price: z.number().positive().optional(),
  minStock: z.number().int().nonnegative().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const body = schema.parse(await req.json());

  const product = await withTenantContext(user.companyId, async (tx) => {
    const updated = await tx.product.update({ where: { id: params.id }, data: body });
    await logAction(tx, user.companyId, user.id, `Produto alterado — ${updated.name}`);
    return updated;
  });

  return NextResponse.json({ data: product });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();

  await withTenantContext(user.companyId, async (tx) => {
    const product = await tx.product.update({ where: { id: params.id }, data: { isActive: false } });
    await logAction(tx, user.companyId, user.id, `Produto excluído — ${product.name}`);
  });

  return NextResponse.json({ data: { deleted: true } });
}
