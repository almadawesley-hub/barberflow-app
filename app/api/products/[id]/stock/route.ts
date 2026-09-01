import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

const schema = z.object({
  delta: z.number().int(), // positivo = entrada, negativo = baixa/ajuste
  type: z.enum(["entrada", "ajuste", "perda", "devolucao"]).default("ajuste"),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const body = schema.parse(await req.json());

  const product = await withTenantContext(user.companyId, async (tx) => {
    const current = await tx.product.findUniqueOrThrow({ where: { id: params.id } });
    const nextStock = Math.max(0, current.stock + body.delta);

    await tx.inventoryMovement.create({
      data: { companyId: user.companyId, productId: params.id, type: body.type, quantity: body.delta, notes: body.notes },
    });

    const updated = await tx.product.update({ where: { id: params.id }, data: { stock: nextStock } });
    await logAction(tx, user.companyId, user.id, `Estoque ajustado — ${updated.name} (${body.delta > 0 ? "+" : ""}${body.delta})`);
    return updated;
  });

  return NextResponse.json({ data: product });
}
