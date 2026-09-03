"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut } from "next-auth/react";

type Company = {
  id: string;
  name: string;
  created_at: string;
  user_count: number;
  plan_id: string | null;
  plan_name: string | null;
  max_users: number | null;
  subscription_status: string | null;
};

type Plan = { id: string; name: string; price_monthly: string; max_users: number | null; max_branches: number | null };

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  trial: { label: "Teste", color: "#C4903D" },
  active: { label: "Ativa", color: "#6E7E58" },
  suspended: { label: "Suspensa", color: "#9B4131" },
};

export default function SuperAdminPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [cRes, pRes] = await Promise.all([fetch("/api/platform/companies"), fetch("/api/platform/plans")]);
      if (!cRes.ok) throw new Error(`Erro ${cRes.status} ao listar empresas`);
      if (!pRes.ok) throw new Error(`Erro ${pRes.status} ao listar planos`);
      const cJson = await cRes.json();
      const pJson = await pRes.json();
      setCompanies(cJson.data ?? []);
      setPlans(pJson.data ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    await fetch(`/api/platform/companies/${id}`, { method: "DELETE" });
    setEditing(null);
    load();
  }

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

      <div className="px-5 pt-5 max-w-2xl mx-auto pb-10">
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
          {companies.map((c) => {
            const status = STATUS_LABEL[c.subscription_status ?? ""] ?? { label: "Sem plano", color: "#5C6874" };
            return (
              <button
                key={c.id}
                onClick={() => setEditing(c)}
                className="w-full text-left bg-ink-soft border border-ink-line rounded-xl p-4 flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold text-sm">{c.name}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {c.user_count} usuário{c.user_count === 1 ? "" : "s"} · {c.plan_name ?? "sem plano"}
                    {c.max_users != null ? ` (máx. ${c.max_users})` : c.plan_name ? " (ilimitado)" : ""}
                  </div>
                </div>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0"
                  style={{ borderColor: status.color, color: status.color }}
                >
                  {status.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {showNew && (
        <Sheet title="Nova empresa" onClose={() => setShowNew(false)}>
          <NewCompanyForm
            onCreated={() => {
              setShowNew(false);
              load();
            }}
          />
        </Sheet>
      )}

      {editing && (
        <Sheet title="Editar empresa" onClose={() => setEditing(null)}>
          <EditCompanyForm
            company={editing}
            plans={plans}
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
    <div className="fixed inset-0 bg-black/55 flex items-end sm:items-center sm:justify-center z-50" onClick={onClose}>
      <div
        className="bg-ink-soft w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5 pb-8 sm:pb-5 border border-ink-line max-h-[85vh] overflow-y-auto"
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

function EditCompanyForm({
  company,
  plans,
  onSaved,
  onDelete,
}: {
  company: Company;
  plans: Plan[];
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(company.name);
  const [planId, setPlanId] = useState(company.plan_id ?? plans[0]?.id ?? "");
  const [status, setStatus] = useState(company.subscription_status ?? "trial");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const field = "w-full bg-ink border border-ink-line rounded-lg px-3 py-2.5 mb-3 text-ivory text-sm";
  const label = "text-xs font-semibold text-muted block mb-1.5";

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/platform/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, planId, status }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error?.message ?? "Não foi possível salvar.");
      return;
    }
    onSaved();
  }

  return (
    <div>
      <label className={label}>Nome da empresa</label>
      <input className={field} value={name} onChange={(e) => setName(e.target.value)} />

      <label className={label}>Plano (limita usuários)</label>
      <select className={field} value={planId} onChange={(e) => setPlanId(e.target.value)}>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} — R$ {p.price_monthly}/mês {p.max_users != null ? `(até ${p.max_users} usuários)` : "(ilimitado)"}
          </option>
        ))}
      </select>

      <label className={label}>Status da assinatura</label>
      <select className={field} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="trial">Teste</option>
        <option value="active">Ativa</option>
        <option value="suspended">Suspensa (bloqueia o login dessa empresa)</option>
      </select>

      {error && <div className="text-xs text-red-400 mb-3">{error}</div>}

      <button
        onClick={submit}
        disabled={submitting || !name.trim() || !planId}
        className="w-full bg-brass text-ink font-bold rounded-lg py-3 text-sm disabled:opacity-60"
      >
        {submitting ? "Salvando..." : "Salvar alterações"}
      </button>

      {!confirmingDelete ? (
        <button onClick={() => setConfirmingDelete(true)} className="w-full text-red-400 text-sm mt-4 py-2">
          Excluir empresa
        </button>
      ) : (
        <div className="mt-4 text-center">
          <div className="text-xs text-muted mb-2">
            Isso apaga <b>tudo</b> dessa empresa (clientes, vendas, histórico) permanentemente. Tem certeza?
          </div>
          <div className="flex gap-2">
            <button onClick={() => setConfirmingDelete(false)} className="flex-1 py-2 rounded-lg bg-ink text-muted text-sm">
              Cancelar
            </button>
            <button onClick={onDelete} className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-semibold">
              Confirmar exclusão
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
