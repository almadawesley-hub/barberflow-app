import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const barberId = searchParams.get("barber_id") ?? (user.role === "BARBER" ? user.id : undefined);

  const entries = await withTenantContext(user.companyId, (tx) =>
    tx.commissionEntry.findMany({
      where: barberId ? { barberId } : undefined,
      include: { barber: { select: { name: true, colorHex: true } } },
      orderBy: { date: "desc" },
    })
  );

  return NextResponse.json({ data: entries });
}
