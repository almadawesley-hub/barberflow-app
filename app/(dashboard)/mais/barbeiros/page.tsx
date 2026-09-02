"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type BarberProduction = {
  id: string;
  name: string;
  colorHex: string | null;
  commissionPercent: number | string | null;
  production: number;
  commission: number;
};

type CommissionEntry = {
  id: string;
  date: string;
  production: number | string;
  commission: number | string;
  barber: { name: string; colorHex: string | null };
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function BarbeirosPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const isAdmin = role === "ADMIN";
  const isBarbeiro = role === "BARBER";
  const router = useRouter();

  const [today, setToday] = useState<BarberProduction[]>([]);
  const [history, setHistory] = useState<CommissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [tRes, hRes] = await Promise.all([fetch("/api/commissions/today"), fetch("/api/commissions/history")]);
    const tJson = await tRes.json();
    const hJson = await hRes.json();
    setToday(tJson.data ?? []);
    setHistory(hJson.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function closeDay() {
    setClosing(true);
    await fetch("/api/commissions/close-day", { method: "POST" });
    setClosing(false);
    load();
  }

  return (
    <div className="px-4 pt-2">
      <button onClick={() => router.back()} className="text-muted text-sm mb-3">‹ Voltar</button>
      <div className="font-display text-lg font-semibold mb-4">
        {isBarbeiro ? "Minhas comissões" : "Barbeiros & Comissões"}
      </div>

      <div className="text-xs font-bold text-muted mb-2">Hoje (ainda não fechado)</div>
      {loading && <div className="text-center text-muted text-sm py-6">Carregando...</div>}
      {!loading && today.length === 0 && <div className="text-center text-muted text-sm py-6">Nenhuma comissão registrada hoje.</div>}
      <div className="space-y-2">
        {today.map((b) => (
          <div key={b.id} className="bg-ink-soft border border-ink-line rounded-xl p-3.5">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-ink" style={{ background: b.colorHex ?? "#C79A54" }}>
                {initials(b.name)}
              </div>
              <span className="font-semibold text-sm">{b.name}</span>
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span>Produção: <b className="text-ivory">R$ {fmt(b.production)}</b></span>
              <span>Comissão ({b.commissionPercent}%): <b className="text-brass">R$ {fmt(b.commission)}</b></span>
            </div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <button
          onClick={closeDay}
          disabled={closing}
          className="w-full mt-3 mb-5 py-2.5 rounded-lg bg-ink-soft border border-brass/60 text-brass text-sm font-bold disabled:opacity-60"
        >
          {closing ? "Fechando..." : "Fechar o dia e arquivar comissões"}
        </button>
      )}

      <div className="text-xs font-bold text-muted mb-2 mt-4">Histórico de dias fechados</div>
      {history.length === 0 && <div className="text-center text-muted text-sm py-6">Nenhum dia fechado ainda.</div>}
      <div className="space-y-2">
        {history.map((h) => (
          <div key={h.id} className="flex justify-between items-center bg-ink-soft border border-ink-line rounded-xl p-3">
            <div>
              {!isBarbeiro && <div className="text-sm font-semibold">{h.barber.name}</div>}
              <div className="text-xs text-muted">
                {new Date(h.date).toLocaleDateString("pt-BR")} · produção R$ {fmt(Number(h.production))}
              </div>
            </div>
            <div className="text-sm font-bold text-brass">R$ {fmt(Number(h.commission))}</div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <button
          onClick={() => setShowNew(true)}
          className="w-full mt-4 py-2.5 rounded-lg border border-dashed border-brass/60 text-brass text-sm font-semibold"
        >
          + Novo barbeiro
        </button>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/55 flex items-end z-50" onClick={() => setShowNew(false)}>
          <div className="bg-ink-soft w-full rounded-t-2xl p-4 pb-8 border-t border-ink-line" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-sm">Novo barbeiro</span>
              <button onClick={() => setShowNew(false)} className="text-muted">✕</button>
            </div>
            <NewBarberForm
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

function NewBarberForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [commission, setCommission] = useState("40");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = "w-full bg-ink border border-ink-line rounded-lg px-3 py-2.5 mb-3 text-ivory text-sm";
  const label = "text-xs font-semibold text-muted block mb-1.5";

  async function submit() {
    setSubmitting(true);
    setError(null);
    const palette = ["#C79A54", "#6E7E58", "#9B4131", "#7A8FBF", "#B0784F", "#5C6874"];
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        role: "BARBER",
        commissionPercent: Number(commission),
        colorHex: palette[Math.floor(Math.random() * palette.length)],
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("Não foi possível cadastrar. Confira se o e-mail já está em uso.");
      return;
    }
    onSaved();
  }

  return (
    <div>
      <label className={label}>Nome do barbeiro</label>
      <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Renato" />

      <label className={label}>E-mail</label>
      <input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="renato@barbearia.com" />

      <label className={label}>Senha inicial</label>
      <input type="password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />

      <label className={label}>Comissão padrão (%)</label>
      <input type="number" className={field} value={commission} onChange={(e) => setCommission(e.target.value)} />

      {error && <div className="text-xs text-red-400 mb-3">{error}</div>}

      <button
        onClick={submit}
        disabled={submitting || !name.trim() || !email.trim() || password.length < 6}
        className="w-full bg-brass text-ink font-bold rounded-lg py-3 text-sm disabled:opacity-60 mt-1"
      >
        {submitting ? "Salvando..." : "Salvar barbeiro"}
      </button>
    </div>
  );
}
