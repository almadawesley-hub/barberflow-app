"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "RECEPTIONIST" | "BARBER";
  commissionPercent: number | string | null;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  RECEPTIONIST: "Recepcionista",
  BARBER: "Barbeiro",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error(`/api/users respondeu ${res.status}`);
      const json = await res.json();
      setUsers(json.data ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro desconhecido ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    setEditing(null);
    load();
  }

  return (
    <div className="px-4 pt-2">
      <button onClick={() => router.back()} className="text-muted text-sm mb-3">‹ Voltar</button>
      <div className="font-display text-lg font-semibold mb-4">Usuários</div>

      {loading && <div className="text-center text-muted text-sm py-10">Carregando...</div>}
      {loadError && (
        <div className="text-center text-red-400 text-xs py-4 border border-red-500/40 rounded-lg mb-3">
          Erro ao carregar: {loadError}
        </div>
      )}

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 bg-ink-soft border border-ink-line rounded-xl p-3">
            <div className="w-9 h-9 rounded-full bg-ink flex items-center justify-center text-xs font-bold text-brass flex-shrink-0">
              {initials(u.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{u.name}</div>
              <div className="text-xs text-muted">{u.email}</div>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-ink text-muted flex-shrink-0">
              {ROLE_LABEL[u.role] ?? u.role}
            </span>
            <button onClick={() => setEditing(u)} className="text-muted px-1">✎</button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowNew(true)}
        className="w-full mt-3 py-2.5 rounded-lg border border-dashed border-brass/60 text-brass text-sm font-semibold"
      >
        + Novo usuário
      </button>

      {showNew && (
        <Sheet title="Novo usuário" onClose={() => setShowNew(false)}>
          <UserForm
            onSaved={() => {
              setShowNew(false);
              load();
            }}
          />
        </Sheet>
      )}

      {editing && (
        <Sheet title="Editar usuário" onClose={() => setEditing(null)}>
          <UserForm
            user={editing}
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

function UserForm({ user, onSaved, onDelete }: { user?: User; onSaved: () => void; onDelete?: () => void }) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<User["role"]>(user?.role ?? "RECEPTIONIST");
  const [commission, setCommission] = useState(user?.commissionPercent ? String(user.commissionPercent) : "40");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const field = "w-full bg-ink border border-ink-line rounded-lg px-3 py-2.5 mb-3 text-ivory text-sm";
  const label = "text-xs font-semibold text-muted block mb-1.5";

  async function submit() {
    setSubmitting(true);
    setError(null);
    const body: Record<string, unknown> = { name, email, role };
    if (role === "BARBER") body.commissionPercent = Number(commission);
    if (password) body.password = password;

    const res = user
      ? await fetch(`/api/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, password: password || "trocar123" }),
        });

    setSubmitting(false);
    if (!res.ok) {
      setError("Não foi possível salvar. Confira se o e-mail já está em uso.");
      return;
    }
    onSaved();
  }

  return (
    <div>
      <label className={label}>Nome</label>
      <input className={field} value={name} onChange={(e) => setName(e.target.value)} />

      <label className={label}>E-mail</label>
      <input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />

      <label className={label}>Papel</label>
      <select className={field} value={role} onChange={(e) => setRole(e.target.value as User["role"])}>
        <option value="ADMIN">Administrador</option>
        <option value="RECEPTIONIST">Recepcionista</option>
        <option value="BARBER">Barbeiro</option>
      </select>

      {role === "BARBER" && (
        <>
          <label className={label}>Comissão padrão (%)</label>
          <input type="number" className={field} value={commission} onChange={(e) => setCommission(e.target.value)} />
        </>
      )}

      <label className={label}>{user ? "Nova senha (opcional)" : "Senha inicial"}</label>
      <input
        type="password"
        className={field}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={user ? "Deixe em branco pra manter a atual" : "Mínimo 6 caracteres"}
      />

      {error && <div className="text-xs text-red-400 mb-3">{error}</div>}

      <button
        onClick={submit}
        disabled={submitting || !name.trim() || !email.trim() || (!user && password.length < 6)}
        className="w-full bg-brass text-ink font-bold rounded-lg py-3 text-sm disabled:opacity-60 mt-1"
      >
        {submitting ? "Salvando..." : user ? "Salvar alterações" : "Salvar usuário"}
      </button>

      {onDelete && !confirmingDelete && (
        <button onClick={() => setConfirmingDelete(true)} className="w-full text-red-400 text-sm mt-3 py-2">
          Excluir usuário
        </button>
      )}
      {onDelete && confirmingDelete && (
        <div className="mt-3 text-center">
          <div className="text-xs text-muted mb-2">Tem certeza?</div>
          <div className="flex gap-2">
            <button onClick={() => setConfirmingDelete(false)} className="flex-1 py-2 rounded-lg bg-ink text-muted text-sm">
              Cancelar
            </button>
            <button onClick={onDelete} className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-semibold">
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
