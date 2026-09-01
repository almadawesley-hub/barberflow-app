import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1).optional(),
  document: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

export async function GET() {
  const user = await requireUser();
  const company = await withTenantContext(user.companyId, (tx) => tx.company.findUniqueOrThrow({ where: { id: user.companyId } }));
  return NextResponse.json({ data: company });
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  requireRole(user, ["ADMIN"]);
  const body = schema.parse(await req.json());

  const company = await withTenantContext(user.companyId, async (tx) => {
    const updated = await tx.company.update({ where: { id: user.companyId }, data: body });
    await logAction(tx, user.companyId, user.id, "Dados da empresa alterados");
    return updated;
  });

  return NextResponse.json({ data: company });
}
