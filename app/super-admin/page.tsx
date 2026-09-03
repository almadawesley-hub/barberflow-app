"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut } from "next-auth/react";

type Company = { id: string; name: string; created_at: string; user_count: number };

export default function SuperAdminPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/platform/companies");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error?.message ?? `Erro ${res.status}`);
      }
      const json = await res.json();
      setCompanies(json.data ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-ink text-ivory font-sans">
      <header className="flex items-center justify-between px-5 py-4 border-b border-ink-line">
        <div>
          <div className="font-display text-lg font-semibold">BarberFlow</div>
          <div className="text-xs text-muted">Painel da plataforma</div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/super-admin/login" })} className="text-xs font-semibold border border-ink-line rounded-lg px-3 py-2">
          Sair
        </button>
      </header>

      <div className="px-5 pt-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-lg font-semibold">Empresas ({companies.length})</h1>
          <button onClick={() => setShowNew(true)} className="bg-brass text-ink text-xs font-bold rounded-lg px-4 py-2.5">
            + Nova empresa
          </button>
        </div>

        {loading && <div className="text-center text-muted text-sm py-10">Carregando...</div>}
        {loadError && (
          <div className="text-center text-red-400 text-xs py-4 border border-red-500/40 rounded-lg mb-3">
            Erro ao carregar: {loadError}
          </div>
        )}

        <div className="space-y-2">
          {companies.map((c) => (
            <div key={c.id} className="bg-ink-soft border border-ink-line rounded-xl p-4 flex justify-between items-center">
              <div>
                <div className="font-semibold text-sm">{c.name}</div>
                <div className="text-xs text-muted mt-0.5">
                  {c.user_count} usuário{c.user_count === 1 ? "" : "s"} · criada em {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/55 flex items-end sm:items-center sm:justify-center z-50" onClick={() => setShowNew(false)}>
          <div
            className="bg-ink-soft w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5 pb-8 sm:pb-5 border border-ink-line"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-sm">Nova empresa</span>
              <button onClick={() => setShowNew(false)} className="text-muted">✕</button>
            </div>
            <NewCompanyForm
              onCreated={() => {
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

function NewCompanyForm({ onCreated }: { onCreated: () => void }) {
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ email: string; password: string } | null>(null);

  const field = "w-full bg-ink border border-ink-line rounded-lg px-3 py-2.5 mb-3 text-ivory text-sm";
  const label = "text-xs font-semibold text-muted block mb-1.5";

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/platform/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, adminName, adminEmail, adminPassword }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error?.message ?? "Não foi possível criar a empresa.");
      return;
    }
    setDone({ email: adminEmail, password: adminPassword });
  }

  if (done) {
    return (
      <div>
        <div className="text-sm text-sage mb-3">Empresa criada! Anota as credenciais do administrador:</div>
        <div className="bg-ink rounded-lg p-3 text-xs mb-4 space-y-1">
          <div><span className="text-muted">E-mail:</span> {done.email}</div>
          <div><span className="text-muted">Senha:</span> {done.password}</div>
        </div>
        <button onClick={onCreated} className="w-full bg-brass text-ink font-bold rounded-lg py-3 text-sm">
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className={label}>Nome da barbearia</label>
      <input className={field} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />

      <label className={label}>Nome do administrador</label>
      <input className={field} value={adminName} onChange={(e) => setAdminName(e.target.value)} />

      <label className={label}>E-mail do administrador</label>
      <input type="email" className={field} value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />

      <label className={label}>Senha inicial</label>
      <input type="password" className={field} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />

      {error && <div className="text-xs text-red-400 mb-3">{error}</div>}

      <button
        onClick={submit}
        disabled={submitting || !companyName.trim() || !adminName.trim() || !adminEmail.trim() || adminPassword.length < 6}
        className="w-full bg-brass text-ink font-bold rounded-lg py-3 text-sm disabled:opacity-60"
      >
        {submitting ? "Criando..." : "Criar empresa"}
      </button>
    </div>
  );
}
