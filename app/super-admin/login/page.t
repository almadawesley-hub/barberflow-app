"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("platform", { email, password, redirect: false });

    setLoading(false);
    if (result?.error) {
      setError("Credenciais inválidas.");
      return;
    }
    router.push("/super-admin");
  }

  return (
    <div className="min-h-screen bg-ink text-ivory font-sans flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-xl font-semibold">BarberFlow</div>
          <div className="text-xs text-muted mt-1 tracking-widest uppercase">Painel da plataforma</div>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="text-xs font-semibold text-muted block mb-1.5">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-ink-soft border border-ink-line rounded-lg px-3 py-2.5 mb-4 text-ivory text-sm"
            required
          />

          <label className="text-xs font-semibold text-muted block mb-1.5">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-ink-soft border border-ink-line rounded-lg px-3 py-2.5 mb-4 text-ivory text-sm"
            required
          />

          {error && <div className="text-sm text-red-400 mb-4">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brass text-ink font-bold rounded-lg py-3 text-sm disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
