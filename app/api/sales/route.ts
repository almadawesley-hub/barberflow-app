import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

const itemSchema = z.object({
  type: z.enum(["SERVICE", "PRODUCT"]),
  refId: z.string().uuid(),
  barberId: z.string().uuid(), // "Feito por" / "Vendido por" — cada item tem o seu
  quantity: z.number().int().positive().default(1),
});

const schema = z.object({
  customerId: z.string().uuid().optional(),
  method: z.enum(["CASH", "PIX", "DEBIT", "CREDIT"]),
  items: z.array(itemSchema).min(1),
});

export async function GET() {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "RECEPTIONIST"]);
  const sales = await withTenantContext(user.companyId, (tx) =>
    tx.sale.findMany({
      where: { status: "concluida" },
      include: { customer: true, barber: true, items: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
  );
  return NextResponse.json({ data: sales });
}

/** Venda avulsa (balcão) — não passa por agendamento/comanda. Cada item
 * carrega seu próprio barbeiro, então uma venda com corte do João e
 * produto vendido pela Ana credita a comissão certa pra cada um. */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "RECEPTIONIST"]);
  const body = schema.parse(await req.json());

  const sale = await withTenantContext(user.companyId, async (tx) => {
    const itemsWithPrice = await Promise.all(
      body.items.map(async (i) => {
        const unitPrice =
          i.type === "SERVICE"
            ? (await tx.service.findUniqueOrThrow({ where: { id: i.refId } })).price
            : (await tx.product.findUniqueOrThrow({ where: { id: i.refId } })).price;
        return { ...i, unitPrice };
      })
    );

    const total = itemsWithPrice.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);

    const created = await tx.sale.create({
      data: {
        companyId: user.companyId,
        customerId: body.customerId,
        status: "concluida",
        subtotal: total,
        total,
        items: {
          create: itemsWithPrice.map((i) => ({
            type: i.type,
            serviceId: i.type === "SERVICE" ? i.refId : undefined,
            productId: i.type === "PRODUCT" ? i.refId : undefined,
            barberId: i.barberId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
        payments: { create: [{ method: body.method, amount: total }] },
      },
      include: { items: true },
    });

    for (const i of itemsWithPrice) {
      if (i.type === "PRODUCT") {
        await tx.inventoryMovement.create({
          data: { companyId: user.companyId, productId: i.refId, type: "venda", quantity: -i.quantity },
        });
        await tx.product.update({ where: { id: i.refId }, data: { stock: { decrement: i.quantity } } });
      }
    }

    if (body.customerId) {
      const config = await tx.loyaltyConfig.findUnique({ where: { companyId: user.companyId } });
      const pointsPerReal = config ? Number(config.pointsPerReal) : 1;
      const priorSalesCount = await tx.sale.count({ where: { customerId: body.customerId, status: "concluida" } });
      await tx.customer.update({
        where: { id: body.customerId },
        data: {
          loyaltyPoints: { increment: Math.round(total * pointsPerReal) },
          tag: priorSalesCount <= 1 ? "recorrente" : undefined,
        },
      });
    }

    await logAction(tx, user.companyId, user.id, `Venda avulsa finalizada — R$ ${total.toFixed(2)}`);

    return created;
  });

  return NextResponse.json({ data: sale }, { status: 201 });
}
