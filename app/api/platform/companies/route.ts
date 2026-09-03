import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requirePlatformAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  companyName: z.string().min(1),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
});

type CompanyRow = { id: string; name: string; created_at: string; user_count: bigint };

export async function GET() {
  try {
    await requirePlatformAdmin();
    // platform_list_companies ignora RLS de propósito — é a única área
    // do sistema que legitimamente precisa ver todas as empresas.
    const rows = await prisma.$queryRaw<CompanyRow[]>`select * from platform_list_companies()`;
    const data = rows.map((r) => ({ ...r, user_count: Number(r.user_count) }));
    return NextResponse.json({ data });
  } catch (err) {
    const status = (err as any)?.status ?? 500;
    return NextResponse.json({ error: { message: err instanceof Error ? err.message : String(err) } }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const body = schema.parse(await req.json());

    const passwordHash = await bcrypt.hash(body.adminPassword, 10);

    const rows = await prisma.$queryRaw<{ company_id: string; user_id: string }[]>`
      select * from platform_create_company(${body.companyName}, ${body.adminName}, ${body.adminEmail}, ${passwordHash})
    `;

    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (err) {
    const status = (err as any)?.status ?? 500;
    return NextResponse.json({ error: { message: err instanceof Error ? err.message : String(err) } }, { status });
  }
}
