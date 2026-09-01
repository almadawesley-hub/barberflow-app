import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();

  const customer = await withTenantContext(user.companyId, (tx) =>
    tx.customer.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        sales: {
          where: { status: "concluida" },
          orderBy: { createdAt: "desc" },
          include: { items: true, barber: true },
        },
      },
    })
  );

  return NextResponse.json({ data: customer });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const body = updateSchema.parse(await req.json());

  const customer = await withTenantContext(user.companyId, async (tx) => {
    const updated = await tx.customer.update({ where: { id: params.id }, data: body });
    await logAction(tx, user.companyId, user.id, `Cliente alterado — ${updated.name}`);
    return updated;
  });

  return NextResponse.json({ data: customer });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();

  await withTenantContext(user.companyId, async (tx) => {
    const customer = await tx.customer.findUniqueOrThrow({ where: { id: params.id } });
    await tx.customer.delete({ where: { id: params.id } });
    await logAction(tx, user.companyId, user.id, `Cliente excluído — ${customer.name}`);
  });

  return NextResponse.json({ data: { deleted: true } });
}
