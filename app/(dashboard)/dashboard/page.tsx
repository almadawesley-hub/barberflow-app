"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { DollarSign, Ticket, Users, PackageX, Target, Trophy } from "lucide-react";

type Summary = {
  totalMes: number;
  ticketMedio: number;
  atendConcluidos: number;
  atendAgendados: number;
  estoqueBaixo: number;
  esgotados: number;
  novos: number;
  vip: number;
  inativos: number;
  ranking: { id: string; name: string; colorHex: string | null; total: number }[];
  metaMensal: number;
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error?.message ?? `/api/dashboard/summary respondeu ${res.status}`);
      }
      const json = await res.json();
      setSummary(json.data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro desconhecido ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="px-4 pt-3">
      <h1 className="font-display text-xl font-semibold mb-4">Olá, {session?.user?.name}</h1>

      {loading && <div className="text-center text-muted text-sm py-10">Carregando...</div>}
      {loadError && (
        <div className="text-center text-red-400 text-xs py-4 border border-red-500/40 rounded-lg mb-3">
          Erro ao carregar: {loadError}
        </div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <MetricCard icon={DollarSign} accent="#C79A54" value={`R$ ${fmt(summary.totalMes)}`} label="Faturamento (mês)" />
            <MetricCard icon={Ticket} accent="#6E7E58" value={`R$ ${fmt(Math.round(summary.ticketMedio))}`} label="Ticket médio" />
            <MetricCard icon={Users} accent="#8A6C3C" value={String(summary.atendConcluidos)} label="Atendimentos hoje" sub={`${summary.atendAgendados} agendados`} />
            <MetricCard icon={PackageX} accent="#B54A3C" value={String(summary.estoqueBaixo)} label="Estoque baixo" sub={`${summary.esgotados} esgotados`} />
          </div>

          <SectionCard icon={Target}>
            <div className="flex justify-between items-baseline mb-2.5">
              <span className="font-semibold text-sm">Meta mensal</span>
              <span className="text-xs text-muted">R$ {fmt(summary.totalMes)} / R$ {fmt(summary.metaMensal)}</span>
            </div>
            <div className="h-2 rounded bg-ink overflow-hidden">
              <div
                className="h-full bg-brass rounded"
                style={{ width: `${Math.min(100, Math.round((summary.totalMes / summary.metaMensal) * 100))}%` }}
              />
            </div>
          </SectionCard>

          <SectionCard icon={Users}>
            <div className="font-semibold text-sm mb-3">Clientes</div>
            <div className="flex">
              <MiniStat label="Novos" value={summary.novos} />
              <div className="w-px bg-ink-line mx-4" />
              <MiniStat label="VIP" value={summary.vip} />
              <div className="w-px bg-ink-line mx-4" />
              <MiniStat label="Inativos" value={summary.inativos} />
            </div>
          </SectionCard>

          <SectionCard icon={Trophy}>
            <div className="font-semibold text-sm mb-3">Ranking de hoje</div>
            {summary.ranking.length === 0 && <div className="text-xs text-muted">Nenhuma venda hoje ainda.</div>}
            {summary.ranking.map((b, i) => (
              <div key={b.id} className="flex items-center gap-2.5 py-2 border-b border-ink-line last:border-0">
                <span className="text-sm w-5">{["🥇", "🥈", "🥉"][i] ?? "•"}</span>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-ink flex-shrink-0"
                  style={{ background: b.colorHex ?? "#C79A54" }}
                >
                  {initials(b.name)}
                </div>
                <span className="flex-1 text-sm font-medium">{b.name}</span>
                <span className="text-sm font-semibold text-brass">R$ {fmt(b.total)}</span>
              </div>
            ))}
          </SectionCard>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  accent,
  value,
  label,
  sub,
}: {
  icon: any;
  accent: string;
  value: string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="relative bg-ink-soft border border-ink-line rounded-2xl p-4 overflow-hidden">
      <svg className="absolute bottom-0 left-0 w-full h-10 opacity-25" viewBox="0 0 200 40" preserveAspectRatio="none">
        <path d="M0 32 Q 40 8, 80 24 T 200 16 V40 H0 Z" fill={accent} />
      </svg>
      <div className="relative z-10">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ background: `${accent}22` }}>
          <Icon size={16} color={accent} />
        </div>
        <div className="font-display text-lg font-semibold" style={{ color: accent }}>{value}</div>
        <div className="text-[11px] text-muted mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-muted">{sub}</div>}
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-ink-soft border border-ink-line rounded-2xl p-4 mb-3">
      <div className="w-9 h-9 rounded-lg bg-brass/15 flex items-center justify-center flex-shrink-0">
        <Icon size={16} color="#C79A54" />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-lg font-semibold text-brass">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
