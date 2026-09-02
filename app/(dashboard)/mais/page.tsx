"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

const ITEMS = [
  { href: "/mais/produtos", label: "Produtos & Estoque", roles: ["ADMIN", "RECEPTIONIST", "BARBER"] },
  { href: "/mais/servicos", label: "Serviços", roles: ["ADMIN", "RECEPTIONIST"] },
  { href: "/mais/caixa", label: "Caixa & Financeiro", roles: ["ADMIN"] },
  { href: "/mais/barbeiros", label: "Barbeiros & Comissões", roles: ["ADMIN", "RECEPTIONIST", "BARBER"] },
  { href: "/mais/fidelidade", label: "Fidelidade", roles: ["ADMIN", "RECEPTIONIST"] },
  { href: "/mais/usuarios", label: "Usuários", roles: ["ADMIN"] },
  { href: "/mais/empresa", label: "Empresa", roles: ["ADMIN"] },
  { href: "/mais/historico", label: "Histórico geral", roles: ["ADMIN"] },
];

export default function MaisPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const items = ITEMS.filter((i) => !role || i.roles.includes(role));

  return (
    <div className="px-4 pt-2 space-y-2">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className="flex items-center justify-between bg-ink-soft border border-ink-line rounded-xl p-3.5"
        >
          <span className="text-sm">{i.label}</span>
          <span className="text-muted">›</span>
        </Link>
      ))}
    </div>
  );
}
