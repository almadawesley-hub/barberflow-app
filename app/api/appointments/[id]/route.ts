import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";

const updateSchema = z.object({
  status: z.enum(["SCHEDULED", "CONFIRMED", "WAITING", "IN_PROGRESS", "DONE", "CANCELED", "NO_SHOW"]).optional(),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

/** Barbeiro só pode mexer nos próprios agendamentos — Admin/Recepcionista
 * podem mexer em qualquer um. Isso reforça o que já era feito só na
 * listagem (GET), que filtrava a agenda por barbeiro. */
async function assertCanModify(tx: any, user: { id: string; role: string }, appointmentId: string) {
  if (user.role === "BARBER") {
    const appt = await tx.appointment.findUniqueOrThrow({ where: { id: appointmentId }, select: { barberId: true } });
    if (appt.barberId !== user.id) {
      const err = new Error("Você só pode alterar os próprios agendamentos") as Error & { status?: number };
      err.status = 403;
      throw err;
    }
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const body = updateSchema.parse(await req.json());

  try {
    const appointment = await withTenantContext(user.companyId, async (tx) => {
      await assertCanModify(tx, user, params.id);
      return tx.appointment.update({ where: { id: params.id }, data: body });
    });
    return NextResponse.json({ data: appointment });
  } catch (err) {
    const status = (err as any)?.status ?? 500;
    return NextResponse.json({ error: { message: err instanceof Error ? err.message : String(err) } }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();

  try {
    await withTenantContext(user.companyId, async (tx) => {
      await assertCanModify(tx, user, params.id);
      await tx.appointment.delete({ where: { id: params.id } });
    });
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const status = (err as any)?.status ?? 500;
    return NextResponse.json({ error: { message: err instanceof Error ? err.message : String(err) } }, { status });
  }
}
