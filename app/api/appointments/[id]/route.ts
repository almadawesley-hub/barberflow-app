import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";

const updateSchema = z.object({
  status: z.enum(["SCHEDULED", "CONFIRMED", "WAITING", "IN_PROGRESS", "DONE", "CANCELED", "NO_SHOW"]).optional(),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const body = updateSchema.parse(await req.json());

  const appointment = await withTenantContext(user.companyId, (tx) =>
    tx.appointment.update({ where: { id: params.id }, data: body })
  );

  return NextResponse.json({ data: appointment });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();

  await withTenantContext(user.companyId, (tx) => tx.appointment.delete({ where: { id: params.id } }));

  return NextResponse.json({ data: { deleted: true } });
}
