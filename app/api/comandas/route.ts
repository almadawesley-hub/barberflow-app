import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";

export async function GET() {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "RECEPTIONIST"]);

  const comandas = await withTenantContext(user.companyId, (tx) =>
    tx.sale.findMany({
      where: { status: "aberta" },
      include: { customer: true, barber: true, items: { include: { service: true, product: true } } },
      orderBy: { createdAt: "asc" },
    })
  );

  return NextResponse.json({ data: comandas });
}
