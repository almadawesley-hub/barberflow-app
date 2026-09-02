"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type LogEntry = {
  id: string;
  action: string;
  createdAt: string;
  user: { name: string; role: string } | null;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  RECEPTIONIST: "Recepcionista",
  BARBER: "Barbeiro",
};

export default function HistoricoPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/audit-logs");
      if (!res.ok) throw new Error(`/api/audit-logs respondeu ${res.status}`);
      const json = await res.json();
      setLogs(json.data ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro desconhecido ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped: Record<string, LogEntry[]> = {};
  for (const log of logs) {
    const day = new Date(log.createdAt).toLocaleDateString("pt-BR");
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(log);
  }
  const days = Object.keys(grouped);
  const today = new Date().toLocaleDateString("pt-BR");

  return (
    <div className="px-4 pt-2">
      <button onClick={() => router.back()} className="text-muted text-sm mb-3">‹ Voltar</button>
      <div className="font-display text-lg font-semibold mb-1">Histórico geral</div>
      <div className="text-xs text-muted mb-4">Registro de ações importantes no sistema</div>

      {loading && <div className="text-center text-muted text-sm py-10">Carregando...</div>}
      {loadError && (
        <div className="text-center text-red-400 text-xs py-4 border border-red-500/40 rounded-lg mb-3">
          Erro ao carregar: {loadError}
        </div>
      )}
      {!loading && logs.length === 0 && <div className="text-center text-muted text-sm py-10">Nenhuma ação registrada ainda.</div>}

      {days.map((day) => (
        <div key={day} className="mb-4">
          <div className="text-xs font-bold text-muted mb-2">{day === today ? "Hoje" : day}</div>
          <div className="space-y-1.5">
            {grouped[day].map((log) => (
              <div key={log.id} className="flex gap-2.5 bg-ink-soft border border-ink-line rounded-lg p-3">
                <div className="text-xs text-muted font-semibold w-11 flex-shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="flex-1">
                  <div className="text-sm">{log.action}</div>
                  {log.user && (
                    <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-ink text-muted">
                      {log.user.name} · {ROLE_LABEL[log.user.role] ?? log.user.role}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
