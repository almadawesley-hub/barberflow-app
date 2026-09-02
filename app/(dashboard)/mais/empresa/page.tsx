"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Company = {
  name: string;
  document: string | null;
  logoUrl: string | null;
};

export default function EmpresaPage() {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/company");
    const json = await res.json();
    setCompany(json.data);
    setName(json.data?.name ?? "");
    setDocument(json.data?.document ?? "");
    setLogoUrl(json.data?.logoUrl ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    setSubmitting(true);
    setSaved(false);
    await fetch("/api/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, document: document || undefined, logoUrl: logoUrl || undefined }),
    });
    setSubmitting(false);
    setSaved(true);
    load();
  }

  if (loading || !company) {
    return <div className="px-4 pt-6 text-center text-muted text-sm">Carregando...</div>;
  }

  const field = "w-full bg-ink-soft border border-ink-line rounded-lg px-3 py-2.5 mb-3 text-ivory text-sm";
  const label = "text-xs font-semibold text-muted block mb-1.5";

  return (
    <div className="px-4 pt-2">
      <button onClick={() => router.back()} className="text-muted text-sm mb-3">‹ Voltar</button>
      <div className="font-display text-lg font-semibold mb-4">Dados da empresa</div>

      <label className={label}>Nome da barbearia</label>
      <input className={field} value={name} onChange={(e) => setName(e.target.value)} />

      <label className={label}>CNPJ / Documento</label>
      <input className={field} value={document} onChange={(e) => setDocument(e.target.value)} />

      <label className={label}>URL do logo (opcional)</label>
      <input className={field} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />

      {saved && <div className="text-xs text-sage mb-3">Alterações salvas.</div>}

      <button
        onClick={submit}
        disabled={submitting || !name.trim()}
        className="w-full bg-brass text-ink font-bold rounded-lg py-3 text-sm disabled:opacity-60"
      >
        {submitting ? "Salvando..." : "Salvar alterações"}
      </button>
    </div>
  );
}
