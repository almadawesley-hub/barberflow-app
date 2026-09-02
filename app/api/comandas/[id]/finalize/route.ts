import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

const schema = z.object({ method: z.enum(["CASH", "PIX", "DEBIT", "CREDIT"]) });

/** Fechar a conta é uma transação única: baixa estoque, calcula o total,
 * credita pontos de fidelidade e marca o agendamento como concluído —
 * tudo ou nada, como decidido no desenho da API (nunca "venda fechada
 * mas estoque não baixou"). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    requireRole(user, ["ADMIN", "RECEPTIONIST"]);
    const body = schema.parse(await req.json());

    const sale = await withTenantContext(user.companyId, async (tx) => {
      const current = await tx.sale.findUniqueOrThrow({
        where: { id: params.id },
        include: { items: true, customer: true },
      });
      if (current.status !== "aberta") {
        const err = new Error("Comanda já foi fechada") as Error & { status?: number };
        err.status = 409;
        throw err;
      }
      if (current.items.length === 0) {
        const err = new Error("Comanda sem itens") as Error & { status?: number };
        err.status = 400;
        throw err;
      }

      const total = current.items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);

      const updated = await tx.sale.update({
        where: { id: current.id },
        data: {
          status: "concluida",
          subtotal: total,
          total,
          payments: { create: [{ method: body.method, amount: total }] },
        },
      });

      for (const item of current.items) {
        if (item.type === "PRODUCT" && item.productId) {
          await tx.inventoryMovement.create({
            data: { companyId: user.companyId, productId: item.productId, type: "venda", quantity: -item.quantity },
          });
          await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
        }
      }

      if (current.customerId) {
        const config = await tx.loyaltyConfig.findUnique({ where: { companyId: user.companyId } });
        const pointsPerReal = config ? Number(config.pointsPerReal) : 1;
        const priorSalesCount = await tx.sale.count({ where: { customerId: current.customerId, status: "concluida" } });

        await tx.customer.update({
          where: { id: current.customerId },
          data: {
            loyaltyPoints: { increment: Math.round(total * pointsPerReal) },
            ...(priorSalesCount <= 1 ? { tag: "recorrente" } : {}),
          },
        });
      }

      if (current.appointmentId) {
        await tx.appointment.update({ where: { id: current.appointmentId }, data: { status: "DONE" } });
      }

      await logAction(
        tx,
        user.companyId,
        user.id,
        `Venda fechada — ${current.customer?.name ?? "cliente avulso"} — R$ ${total.toFixed(2)}`
      );

      return updated;
    });

    return NextResponse.json({ data: sale });
  } catch (err) {
    console.error("[comandas/finalize] ERRO REAL:", err);
    const status = (err as any)?.status ?? 500;
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : String(err) } },
      { status }
    );
  }
}
