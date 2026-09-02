import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  costPrice: z.number().nonnegative().default(0),
  price: z.number().positive(),
  stock: z.number().int().nonnegative().default(0),
  minStock: z.number().int().nonnegative().default(5),
});

export async function GET() {
  const user = await requireUser();
  const products = await withTenantContext(user.companyId, (tx) =>
    tx.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
  );
  return NextResponse.json({ data: products });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "RECEPTIONIST"]);
  const body = schema.parse(await req.json());

  const product = await withTenantContext(user.companyId, async (tx) => {
    const created = await tx.product.create({ data: { companyId: user.companyId, ...body } });
    if (created.stock > 0) {
      await tx.inventoryMovement.create({
        data: { companyId: user.companyId, productId: created.id, type: "entrada", quantity: created.stock, notes: "Estoque inicial" },
      });
    }
    await logAction(tx, user.companyId, user.id, `Produto cadastrado — ${created.name}`);
    return created;
  });

  return NextResponse.json({ data: product }, { status: 201 });
}
