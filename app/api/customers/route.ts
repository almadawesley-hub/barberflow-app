import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  const customers = await withTenantContext(user.companyId, (tx) =>
    tx.customer.findMany({
      where: search
        ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] }
        : undefined,
      orderBy: { createdAt: "desc" },
    })
  );

  return NextResponse.json({ data: customers });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = createSchema.parse(await req.json());

  const customer = await withTenantContext(user.companyId, async (tx) => {
    const created = await tx.customer.create({ data: { companyId: user.companyId, ...body, tag: "novo" } });
    await logAction(tx, user.companyId, user.id, `Cliente cadastrado — ${created.name}`);
    return created;
  });

  return NextResponse.json({ data: customer }, { status: 201 });
}
