import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";
import { logAction } from "@/lib/audit";

const SUPABASE_URL = "https://nmbvveafeyngkpwqknjs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tYnZ2ZWFmZXluZ2twd3FrbmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjUwMDQsImV4cCI6MjEwMzgwMTAwNH0.Z4xElNJhEreZ9jCeIiYk0UvzqWOFmmr8GxTHsz08fQw";

/** Recebe um arquivo de imagem, sobe pro bucket "logos" no Supabase Storage
 * e salva a URL pública no cadastro da empresa. Só Admin pode trocar o logo. */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  requireRole(user, ["ADMIN"]);

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: { message: "Nenhum arquivo enviado" } }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: { message: "O arquivo precisa ser uma imagem" } }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "png";
  const path = `${user.companyId}/logo-${Date.now()}.${ext}`;

  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/logos/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": file.type,
    },
    body: await file.arrayBuffer(),
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => "");
    return NextResponse.json({ error: { message: `Falha ao subir imagem: ${text}` } }, { status: 502 });
  }

  const logoUrl = `${SUPABASE_URL}/storage/v1/object/public/logos/${path}`;

  await withTenantContext(user.companyId, async (tx) => {
    await tx.company.update({ where: { id: user.companyId }, data: { logoUrl } });
    await logAction(tx, user.companyId, user.id, "Logo da empresa atualizado");
  });

  return NextResponse.json({ data: { logoUrl } });
}
