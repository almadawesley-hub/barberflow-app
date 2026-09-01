import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";

export async function GET() {
  const user = await requireUser();
  requireRole(user, ["ADMIN"]);

  const logs = await withTenantContext(user.companyId, (tx) =>
    tx.auditLog.findMany({
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    })
  );

  return NextResponse.json({ data: logs });
}
