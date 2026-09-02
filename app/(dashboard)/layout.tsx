"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ALL_TABS = [
  { href: "/dashboard", label: "Início", roles: ["ADMIN"] },
  { href: "/agenda", label: "Agenda", roles: ["ADMIN", "RECEPTIONIST", "BARBER"] },
  { href: "/clientes", label: "Clientes", roles: ["ADMIN", "RECEPTIONIST", "BARBER"] },
  { href: "/pdv", label: "PDV", roles: ["ADMIN", "RECEPTIONIST"] },
  { href: "/mais", label: "Mais", roles: ["ADMIN", "RECEPTIONIST", "BARBER"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as any)?.role as string | undefined;

  const tabs = ALL_TABS.filter((t) => !role || t.roles.includes(role));

  return (
    <div className="min-h-screen bg-ink text-ivory font-sans">
      <header className="flex items-center justify-between px-4 py-3 border-b border-ink-line">
        <div>
          <div className="font-display text-lg font-semibold leading-tight">BarberFlow</div>
          <div className="text-xs text-muted">{session?.user?.name} · {role}</div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-muted text-sm">
          Sair
        </button>
      </header>

      <main className="pb-24">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 flex gap-1 p-2 bg-ink border-t border-ink-line">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex-1 text-center text-xs font-semibold py-2 rounded-lg ${
                active ? "bg-brass text-ink" : "bg-ink-soft text-muted"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
