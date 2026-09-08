"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Users, TrendingUp, MoreHorizontal, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "../providers";

const ALL_TABS = [
  { href: "/dashboard", label: "Início", icon: Home, roles: ["ADMIN"] },
  { href: "/agenda", label: "Agenda", icon: Calendar, roles: ["ADMIN", "RECEPTIONIST", "BARBER"] },
  { href: "/clientes", label: "Clientes", icon: Users, roles: ["ADMIN", "RECEPTIONIST", "BARBER"] },
  { href: "/pdv", label: "Vendas", icon: TrendingUp, roles: ["ADMIN", "RECEPTIONIST"] },
  { href: "/mais", label: "Mais", icon: MoreHorizontal, roles: ["ADMIN", "RECEPTIONIST", "BARBER"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const role = (session?.user as any)?.role as string | undefined;
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const tabs = ALL_TABS.filter((t) => !role || t.roles.includes(role));
  const wordmarkSrc = theme === "dark" ? "/naviga-wordmark.png" : "/naviga-wordmark-black.png";

  useEffect(() => {
    if (!session) return;
    fetch("/api/company")
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.logoUrl) setLogoUrl(j.data.logoUrl);
      })
      .catch(() => {});
  }, [session]);

  return (
    <div className="min-h-screen bg-ink text-ivory font-sans">
      <header className="flex items-center justify-between px-4 py-3 border-b border-ink-line">
        <div className="flex items-center gap-2.5">
          {logoUrl && (
            <div className="w-10 h-10 rounded-xl border border-ink-line bg-ink-soft flex items-center justify-center flex-shrink-0">
              <img src={logoUrl} alt="" className="w-6 h-6 object-contain" onError={() => setLogoUrl(null)} />
            </div>
          )}
          <div>
            <img src={wordmarkSrc} alt="Naviga" className="h-4 object-contain" />
            <div className="text-xs text-muted mt-1">{session?.user?.name} · {role}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Alternar tema"
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-ink-line text-ivory"
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 text-xs font-semibold text-ivory border border-ink-line rounded-lg px-3 py-2"
          >
            <LogOut size={13} />
            Sair
          </button>
        </div>
      </header>

      <main className="pb-24">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 flex gap-1 p-2 bg-ink border-t border-ink-line">
        {tabs.map((t) => {
          const active = pathname === t.href;
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex-1 flex flex-col items-center gap-0.5 text-[11px] font-semibold py-2 rounded-xl transition-colors ${
                active ? "bg-brass/15 text-brass border border-brass/40" : "text-muted"
              }`}
            >
              <Icon size={17} />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
