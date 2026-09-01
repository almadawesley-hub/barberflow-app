import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  durationMinutes: z.number().int().positive(),
});

export async function GET() {
  const user = await requireUser();
  const services = await withTenantContext(user.companyId, (tx) =>
    tx.service.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
  );
  return NextResponse.json({ data: services });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = schema.parse(await req.json());

  const service = await withTenantContext(user.companyId, async (tx) => {
    const created = await tx.service.create({ data: { companyId: user.companyId, ...body } });
    await logAction(tx, user.companyId, user.id, `Serviço criado — ${created.name}`);
    return created;
  });

  return NextResponse.json({ data: service }, { status: 201 });
}
