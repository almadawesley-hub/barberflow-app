import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireUser, requireRole } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "RECEPTIONIST", "BARBER"]),
  commissionPercent: z.number().min(0).max(100).optional(),
  colorHex: z.string().optional(),
});

export async function GET() {
  const user = await requireUser();
  requireRole(user, ["ADMIN"]);

  const users = await withTenantContext(user.companyId, (tx) =>
    tx.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, role: true, commissionPercent: true, colorHex: true, createdAt: true },
      orderBy: { name: "asc" },
    })
  );

  return NextResponse.json({ data: users });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  requireRole(user, ["ADMIN"]);
  const body = schema.parse(await req.json());
  const passwordHash = await bcrypt.hash(body.password, 10);

  const created = await withTenantContext(user.companyId, async (tx) => {
    const newUser = await tx.user.create({
      data: {
        companyId: user.companyId,
        name: body.name,
        email: body.email,
        passwordHash,
        role: body.role,
        commissionPercent: body.role === "BARBER" ? body.commissionPercent ?? 40 : undefined,
        colorHex: body.colorHex,
      },
    });
    await logAction(tx, user.companyId, user.id, `Usuário cadastrado — ${newUser.name} (${newUser.role})`);
    return newUser;
  });

  return NextResponse.json({ data: { id: created.id, name: created.name, email: created.email, role: created.role } }, { status: 201 });
}
