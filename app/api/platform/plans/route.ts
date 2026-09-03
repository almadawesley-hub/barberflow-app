import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type PlanRow = { id: string; name: string; price_monthly: string; max_users: number | null; max_branches: number | null };

export async function GET() {
  try {
    await requirePlatformAdmin();
    const rows = await prisma.$queryRaw<PlanRow[]>`select * from platform_list_plans()`;
    return NextResponse.json({ data: rows });
  } catch (err) {
    const status = (err as any)?.status ?? 500;
    return NextResponse.json({ error: { message: err instanceof Error ? err.message : String(err) } }, { status });
  }
}
