import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

/** Marca o agendamento como "em atendimento" e abre a comanda (Sale
 * status "aberta") com o serviço agendado já dentro. A partir daqui,
 * tudo que o cliente consumir entra na mesma conta — ver
 * /api/comandas/[id]/items — até o fechamento em /finalize. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();

  const sale = await withTenantContext(user.companyId, async (tx) => {
    const appointment = await tx.appointment.update({
      where: { id: params.id },
      data: { status: "IN_PROGRESS" },
      include: { service: true, customer: true },
    });

    const created = await tx.sale.create({
      data: {
        companyId: user.companyId,
        customerId: appointment.customerId,
        barberId: appointment.barberId,
        appointmentId: appointment.id,
        status: "aberta",
        subtotal: appointment.price,
        total: appointment.price,
        items: {
          create: [
            {
              type: "SERVICE",
              serviceId: appointment.serviceId,
              barberId: appointment.barberId,
              quantity: 1,
              unitPrice: appointment.price,
            },
          ],
        },
      },
      include: { items: true },
    });

    await logAction(tx, user.companyId, user.id, `Comanda aberta — ${appointment.customer.name}`);
    return created;
  });

  return NextResponse.json({ data: sale }, { status: 201 });
}
