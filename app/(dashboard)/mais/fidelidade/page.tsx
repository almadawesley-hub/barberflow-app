"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type LoyaltyConfig = { pointsPerReal: number; threshold: number; rewardLabel: string };
type Customer = { id: string; name: string; loyaltyPoints: number };

export default function FidelidadePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const isAdmin = role === "ADMIN";
  const router = useRouter();

  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, lRes] = await Promise.all([fetch("/api/customers"), fetch("/api/loyalty/config")]);
    const cJson = await cRes.json();
    const lJson = await lRes.json();
    setCustomers((cJson.data ?? []).sort((a: Customer, b: Customer) => b.loyaltyPoints - a.loyaltyPoints));
    setConfig(lJson.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function redeem(id: string) {
    setRedeemingId(id);
    await fetch(`/api/customers/${id}/redeem`, { method: "POST" });
    setRedeemingId(null);
    load();
  }

  if (loading || !config) {
    return <div className="px-4 pt-6 text-center text-muted text-sm">Carregando...</div>;
  }

  const eligible = customers.filter((c) => c.loyaltyPoints >= config.threshold).length;

  return (
    <div className="px-4 pt-2">
      <button onClick={() => router.back()} className="text-muted text-sm mb-3">‹ Voltar</button>
      <div className="font-display text-lg font-semibold mb-4">Fidelidade</div>

      <div className="bg-ink-soft border border-ink-line rounded-2xl p-4 mb-4">
        {!editing ? (
          <>
            <div className="flex justify-between items-baseline mb-2.5">
              <span className="text-xs font-bold text-muted">Regra atual</span>
              {isAdmin && (
                <button onClick={() => setEditing(true)} className="text-brass text-xs font-semibold">
                  Editar
                </button>
              )}
            </div>
            <div className="text-sm">R$ 1 gasto = {config.pointsPerReal} {Number(config.pointsPerReal) === 1 ? "ponto" : "pontos"}</div>
            <div className="text-sm mt-1">{config.threshold} pontos → <b className="text-brass">{config.rewardLabel}</b></div>
            <div className="text-xs text-muted mt-2.5">
              {eligible} {eligible === 1 ? "cliente já pode" : "clientes já podem"} resgatar a recompensa
            </div>
          </>
        ) : (
          <LoyaltyConfigForm
            config={config}
            onSaved={(c) => {
              setConfig(c);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        )}
      </div>

      <div className="text-xs font-bold text-muted mb-2">Clientes por pontos</div>
      {customers.length === 0 && <div className="text-center text-muted text-sm py-6">Nenhum cliente cadastrado ainda.</div>}
      <div className="space-y-2">
        {customers.map((c) => {
          const canRedeem = c.loyaltyPoints >= config.threshold;
          const progress = Math.min(100, Math.round((c.loyaltyPoints / config.threshold) * 100));
          return (
            <div key={c.id} className="bg-ink-soft border border-ink-line rounded-xl p-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-semibold">{c.name}</span>
                <span className="text-sm font-bold text-brass">{c.loyaltyPoints} pts</span>
              </div>
              <div className="h-1.5 rounded bg-ink overflow-hidden mb-2">
                <div className="h-full bg-brass rounded" style={{ width: `${progress}%` }} />
              </div>
              {canRedeem && (
                <button
                  onClick={() => redeem(c.id)}
                  disabled={redeemingId === c.id}
                  className="w-full py-1.5 rounded-lg bg-ink text-brass text-xs font-semibold disabled:opacity-60"
                >
                  {redeemingId === c.id ? "Resgatando..." : `Resgatar ${config.rewardLabel}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoyaltyConfigForm({
  config,
  onSaved,
  onCancel,
}: {
  config: LoyaltyConfig;
  onSaved: (c: LoyaltyConfig) => void;
  onCancel: () => void;
}) {
  const [pointsPerReal, setPointsPerReal] = useState(String(config.pointsPerReal));
  const [threshold, setThreshold] = useState(String(config.threshold));
  const [rewardLabel, setRewardLabel] = useState(config.rewardLabel);
  const [submitting, setSubmitting] = useState(false);

  const field = "w-full bg-ink border border-ink-line rounded-lg px-3 py-2.5 mb-3 text-ivory text-sm";
  const label = "text-xs font-semibold text-muted block mb-1.5";

  async function submit() {
    setSubmitting(true);
    const body = { pointsPerReal: Number(pointsPerReal), threshold: Number(threshold), rewardLabel };
    const res = await fetch("/api/loyalty/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    const json = await res.json();
    onSaved(json.data);
  }

  return (
    <div>
      <label className={label}>Pontos por R$ 1 gasto</label>
      <input type="number" className={field} value={pointsPerReal} onChange={(e) => setPointsPerReal(e.target.value)} />

      <label className={label}>Pontos para resgatar</label>
      <input type="number" className={field} value={threshold} onChange={(e) => setThreshold(e.target.value)} />

      <label className={label}>Recompensa</label>
      <input className={field} value={rewardLabel} onChange={(e) => setRewardLabel(e.target.value)} placeholder="Ex: Corte grátis" />

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg bg-ink text-muted text-sm font-semibold">
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          className="flex-1 py-2.5 rounded-lg bg-brass text-ink text-sm font-bold disabled:opacity-60"
        >
          {submitting ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
