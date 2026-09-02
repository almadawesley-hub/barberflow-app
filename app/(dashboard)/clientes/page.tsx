"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Customer = {
  id: string;
  name: string;
  phone: string;
  tag: string;
  loyaltyPoints: number;
};

const TAG_LABEL: Record<string, { label: string; color: string }> = {
  novo: { label: "Novo", color: "#5C6874" },
  recorrente: { label: "Recorrente", color: "#C79A54" },
  vip: { label: "VIP", color: "#6E7E58" },
  inativo: { label: "Inativo", color: "#9B4131" },
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    const res = await fetch(`/api/customers${q ? `?search=${encodeURIComponent(q)}` : ""}`);
    const json = await res.json();
    setCustomers(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <div className="px-4 pt-2">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome ou telefone"
        className="w-full bg-ink-soft border border-ink-line rounded-lg px-3 py-2.5 mb-3 text-ivory text-sm"
      />

      <button
        onClick={() => setShowNew(true)}
        className="w-full py-2.5 rounded-lg border border-dashed border-brass/60 text-brass text-sm font-semibold mb-3"
      >
        + Novo cliente
      </button>

      {loading && <div className="text-center text-muted text-sm py-10">Carregando...</div>}
      {!loading && customers.length === 0 && (
        <div className="text-center text-muted text-sm py-10">Nenhum cliente encontrado.</div>
      )}

      <div className="space-y-2">
        {customers.map((c) => {
          const tag = TAG_LABEL[c.tag] ?? TAG_LABEL.novo;
          return (
            <Link
              key={c.id}
              href={`/clientes/${c.id}`}
              className="flex items-center gap-3 bg-ink-soft border border-ink-line rounded-xl p-3"
            >
              <div className="w-9 h-9 rounded-full bg-ink flex items-center justify-center text-xs font-bold text-brass flex-shrink-0">
                {initials(c.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{c.name}</div>
                <div className="text-xs text-muted">{c.phone}</div>
              </div>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0"
                style={{ borderColor: tag.color, color: tag.color }}
              >
                {tag.label}
              </span>
            </Link>
          );
        })}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/55 flex items-end z-50" onClick={() => setShowNew(false)}>
          <div
            className="bg-ink-soft w-full rounded-t-2xl p-4 pb-8 border-t border-ink-line"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-sm">Novo cliente</span>
              <button onClick={() => setShowNew(false)} className="text-muted">✕</button>
            </div>
            <NewCustomerForm
              onCreated={() => {
                setShowNew(false);
                load(search);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function NewCustomerForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const field = "w-full bg-ink border border-ink-line rounded-lg px-3 py-2.5 mb-3 text-ivory text-sm";
  const label = "text-xs font-semibold text-muted block mb-1.5";

  async function submit() {
    setSubmitting(true);
    await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, notes: notes || undefined }),
    });
    setSubmitting(false);
    onCreated();
  }

  return (
    <div>
      <label className={label}>Nome</label>
      <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />

      <label className={label}>Telefone</label>
      <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 90000-0000" />

      <label className={label}>Observações (opcional)</label>
      <input className={field} value={notes} onChange={(e) => setNotes(e.target.value)} />

      <button
        onClick={submit}
        disabled={submitting || !name.trim() || !phone.trim()}
        className="w-full bg-brass text-ink font-bold rounded-lg py-3 text-sm disabled:opacity-60 mt-1"
      >
        {submitting ? "Salvando..." : "Salvar cliente"}
      </button>
    </div>
  );
}
