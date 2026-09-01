import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";

const schema = z.object({
  type: z.enum(["SERVICE", "PRODUCT"]),
  refId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const body = schema.parse(await req.json());

  const item = await withTenantContext(user.companyId, async (tx) => {
    const sale = await tx.sale.findUniqueOrThrow({ where: { id: params.id } });
    if (sale.status !== "aberta") {
      const err = new Error("Comanda já foi fechada") as Error & { status?: number };
      err.status = 409;
      throw err;
    }

    const unitPrice =
      body.type === "SERVICE"
        ? (await tx.service.findUniqueOrThrow({ where: { id: body.refId } })).price
        : (await tx.product.findUniqueOrThrow({ where: { id: body.refId } })).price;

    const created = await tx.saleItem.create({
      data: {
        saleId: sale.id,
        type: body.type,
        serviceId: body.type === "SERVICE" ? body.refId : undefined,
        productId: body.type === "PRODUCT" ? body.refId : undefined,
        barberId: sale.barberId,
        quantity: body.quantity,
        unitPrice,
      },
    });

    return created;
  });

  return NextResponse.json({ data: item }, { status: 201 });
}
