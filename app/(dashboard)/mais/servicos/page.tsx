"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Service = {
  id: string;
  name: string;
  price: number | string;
  durationMinutes: number;
};

export default function ServicosPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/services");
    const json = await res.json();
    setServices(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    await fetch(`/api/services/${id}`, { method: "DELETE" });
    setEditing(null);
    load();
  }

  return (
    <div className="px-4 pt-2">
      <button onClick={() => router.back()} className="text-muted text-sm mb-3">‹ Voltar</button>
      <div className="font-display text-lg font-semibold mb-4">Serviços</div>

      {loading && <div className="text-center text-muted text-sm py-10">Carregando...</div>}

      <div className="space-y-2">
        {services.map((s) => (
          <div key={s.id} className="bg-ink-soft border border-ink-line rounded-xl p-3.5">
            <div className="flex justify-between items-baseline">
              <span className="font-semibold text-sm">{s.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-display text-brass font-semibold">R$ {Number(s.price)}</span>
                <button onClick={() => setEditing(s)} className="text-muted px-1">✎</button>
              </div>
            </div>
            <div className="text-xs text-muted mt-1">{s.durationMinutes} min</div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowNew(true)}
        className="w-full mt-3 py-2.5 rounded-lg border border-dashed border-brass/60 text-brass text-sm font-semibold"
      >
        + Novo serviço
      </button>

      {showNew && (
        <Sheet title="Novo serviço" onClose={() => setShowNew(false)}>
          <ServiceForm
            onSaved={() => {
              setShowNew(false);
              load();
            }}
          />
        </Sheet>
      )}

      {editing && (
        <Sheet title="Editar serviço" onClose={() => setEditing(null)}>
          <ServiceForm
            service={editing}
            onSaved={() => {
              setEditing(null);
              load();
            }}
            onDelete={() => remove(editing.id)}
          />
        </Sheet>
      )}
    </div>
  );
}

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/55 flex items-end z-50" onClick={onClose}>
      <div className="bg-ink-soft w-full rounded-t-2xl p-4 pb-8 border-t border-ink-line max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-sm">{title}</span>
          <button onClick={onClose} className="text-muted">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ServiceForm({ service, onSaved, onDelete }: { service?: Service; onSaved: () => void; onDelete?: () => void }) {
  const [name, setName] = useState(service?.name ?? "");
  const [price, setPrice] = useState(service ? String(service.price) : "");
  const [duration, setDuration] = useState(service ? String(service.durationMinutes) : "");
  const [submitting, setSubmitting] = useState(false);

  const field = "w-full bg-ink border border-ink-line rounded-lg px-3 py-2.5 mb-3 text-ivory text-sm";
  const label = "text-xs font-semibold text-muted block mb-1.5";

  async function submit() {
    setSubmitting(true);
    const body = { name, price: Number(price), durationMinutes: Number(duration) };
    if (service) {
      await fetch(`/api/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setSubmitting(false);
    onSaved();
  }

  return (
    <div>
      <label className={label}>Nome do serviço</label>
      <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Corte degradê" />

      <label className={label}>Preço (R$)</label>
      <input type="number" className={field} value={price} onChange={(e) => setPrice(e.target.value)} />

      <label className={label}>Duração (minutos)</label>
      <input type="number" className={field} value={duration} onChange={(e) => setDuration(e.target.value)} />

      <button
        onClick={submit}
        disabled={submitting || !name.trim() || !price || !duration}
        className="w-full bg-brass text-ink font-bold rounded-lg py-3 text-sm disabled:opacity-60 mt-1"
      >
        {submitting ? "Salvando..." : service ? "Salvar alterações" : "Salvar serviço"}
      </button>

      {onDelete && (
        <button onClick={onDelete} className="w-full text-red-400 text-sm mt-3 py-2">
          Excluir serviço
        </button>
      )}
    </div>
  );
}
