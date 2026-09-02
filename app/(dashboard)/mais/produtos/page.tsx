"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  costPrice: number | string;
  price: number | string;
  stock: number;
  minStock: number;
};

export default function ProdutosPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const isBarbeiro = role === "BARBER";
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/products");
    const json = await res.json();
    setProducts(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function adjustStock(id: string, delta: number) {
    await fetch(`/api/products/${id}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta, type: delta < 0 ? "ajuste" : "entrada" }),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setEditing(null);
    load();
  }

  return (
    <div className="px-4 pt-2">
      <button onClick={() => router.back()} className="text-muted text-sm mb-3">‹ Voltar</button>
      <div className="font-display text-lg font-semibold mb-4">
        {isBarbeiro ? "Dar baixa em produtos" : "Produtos & Estoque"}
      </div>

      {loading && <div className="text-center text-muted text-sm py-10">Carregando...</div>}

      <div className="space-y-2">
        {products.map((p) => {
          const out = p.stock === 0;
          const low = p.stock > 0 && p.stock <= p.minStock;
          return (
            <div key={p.id} className="bg-ink-soft border border-ink-line rounded-xl p-3.5">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs text-muted">{p.sku} · R$ {Number(p.price)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {out && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-red-500 text-red-400">Esgotado</span>}
                  {low && !out && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-amber-500 text-amber-400">Baixo</span>}
                  {!isBarbeiro && (
                    <button onClick={() => setEditing(p)} className="text-muted px-1">✎</button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2.5">
                <span className="text-xs text-muted">{p.stock} unidades</span>
                <div className="flex gap-1.5">
                  <button onClick={() => adjustStock(p.id, -1)} disabled={p.stock === 0} className="bg-ink rounded-md px-2.5 py-1 text-sm disabled:opacity-40">−</button>
                  {!isBarbeiro && <button onClick={() => adjustStock(p.id, 1)} className="bg-ink rounded-md px-2.5 py-1 text-sm">+</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isBarbeiro && (
        <button
          onClick={() => setShowNew(true)}
          className="w-full mt-3 py-2.5 rounded-lg border border-dashed border-brass/60 text-brass text-sm font-semibold"
        >
          + Novo produto
        </button>
      )}

      {showNew && (
        <Sheet title="Novo produto" onClose={() => setShowNew(false)}>
          <ProductForm
            onSaved={() => {
              setShowNew(false);
              load();
            }}
          />
        </Sheet>
      )}

      {editing && (
        <Sheet title="Editar produto" onClose={() => setEditing(null)}>
          <ProductForm
            product={editing}
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

function ProductForm({ product, onSaved, onDelete }: { product?: Product; onSaved: () => void; onDelete?: () => void }) {
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [cost, setCost] = useState(product ? String(product.costPrice ?? "") : "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "");
  const [minStock, setMinStock] = useState(product ? String(product.minStock) : "5");
  const [submitting, setSubmitting] = useState(false);

  const field = "w-full bg-ink border border-ink-line rounded-lg px-3 py-2.5 mb-3 text-ivory text-sm";
  const label = "text-xs font-semibold text-muted block mb-1.5";

  async function submit() {
    setSubmitting(true);
    const body = { name, sku: sku || undefined, costPrice: Number(cost) || 0, price: Number(price), minStock: Number(minStock) || 5 };
    if (product) {
      await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, stock: Number(stock) || 0 }),
      });
    }
    setSubmitting(false);
    onSaved();
  }

  return (
    <div>
      <label className={label}>Nome</label>
      <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Cera modeladora" />

      <label className={label}>SKU</label>
      
