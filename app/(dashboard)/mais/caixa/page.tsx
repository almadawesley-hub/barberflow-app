"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Transaction = {
  id: string;
  type: "REVENUE" | "EXPENSE";
  description: string;
  amount: number | string;
  category: string | null;
  date: string;
};

type Summary = { receita: number; despesas: number; lucro: number };

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function CaixaPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [tRes, sRes] = await Promise.all([
        fetch("/api/financial-transactions"),
        fetch("/api/financial-transactions/summary"),
      ]);
      if (!tRes.ok) throw new Error(`/api/financial-transactions respondeu ${tRes.status}`);
      if (!sRes.ok) throw new Error(`/api/financial-transactions/summary respondeu ${sRes.status}`);
      const tJson = await tRes.json();
      const sJson = await sRes.json();
      setTransactions(tJson.data ?? []);
      setSummary(sJson.data ?? null);
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
      <button onClick={() => router.back()} className="text-muted text-sm mb-3">‹ Voltar</button>
      <div className="font-display text-lg font-semibold mb-4">Caixa & Financeiro</div>

      {loading && <div className="text-center text-muted text-sm py-10">Carregando...</div>}
      {loadError && (
        <div className="text-center text-red-400 text-xs py-4 border border-red-500/40 rounded-lg mb-3">
          Erro ao carregar: {loadError}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-ink-soft border border-ink-line rounded-lg p-2.5">
            <div className="text-[10px] text-muted">Receita</div>
            <div className="text-sm font-bold text-sage">R$ {fmt(summary.receita)}</div>
          </div>
          <div className="bg-ink-soft border border-ink-line rounded-lg p-2.5">
            <div className="text-[10px] text-muted">Despesas</div>
            <div className="text-sm font-bold text-red-400">R$ {fmt(summary.despesas)}</div>
          </div>
          <div className="bg-ink-soft border border-ink-line rounded-lg p-2.5">
            <div className="text-[10px] text-muted">Lucro</div>
            <div className="text-sm font-bold text-brass">R$ {fmt(summary.lucro)}</div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {transactions.map((t) => (
          <div key={t.id} className="flex justify-between items-center bg-ink-soft border border-ink-line rounded-xl p-3">
            <div>
              <div className="text-sm">{t.description}</div>
              <div className="text-xs text-muted">{new Date(t.date).toLocaleDateString("pt-BR")}</div>
            </div>
            <div className={`text-sm font-bold ${t.type === "REVENUE" ? "text-sage" : "text-red-400"}`}>
              {t.type === "REVENUE" ? "+" : "−"} R$ {fmt(Number(t.amount))}
            </div>
          </div>
        ))}
        {!loading && transactions.length === 0 && (
          <div className="text-center text-muted text-sm py-6">Nenhum lançamento ainda.</div>
        )}
      </div>

      <button
        onClick={() => setShowNew(true)}
        className="w-full mt-3 py-2.5 rounded-lg border border-dashed border-brass/60 text-brass text-sm font-semibold"
      >
        + Nova despesa
      </button>

      {showNew && (
        <div className="fixed inset-0 bg-black/55 flex items-end z-50" onClick={() => setShowNew(false)}>
          <div className="bg-ink-soft w-full rounded-t-2xl p-4 pb-8 border-t border-ink-line" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-sm">Nova despesa</span>
              <button onClick={() => setShowNew(false)} className="text-muted">✕</button>
            </div>
            <NewExpenseForm
              onSaved={() => {
                setShowNew(false);
                load();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function NewExpenseForm({ onSaved }: { onSaved: () => void }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const field = "w-full bg-ink border border-ink-line rounded-lg px-3 py-2.5 mb-3 text-ivory text-sm";
  const label = "text-xs font-semibold text-muted block mb-1.5";

  async function submit() {
    setSubmitting(true);
    await fetch("/api/financial-transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, amount: Number(amount), category: category || undefined }),
    });
    setSubmitting(false);
    onSaved();
  }

  return (
    <div>
      <label className={label}>Descrição</label>
      <input className={field} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Conta de água" />

      <label className={label}>Valor (R$)</label>
      <input type="number" className={field} value={amount} onChange={(e) => setAmount(e.target.value)} />

      <label className={label}>Categoria (opcional)</label>
      <input className={field} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Aluguel" />

      <button
        onClick={submit}
        disabled={submitting || !description.trim() || !amount}
        className="w-full bg-brass text-ink font-bold rounded-lg py-3 text-sm disabled:opacity-60 mt-1"
      >
        {submitting ? "Salvando..." : "Lançar despesa"}
      </button>
    </div>
  );
}
