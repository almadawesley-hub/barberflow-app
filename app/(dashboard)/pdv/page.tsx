"use client";

import { useEffect, useState, useCallback } from "react";

type SaleItemT = {
  id: string;
  type: "SERVICE" | "PRODUCT";
  quantity: number;
  unitPrice: number | string;
  service?: { name: string } | null;
  product?: { name: string } | null;
  barberId?: string | null;
};

type Comanda = {
  id: string;
  customer: { id: string; name: string } | null;
  barber: { id: string; name: string } | null;
  items: SaleItemT[];
};

type Service = { id: string; name: string; price: number | string };
type Product = { id: string; name: string; price: number | string; stock: number };
type Customer = { id: string; name: string };
type Barber = { id: string; name: string };

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function comandaTotal(c: Comanda) {
  return c.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
}

export default function PDVPage() {
  const [mode, setMode] = useState<"comandas" | "avulsa">("comandas");
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);

  const loadComandas = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/comandas");
    const json = await res.json();
    setComandas(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadComandas();
    fetch("/api/services").then((r) => r.json()).then((j) => setServices(j.data ?? []));
    fetch("/api/products").then((r) => r.json()).then((j) => setProducts(j.data ?? []));
    fetch("/api/customers").then((r) => r.json()).then((j) => setCustomers(j.data ?? []));
    fetch("/api/barbers").then((r) => r.json()).then((j) => setBarbers(j.data ?? []));
  }, [loadComandas]);

  const active = comandas.find((c) => c.id === activeId) ?? null;

  if (active) {
    return (
      <ComandaDetail
        comanda={active}
        services={services}
        products={products}
        onBack={() => {
          setActiveId(null);
          loadComandas();
        }}
        onChanged={loadComandas}
      />
    );
  }

  return (
    <div className="px-4 pt-2">
      <div className="flex gap-1.5 mb-3">
        <button
          onClick={() => setMode("comandas")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold border border-ink-line ${mode === "comandas" ? "bg-brass text-ink" : "bg-ink-soft text-muted"}`}
        >
          Comandas ({comandas.length})
        </button>
        <button
          onClick={() => setMode("avulsa")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold border border-ink-line ${mode === "avulsa" ? "bg-brass text-ink" : "bg-ink-soft text-muted"}`}
        >
          Venda avulsa
        </button>
      </div>

      {mode === "comandas" && (
        <>
          {loading && <div className="text-center text-muted text-sm py-10">Carregando...</div>}
          {!loading && comandas.length === 0 && (
            <div className="text-center text-muted text-sm py-10">
              Nenhuma comanda aberta. Ela abre sozinha quando um atendimento é iniciado na Agenda.
            </div>
          )}
          <div className="space-y-2">
            {comandas.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className="w-full text-left bg-ink-soft border border-ink-line rounded-xl p-3.5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm">{c.customer?.name ?? "Cliente avulso"}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {c.barber?.name} · {c.items.length} {c.items.length === 1 ? "item" : "itens"}
                    </div>
                  </div>
                  <div className="text-brass font-bold text-sm">R$ {fmt(comandaTotal(c))}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {mode === "avulsa" && (
        <AvulsaSale
          services={services}
          products={products}
          customers={customers}
          barbers={barbers}
          onFinalized={loadComandas}
        />
      )}
    </div>
  );
}

function ComandaDetail({
  comanda,
  services,
  products,
  onBack,
  onChanged,
}: {
  comanda: Comanda;
  services: Service[];
  products: Product[];
  onBack: () => void;
  onChanged: () => void;
}) {
  const [catalogTab, setCatalogTab] = useState<"servicos" | "produtos">("servicos");
  const [method, setMethod] = useState("PIX");
  const [busy, setBusy] = useState(false);
  const total = comandaTotal(comanda);

  async function addItem(type: "SERVICE" | "PRODUCT", refId: string) {
    setBusy(true);
    await fetch(`/api/comandas/${comanda.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, refId, quantity: 1 }),
    });
    setBusy(false);
    onChanged();
  }

  async function changeQty(itemId: string, quantity: number) {
    setBusy(true);
    await fetch(`/api/comandas/${comanda.id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    setBusy(false);
    onChanged();
  }

  async function finalize() {
    setBusy(true);
    const res = await fetch(`/api/comandas/${comanda.id}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method }),
    });
    setBusy(false);
    if (res.ok) onBack();
  }

  return (
    <div className="px-4 pt-2 pb-40">
      <button onClick={onBack} className="text-muted text-sm mb-2">‹ Voltar</button>
      <div className="font-display text-lg font-semibold">{comanda.customer?.name ?? "Comanda"}</div>
      <div className="text-xs text-muted mb-4">Atendido por {comanda.barber?.name}</div>

      <div className="flex gap-1.5 mb-3">
        <button
          onClick={() => setCatalogTab("servicos")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold border border-ink-line ${catalogTab === "servicos" ? "bg-ink text-ivory" : "bg-ink-soft text-muted"}`}
        >
          Serviços
        </button>
        <button
          onClick={() => setCatalogTab("produtos")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold border border-ink-line ${catalogTab === "produtos" ? "bg-ink text-ivory" : "bg-ink-soft text-muted"}`}
        >
          Produtos
        </button>
      </div>

      {catalogTab === "servicos" &&
        services.map((s) => (
          <button
            key={s.id}
            onClick={() => addItem("SERVICE", s.id)}
            disabled={busy}
            className="w-full flex justify-between items-center bg-ink-soft border border-ink-line rounded-lg p-3 mb-1.5 disabled:opacity-50"
          >
            <span className="text-sm">{s.name}</span>
            <span className="text-sm font-semibold text-brass">R$ {Number(s.price)}</span>
          </button>
        ))}
      {catalogTab === "produtos" &&
        products.filter((p) => p.stock > 0).map((p) => (
          <button
            key={p.id}
            onClick={() => addItem("PRODUCT", p.id)}
            disabled={busy}
            className="w-full flex justify-between items-center bg-ink-soft border border-ink-line rounded-lg p-3 mb-1.5 disabled:opacity-50"
          >
            <span className="text-sm">{p.name} <span className="text-muted text-xs">({p.stock} em estoque)</span></span>
            <span className="text-sm font-semibold text-brass">R$ {Number(p.price)}</span>
          </button>
        ))}

      <div className="mt-4 bg-ink-soft border border-ink-line rounded-2xl p-4">
        <div className="text-xs font-bold text-muted mb-2.5">Consumo do cliente</div>
        {comanda.items.map((i) => (
          <div key={i.id} className="flex justify-between items-center py-2 border-b border-ink-line last:border-0">
            <div className="flex-1">
              <div className="text-sm">{i.service?.name ?? i.product?.name}</div>
              <div className="text-xs text-muted">R$ {Number(i.unitPrice)} cada</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => changeQty(i.id, i.quantity - 1)} disabled={busy} className="bg-ink rounded px-2 py-0.5 text-sm">−</button>
              <span className="text-sm w-4 text-center">{i.quantity}</span>
              <button onClick={() => changeQty(i.id, i.quantity + 1)} disabled={busy} className="bg-ink rounded px-2 py-0.5 text-sm">+</button>
            </div>
          </div>
        ))}

        <label className="text-xs font-semibold text-muted block mb-1.5 mt-3">Pagamento</label>
        <div className="flex gap-1.5">
          {[
            { id: "CASH", label: "Dinheiro" },
            { id: "PIX", label: "PIX" },
            { id: "DEBIT", label: "Débito" },
            { id: "CREDIT", label: "Crédito" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-semibold ${method === m.id ? "bg-brass text-ink" : "bg-ink text-muted"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-ink-soft border-t border-ink-line p-4 pb-6">
        <div className="flex justify-between items-baseline mb-2.5">
          <span className="text-sm text-muted">Total da conta</span>
          <span className="font-display text-xl font-semibold text-brass">R$ {fmt(total)}</span>
        </div>
        <button
          onClick={finalize}
          disabled={busy || comanda.items.length === 0}
          className="w-full py-3 rounded-lg bg-brass text-ink font-bold text-sm disabled:opacity-60"
        >
          {busy ? "Processando..." : "Fechar conta"}
        </button>
      </div>
    </div>
  );
}

function AvulsaSale({
  services,
  products,
  customers,
  barbers,
  onFinalized,
}: {
  services: Service[];
  products: Product[];
  customers: Customer[];
  barbers: Barber[];
  onFinalized: () => void;
}) {
  type CartItem = { type: "SERVICE" | "PRODUCT"; refId: string; name: string; price: number; qty: number; barberId: string };

  const [cart, setCart] = useState<CartItem[]>([]);
  const [catalogTab, setCatalogTab] = useState<"servicos" | "produtos">("servicos");
  const [serviceBarberId, setServiceBarberId] = useState(barbers[0]?.id ?? "");
  const [vendedorId, setVendedorId] = useState(barbers[0]?.id ?? "");
  const [customerId, setCustomerId] = useState("");
  const [method, setMethod] = useState("PIX");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (barbers[0]) {
      setServiceBarberId(barbers[0].id);
      setVendedorId(barbers[0].id);
    }
  }, [barbers]);

  function addItem(type: "SERVICE" | "PRODUCT", item: Service | Product) {
    const barberId = type === "SERVICE" ? serviceBarberId : vendedorId;
    setCart((prev) => {
      const existing = prev.find((i) => i.refId === item.id && i.type === type && i.barberId === barberId);
      if (existing) return prev.map((i) => (i === existing ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { type, refId: item.id, name: item.name, price: Number(item.price), qty: 1, barberId }];
    });
  }

  function changeQty(idx: number, delta: number) {
    setCart((prev) =>
      prev.flatMap((i, x) => {
        if (x !== idx) return [i];
        const q = i.qty + delta;
        return q <= 0 ? [] : [{ ...i, qty: q }];
      })
    );
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  async function finalize() {
    setBusy(true);
    await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customerId || undefined,
        method,
        items: cart.map((i) => ({ type: i.type, refId: i.refId, barberId: i.barberId, quantity: i.qty })),
      }),
    });
    setBusy(false);
    setCart([]);
    setCustomerId("");
    onFinalized();
  }

  return (
    <div className="pb-40">
      <div className="flex gap-1.5 mb-3">
        <button
          onClick={() => setCatalogTab("servicos")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold border border-ink-line ${catalogTab === "servicos" ? "bg-ink text-ivory" : "bg-ink-soft text-muted"}`}
        >
          Serviços
        </button>
        <button
          onClick={() => setCatalogTab("produtos")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold border border-ink-line ${catalogTab === "produtos" ? "bg-ink text-ivory" : "bg-ink-soft text-muted"}`}
        >
          Produtos
        </button>
      </div>

      {catalogTab === "servicos" && (
        <>
          <label className="text-xs font-semibold text-muted block mb-1.5">Feito por</label>
          <select
            className="w-full bg-ink-soft border border-ink-line rounded-lg px-3 py-2.5 mb-3 text-ivory text-sm"
            value={serviceBarberId}
            onChange={(e) => setServiceBarberId(e.target.value)}
          >
            {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => addItem("SERVICE", s)}
              className="w-full flex justify-between items-center bg-ink-soft border border-ink-line rounded-lg p-3 mb-1.5"
            >
              <span className="text-sm">{s.name}</span>
              <span className="text-sm font-semibold text-brass">R$ {Number(s.price)}</span>
            </button>
          ))}
        </>
      )}

      {catalogTab === "produtos" && (
        <>
          <label className="text-xs font-semibold text-muted block mb-1.5">Vendido por</label>
          <select
            className="w-full bg-ink-soft border border-ink-line rounded-lg px-3 py-2.5 mb-3 text-ivory text-sm"
            value={vendedorId}
            onChange={(e) => setVendedorId(e.target.value)}
          >
            {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {products.filter((p) => p.stock > 0).map((p) => (
            <button
              key={p.id}
              onClick={() => addItem("PRODUCT", p)}
              className="w-full flex justify-between items-center bg-ink-soft border border-ink-line rounded-lg p-3 mb-1.5"
            >
              <span className="text-sm">{p.name} <span className="text-muted text-xs">({p.stock} em estoque)</span></span>
              <span className="text-sm font-semibold text-brass">R$ {Number(p.price)}</span>
            </button>
          ))}
        </>
      )}

      <div className="mt-4 bg-ink-soft border border-ink-line rounded-2xl p-4">
        <div className="text-xs font-bold text-muted mb-2.5">Carrinho</div>
        {cart.length === 0 && <div className="text-xs text-muted py-2">Toque em um serviço ou produto pra adicionar.</div>}
        {cart.map((i, idx) => (
          <div key={idx} className="py-2 border-b border-ink-line last:border-0">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <div className="text-sm">{i.name}</div>
                <div className="text-xs text-muted">R$ {i.price} cada</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => changeQty(idx, -1)} className="bg-ink rounded px-2 py-0.5 text-sm">−</button>
                <span className="text-sm w-4 text-center">{i.qty}</span>
                <button onClick={() => changeQty(idx, 1)} className="bg-ink rounded px-2 py-0.5 text-sm">+</button>
              </div>
            </div>
            {i.type === "SERVICE" && (
              <div className="text-xs text-muted mt-1">Feito por {barbers.find((b) => b.id === i.barberId)?.name}</div>
            )}
          </div>
        ))}

        {cart.length > 0 && (
          <>
            <label className="text-xs font-semibold text-muted block mb-1.5 mt-3">Cliente (opcional)</label>
            <select
              className="w-full bg-ink border border-ink-line rounded-lg px-3 py-2.5 mb-3 text-ivory text-sm"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Cliente avulso</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <label className="text-xs font-semibold text-muted block mb-1.5">Pagamento</label>
            <div className="flex gap-1.5">
              {[
                { id: "CASH", label: "Dinheiro" },
                { id: "PIX", label: "PIX" },
                { id: "DEBIT", label: "Débito" },
                { id: "CREDIT", label: "Crédito" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-semibold ${method === m.id ? "bg-brass text-ink" : "bg-ink text-muted"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-ink-soft border-t border-ink-line p-4 pb-6">
          <div className="flex justify-between items-baseline mb-2.5">
            <span className="text-sm text-muted">Total</span>
            <span className="font-display text-xl font-semibold text-brass">R$ {fmt(total)}</span>
          </div>
          <button
            onClick={finalize}
            disabled={busy}
            className="w-full py-3 rounded-lg bg-brass text-ink font-bold text-sm disabled:opacity-60"
          >
            {busy ? "Processando..." : "Finalizar venda"}
          </button>
        </div>
      )}
    </div>
  );
}
