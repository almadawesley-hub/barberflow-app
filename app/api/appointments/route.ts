import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";

const createSchema = z.object({
  customerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  barberId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const barberId = searchParams.get("barber_id");

  const appointments = await withTenantContext(user.companyId, (tx) =>
    tx.appointment.findMany({
      where: {
        ...(dateFrom || dateTo
          ? { scheduledAt: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined } }
          : {}),
        ...(barberId ? { barberId } : {}),
        // Barbeiro só vê a própria agenda.
        ...(user.role === "BARBER" ? { barberId: user.id } : {}),
      },
      include: { customer: true, service: true, barber: true },
      orderBy: { scheduledAt: "asc" },
    })
  );

  return NextResponse.json({ data: appointments });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = createSchema.parse(await req.json());

  const appointment = await withTenantContext(user.companyId, async (tx) => {
    const service = await tx.service.findFirstOrThrow({ where: { id: body.serviceId } });

    // Valida conflito de horário para o mesmo barbeiro — nunca confiar
    // só na validação do client.
    const scheduledAt = new Date(body.scheduledAt);
    const end = new Date(scheduledAt.getTime() + service.durationMinutes * 60_000);
    const conflict = await tx.appointment.findFirst({
      where: {
        barberId: body.barberId,
        status: { notIn: ["CANCELED", "NO_SHOW"] },
        scheduledAt: { lt: end },
        AND: [{ scheduledAt: { gte: new Date(scheduledAt.getTime() - 4 * 60 * 60_000) } }],
      },
    });
    if (conflict) {
      const err = new Error("Horário indisponível para este profissional") as Error & { status?: number };
      err.status = 409;
      throw err;
    }

    return tx.appointment.create({
      data: {
        companyId: user.companyId,
        customerId: body.customerId,
        serviceId: body.serviceId,
        barberId: body.barberId,
        scheduledAt,
        durationMinutes: service.durationMinutes,
        price: service.price,
        notes: body.notes,
      },
    });
  });

  return NextResponse.json({ data: appointment }, { status: 201 });
}
