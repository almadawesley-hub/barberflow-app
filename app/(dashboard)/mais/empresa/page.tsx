"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Company = {
  name: string;
  document: string | null;
  logoUrl: string | null;
  monthlyGoal: number | string;
};

export default function EmpresaPage() {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [monthlyGoal, setMonthlyGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/company");
    const json = await res.json();
    setCompany(json.data);
    setName(json.data?.name ?? "");
    setDocument(json.data?.document ?? "");
    setMonthlyGoal(json.data?.monthlyGoal ? String(json.data.monthlyGoal) : "8000");
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
      body: JSON.stringify({ name, document: document || undefined, monthlyGoal: Number(monthlyGoal) || undefined }),
    });
    setSubmitting(false);
    setSaved(true);
    load();
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/company/logo", { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setUploadError(j?.error?.message ?? "Não foi possível enviar a imagem.");
      return;
    }
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

      <label className={label}>Logo</label>
      <div className="flex items-center gap-3 mb-4">
        <img
          src={company.logoUrl || "/logo.png"}
          alt="Logo"
          className="w-16 h-16 rounded-lg object-cover border border-ink-line"
        />
        <label className="flex-1 text-center py-2.5 rounded-lg border border-dashed border-brass/60 text-brass text-sm font-semibold cursor-pointer">
          {uploading ? "Enviando..." : "Trocar imagem"}
          <input type="file" accept="image/*" onChange={handleLogoChange} disabled={uploading} className="hidden" />
        </label>
      </div>
      {uploadError && <div className="text-xs text-red-400 mb-3">{uploadError}</div>}

      <label className={label}>Nome da barbearia</label>
      <input className={field} value={name} onChange={(e) => setName(e.target.value)} />

      <label className={label}>CNPJ / Documento</label>
      <input className={field} value={document} onChange={(e) => setDocument(e.target.value)} />

      <label className={label}>Meta mensal de faturamento (R$)</label>
      <input type="number" className={field} value={monthlyGoal} onChange={(e) => setMonthlyGoal(e.target.value)} />

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
