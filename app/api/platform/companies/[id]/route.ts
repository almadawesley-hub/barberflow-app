import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1),
  planId: z.string().uuid(),
  status: z.enum(["trial", "active", "suspended"]),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePlatformAdmin();
    const body = schema.parse(await req.json());

    await prisma.$executeRaw`
      select platform_update_company(${params.id}::uuid, ${body.name}, ${body.planId}::uuid, ${body.status})
    `;

    return NextResponse.json({ data: { updated: true } });
  } catch (err) {
    const status = (err as any)?.status ?? 500;
    return NextResponse.json({ error: { message: err instanceof Error ? err.message : String(err) } }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePlatformAdmin();
    await prisma.$executeRaw`select platform_delete_company(${params.id}::uuid)`;
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const status = (err as any)?.status ?? 500;
    return NextResponse.json({ error: { message: err instanceof Error ? err.message : String(err) } }, { status });
  }
}
