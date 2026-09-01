"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", { email, password, redirect: false });

    setLoading(false);
    if (result?.error) {
      setError("E-mail ou senha incorretos.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-7 font-sans">
      <div className="text-center mb-8">
        <div className="font-display text-2xl font-semibold">BarberFlow</div>
        <div className="text-sm text-muted mt-1">Gestão completa para sua barbearia</div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-sm w-full mx-auto">
        <label className="text-xs font-semibold text-muted block mb-1.5">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-ink-soft border border-ink-line rounded-lg px-3 py-2.5 mb-3 text-ivory"
          required
        />

        <label className="text-xs font-semibold text-muted block mb-1.5">Senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-ink-soft border border-ink-line rounded-lg px-3 py-2.5 mb-4 text-ivory"
          required
        />

        {error && <div className="text-sm text-red-400 mb-3">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brass text-ink font-bold rounded-lg py-3 disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
