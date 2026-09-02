"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen bg-ink font-sans flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 rounded-3xl overflow-hidden border border-ink-line lg:border-0">
        {/* Painel esquerdo — só aparece em telas grandes */}
        <div className="hidden lg:flex relative flex-col justify-between p-10 overflow-hidden bg-ink">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/login-bg.jpg')" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, rgba(27,24,21,0.97) 0%, rgba(27,24,21,0.88) 45%, rgba(27,24,21,0.55) 100%)",
            }}
          />

          <div className="relative z-10">
            <img src="/logo-mark.png" alt="BarberFlow" className="w-16 h-16 mb-4 object-contain" />
            <div className="font-display text-2xl font-semibold tracking-wide">
              BARBER<span className="text-brass">FLOW</span>
            </div>
            <div className="text-xs text-muted tracking-[0.2em] mt-3 uppercase">
              Gestão completa para sua barbearia
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-3">
            <FeatureBadge label="Relatórios e métricas em tempo real" />
            <FeatureBadge label="Agenda inteligente e organizada" />
            <FeatureBadge label="Clientes fiéis, mais resultados" />
          </div>
        </div>

        {/* Painel direito — formulário */}
        <div className="bg-ink-soft flex items-center justify-center p-7 lg:p-12">
          <div className="w-full max-w-sm">
            <div className="flex flex-col items-center text-center mb-7">
              <div className="w-12 h-12 rounded-full border border-brass/50 flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C79A54" strokeWidth="2">
                  <path d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3z" />
                  <path d="M9.5 12.5 11 14l3.5-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="font-display text-xl font-semibold">Bem-vindo de volta!</h1>
              <p className="text-sm text-muted mt-1">Faça login para acessar sua barbearia</p>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="text-xs font-semibold text-muted block mb-1.5">E-mail</label>
              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 6-10 7L2 6" />
                  </svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-ink border border-ink-line rounded-lg pl-9 pr-3 py-2.5 text-ivory text-sm"
                  required
                />
              </div>

              <label className="text-xs font-semibold text-muted block mb-1.5">Senha</label>
              <div className="relative mb-5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-ink border border-ink-line rounded-lg pl-9 pr-9 py-2.5 text-ivory text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.5 18.5 0 0 1 5-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="m1 1 22 22" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {error && <div className="text-sm text-red-400 mb-4">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full font-bold rounded-lg py-3 text-ink disabled:opacity-60 transition-transform active:scale-[0.99]"
                style={{ background: "linear-gradient(135deg, #D9AE68, #B7873F)" }}
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className="text-center text-[11px] text-muted mt-8">
              © {new Date().getFullYear()} BarberFlow. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureBadge({ label }: { label: string }) {
  return (
    <div className="text-center">
      <div className="w-9 h-9 mx-auto rounded-full border border-ink-line flex items-center justify-center mb-2 bg-ink-soft/60">
        <span className="w-1.5 h-1.5 rounded-full bg-brass" />
      </div>
      <div className="text-[10px] text-muted leading-tight">{label}</div>
    </div>
  );
}
