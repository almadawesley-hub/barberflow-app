"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Appointment = {
  id: string;
  scheduledAt: string;
  status: string;
  customer: { id: string; name: string };
  service: { id: string; name: string; price: number; durationMinutes: number };
  barber: { id: string; name: string; colorHex: string | null };
};

type Customer = { id: string; name: string };
type Service = { id: string; name: string; price: number; durationMinutes: number };
type Barber = { id: string; name: string };

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  WAITING: "Aguardando",
  IN_PROGRESS: "Em atendimento",
  DONE: "Concluído",
  CANCELED: "Cancelado",
  NO_SHOW: "Faltou",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function dayBounds(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end, label: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }) };
}

export default function AgendaPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const router = useRouter();

  const [dayOffset, setDayOffset] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFor, setActionFor] = useState<Appointment | null>(null);
  const [showNew, setShowNew] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);

  const { start, end, label } = dayBounds(dayOffset);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/appointments?date_from=${start.toISOString()}&date_to=${end.toISOString()}`);
    const json = await res.json();
    setAppointments(json.data ?? []);
    setLoading(false);
  }, [dayOffset]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!showNew) return;
    fetch("/api/customers").then((r) => r.json()).then((j) => setCustomers(j.data ?? []));
    fetch("/api/services").then((r) => r.json()).then((j) => setServices(j.data ?? []));
    fetch("/api/barbers").then((r) => r.json()).then((j) => setBarbers(j.data ?? []));
  }, [showNew]);

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setActionFor(null);
    load();
  }

  async function startAppointment(id: string) {
    await fetch(`/api/appointments/${id}/start`, { method: "POST" });
    setActionFor(null);
    load();
  }

  async function removeAppointment(id: string) {
    await fetch(`/api/appointments/${id}`, { method: "DELETE" });
    setActionFor(null);
    load();
  }

  const sorted = [...appointments].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  return (
    <div className="px-4 pt-2">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setDayOffset((d) => d - 1)} className="text-muted px-2">‹</button>
        <span className="text-sm font-medium">{label.charAt(0).toUpperCase() + label.slice(1)}</span>
        <button onClick={() => setDayOffset((d) => d + 1)} className="text-muted px-2">›</button>
      </div>

      {loading && <div className="text-center text-muted text-sm py-10">Carregando...</div>}
      {!loading && sorted.length === 0 && (
        <div className="text-center text-muted text-sm py-10">Nenhum agendamento para este dia.</div>
      )}

      <div className="space-y-3">
        {sorted.map((a) => (
          <div key={a.id} className="flex gap-3">
            <div className="w-11 pt-3 text-xs text-muted font-semibold text-right">
              {new Date(a.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="flex-1 bg-ink-soft border border-ink-line rounded-2xl p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-sm">{a.customer.name}</div>
                  <div className="text-xs text-muted mt-0.5">{a.service.name} · {a.barber.name}</div>
                </div>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-ink flex-shrink-0"
                  style={{ background: a.barber.colorHex ?? "#C79A54" }}
                >
                  {initials(a.barber.name)}
                </div>
              </div>
              <button
                onClick={() => setActionFor(a)}
                className="mt-2 text-xs font-semibold px-2.5 py-1 rounded-full border border-brass text-brass"
              >
                {STATUS_LABEL[a.status] ?? a.status}
              </button>
            </div>
          </div>
        ))}
      </div>

      {role !== "BARBER" || true ? (
        <button
          onClick={() => setShowNew(true)}
          className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-brass text-ink text-2xl font-bold shadow-lg"
        >
          +
        </button>
      ) : null}

      {actionFor && (
        <ActionSheet title="Agendamento" onClose={() => setActionFor(null)}>
          <ApptActions
            appt={actionFor}
            role={role}
            onStatus={(s) => updateStatus(actionFor.id, s)}
            onStart={() => startAppointment(actionFor.id)}
            onDelete={() => removeAppointment(actionFor.id)}
            onGoToPdv={() => router.push("/pdv")}
          />
        </ActionSheet>
      )}

      {showNew && (
        <ActionSheet title="Novo agendamento" onClose={() => setShowNew(false)}>
          <NewAppointmentForm
            customers={customers}
            services={services}
            barbers={barbers}
            onCreated={() => {
              setShowNew(false);
              load();
            }}
          />
        </ActionSheet>
      )}
    </div>
  );
}

function ActionSheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/55 flex items-end z-50" onClick={onClose}>
      <div
        className="bg-ink-soft w-full rounded-t-2xl p-4 pb-8 border-t border-ink-line max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-sm">{title}</span>
          <button onClick={onClose} className="text-muted">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ApptActions({
  appt,
  role,
  onStatus,
  onStart,
  onDelete,
  onGoToPdv,
}: {
  appt: Appointment;
  role?: string;
  onStatus: (s: string) => void;
  onStart: () => void;
  onDelete: () => void;
  onGoToPdv: () => void;
}) {
  const s = appt.status;
  const rows: { label: string; onClick: () => void }[] = [];

  if (s === "SCHEDULED" || s === "CONFIRMED") rows.push({ label: "Fazer check-in", onClick: () => onStatus("WAITING") });
  if (s === "WAITING") rows.push({ label: "Iniciar atendimento", onClick: onStart });
  if (s === "IN_PROGRESS" && role !== "BARBER")
    rows.push({ label: "Ir para Vendas / Fechar conta", onClick: onGoToPdv });
  if (["SCHEDULED", "CONFIRMED", "WAITING"].includes(s)) {
    rows.push({ label: "Cliente faltou", onClick: () => onStatus("NO_SHOW") });
    rows.push({ label: "Cancelar agendamento", onClick: () => onStatus("CANCELED") });
  }

  return (
    <div>
      {rows.map((r) => (
        <button
          key={r.label}
          onClick={r.onClick}
          className="w-full text-left py-3 text-sm border-b border-ink-line text-ivory"
        >
          {r.label}
        </button>
      ))}
      {s !== "DONE" && (
        <button onClick={onDelete} className="w-full text-left py-3 text-sm text-red-400 mt-1">
          Excluir agendamento
        </button>
      )}
    </div>
  );
}

function NewAppointmentForm({
  customers,
  services,
  barbers,
  onCreated,
}: {
  customers: Customer[];
  services: Service[];
  barbers: Barber[];
  onCreated: () => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customers[0]) setCustomerId(customers[0].id);
    if (services[0]) setServiceId(services[0].id);
    if (barbers[0]) setBarberId(barbers[0].id);
  }, [customers, services, barbers]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, serviceId, barberId, scheduledAt }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error?.message ?? "Não foi possível criar o agendamento.");
      return;
    }
    onCreated();
  }

  const field = "w-full bg-ink border border-ink-line rounded-lg px-3 py-2.5 mb-3 text-ivory text-sm";
  const label = "text-xs font-semibold text-muted block mb-1.5";

  return (
    <div>
      <label className={label}>Cliente</label>
      <select className={field} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
        {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <label className={label}>Serviço</label>
      <select className={field} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
        {services.map((s) => <option key={s.id} value={s.id}>{s.name} — R$ {s.price}</option>)}
      </select>

      <label className={label}>Barbeiro</label>
      <select className={field} value={barberId} onChange={(e) => setBarberId(e.target.value)}>
        {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className={label}>Data</label>
          <input type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className={label}>Horário</label>
          <input type="time" className={field} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>

      {error && <div className="text-xs text-red-400 mb-3">{error}</div>}

      <button
        onClick={submit}
        disabled={submitting || !customerId || !serviceId || !barberId}
        className="w-full bg-brass text-ink font-bold rounded-lg py-3 text-sm disabled:opacity-60 mt-2"
      >
        {submitting ? "Salvando..." : "Confirmar agendamento"}
      </button>
    </div>
  );
}
