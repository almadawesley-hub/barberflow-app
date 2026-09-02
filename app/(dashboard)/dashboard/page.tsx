"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

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
    <div className="px-4 pt-2">
      <h1 className="font-display text-lg font-semibold mb-4">Olá, {session?.user?.name}</h1>

      {loading && <div className="text-center text-muted text-sm py-10">Carregando...</div>}
      {loadError && (
        <div className="text-center text-red-400 text-xs py-4 border border-red-500/40 rounded-lg mb-3">
          Erro ao carregar: {loadError}
        </div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <MetricCard label="Faturamento (mês)" value={`R$ ${fmt(summary.totalMes)}`} accent="text-brass" />
            <MetricCard label="Ticket médio" value={`R$ ${fmt(Math.round(summary.ticketMedio))}`} accent="text-sage" />
            <MetricCard label="Atendimentos hoje" value={String(summary.atendConcluidos)} sub={`${summary.atendAgendados} agendados`} />
            <MetricCard label="Estoque baixo" value={String(summary.estoqueBaixo)} sub={`${summary.esgotados} esgotados`} accent="text-red-400" />
          </div>

          <div className="bg-ink-soft border border-ink-line rounded-2xl p-4 mb-3">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs font-bold text-muted">Meta mensal</span>
              <span className="text-xs text-muted">R$ {fmt(summary.totalMes)} / R$ {fmt(summary.metaMensal)}</span>
            </div>
            <div className="h-2 rounded bg-ink overflow-hidden">
              <div
                className="h-full bg-brass rounded"
                style={{ width: `${Math.min(100, Math.round((summary.totalMes / summary.metaMensal) * 100))}%` }}
              />
            </div>
          </div>

          <div className="bg-ink-soft border border-ink-line rounded-2xl p-4 mb-3">
            <div className="text-xs font-bold text-muted mb-2.5">Clientes</div>
            <div className="flex gap-5">
              <MiniStat label="Novos" value={summary.novos} />
              <MiniStat label="VIP" value={summary.vip} />
              <MiniStat label="Inativos" value={summary.inativos} />
            </div>
          </div>

          <div className="bg-ink-soft border border-ink-line rounded-2xl p-4">
            <div className="text-xs font-bold text-muted mb-2.5">Ranking de hoje</div>
            {summary.ranking.length === 0 && <div className="text-xs text-muted">Nenhuma venda hoje ainda.</div>}
            {summary.ranking.map((b, i) => (
              <div key={b.id} className="flex items-center gap-2.5 py-1.5 border-b border-ink-line last:border-0">
                <span className="text-sm w-4">{["🥇", "🥈", "🥉"][i] ?? "•"}</span>
                <div className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-[11px] font-bold text-ink" style={{ background: b.colorHex ?? "#C79A54" }}>
                  {initials(b.name)}
                </div>
                <span className="flex-1 text-sm">{b.name}</span>
                <span className="text-sm font-semibold text-brass">R$ {fmt(b.total)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-ink-soft border border-ink-line rounded-2xl p-3.5">
      <div className={`font-display text-lg font-semibold ${accent ?? ""}`}>{value}</div>
      <div className="text-[11px] text-muted mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-muted">{sub}</div>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
