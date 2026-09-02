"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

type SaleItem = { id: string; quantity: number; unitPrice: string | number; service?: { name: string } | null; product?: { name: string } | null };
type Sale = { id: string; total: string | number; createdAt: string; barber?: { name: string } | null; items: SaleItem[] };
type Customer = {
  id: string;
  name: string;
  phone: string;
  tag: string;
  loyaltyPoints: number;
  sales: Sale[];
};

type LoyaltyConfig = { pointsPerReal: number; threshold: number; rewardLabel: string };

const TAG_LABEL: Record<string, { label: string; color: string }> = {
  novo: { label: "Novo", color: "#5C6874" },
  recorrente: { label: "Recorrente", color: "#C79A54" },
  vip: { label: "VIP", color: "#6E7E58" },
  inativo: { label: "Inativo", color: "#9B4131" },
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, lRes] = await Promise.all([fetch(`/api/customers/${id}`), fetch("/api/loyalty/config")]);
    const cJson = await cRes.json();
    const lJson = await lRes.json();
    setCustomer(cJson.data);
    setConfig(lJson.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function redeem() {
    setRedeeming(true);
    await fetch(`/api/customers/${id}/redeem`, { method: "POST" });
    setRedeeming(false);
    load();
  }

  if (loading || !customer) {
    return <div className="px-4 pt-6 text-center text-muted text-sm">Carregando...</div>;
  }

  const tag = TAG_LABEL[customer.tag] ?? TAG_LABEL.novo;
  const totalSpent = customer.sales.reduce((sum, s) => sum + Number(s.total), 0);
  const points = customer.loyaltyPoints;
  const canRedeem = config ? points >= config.threshold : false;
  const progress = config ? Math.min(100, Math.round((points / config.threshold) * 100)) : 0;

  return (
    <div className="px-4 pt-2">
      <button onClick={() => router.back()} className="text-muted text-sm mb-4">‹ Voltar</button>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 rounded-full bg-ink-soft flex items-center justify-center text-lg font-bold text-brass">
          {initials(customer.name)}
        </div>
        <div>
          <div className="font-display text-lg font-semibold">{customer.name}</div>
          <div className="text-xs text-muted">{customer.phone}</div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border" style={{ borderColor: tag.color, color: tag.color }}>
          {tag.label}
        </span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-ink-soft text-muted">
          Total gasto: R$ {fmt(totalSpent)}
        </span>
      </div>

      {config && (
        <div className="bg-ink-soft border border-ink-line rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs font-bold text-muted">Fidelidade</span>
            <span className="text-xs text-muted">{points} / {config.threshold} pontos</span>
          </div>
          <div className="h-2 rounded bg-ink overflow-hidden">
            <div className="h-full bg-brass rounded" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-muted mt-1.5">
            {canRedeem ? `Já pode resgatar: ${config.rewardLabel}` : `Faltam ${config.threshold - points} pontos para "${config.rewardLabel}"`}
          </div>
          {canRedeem && (
            <button
              onClick={redeem}
              disabled={redeeming}
              className="w-full mt-3 py-2.5 rounded-lg bg-brass text-ink font-bold text-sm disabled:opacity-60"
            >
              {redeeming ? "Resgatando..." : `Resgatar ${config.rewardLabel}`}
            </button>
          )}
        </div>
      )}

      <div className="text-xs font-bold text-muted mb-2">Histórico de atendimentos</div>
      {customer.sales.length === 0 && <div className="text-center text-muted text-sm py-6">Ainda sem atendimentos.</div>}
      <div className="space-y-2">
        {customer.sales.map((s) => {
          const names = s.items.map((i) => i.service?.name ?? i.product?.name).filter(Boolean).join(", ");
          return (
            <div key={s.id} className="flex justify-between items-center bg-ink-soft border border-ink-line rounded-xl p-3">
              <div>
                <div className="text-sm">{names}</div>
                <div className="text-xs text-muted">
                  {new Date(s.createdAt).toLocaleDateString("pt-BR")} · {s.barber?.name ?? "—"}
                </div>
              </div>
              <div className="text-sm font-semibold text-brass">R$ {fmt(Number(s.total))}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
