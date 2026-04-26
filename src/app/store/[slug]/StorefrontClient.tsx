"use client";

import { useState, useEffect, useMemo } from "react";
import { formatRupiahFull } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  category?: string | null;
  stock: number;
  unit: string;
}

interface StorefrontData {
  id: string;
  slug: string;
  description?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankAccountName?: string | null;
  allowShipping: boolean;
  shippingCost: number;
  tenant: {
    id: string;
    name: string;
    logoUrl?: string | null;
    products: Product[];
  };
}

interface CartItem {
  product: Product;
  quantity: number;
}

type CheckoutStep = "browse" | "cart" | "form" | "success";

export default function StorefrontClient({ slug }: { slug: string }) {
  const [storefront, setStorefront] = useState<StorefrontData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<CheckoutStep>("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    notes: "",
  });

  useEffect(() => {
    fetch(`/api/public/storefront?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setStorefront(data.storefront);
      })
      .catch(() => setError("Gagal memuat toko"))
      .finally(() => setLoading(false));
  }, [slug]);

  const categories = useMemo(() => {
    if (!storefront) return [];
    const cats = Array.from(new Set(storefront.tenant.products.map((p) => p.category || "Lainnya")));
    return ["Semua", ...cats.sort()];
  }, [storefront]);

  const filteredProducts = useMemo(() => {
    if (!storefront) return [];
    return storefront.tenant.products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "Semua" || (p.category || "Lainnya") === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [storefront, searchQuery, selectedCategory]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) setCart((prev) => prev.filter((i) => i.product.id !== productId));
    else setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
  const shippingCost = storefront?.allowShipping ? Number(storefront.shippingCost) : 0;
  const totalAmount = subtotal + shippingCost;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storefront) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/public/storefront", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: storefront.slug,
          ...form,
          items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrderId(data.orderId);
      setStep("success");
      setCart([]);
    } catch (err: any) {
      alert(err.message || "Gagal mengirim pesanan");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fa" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>🛍️</div>
        <div style={{ color: "#888", fontSize: "14px" }}>Memuat toko...</div>
      </div>
    </div>
  );

  if (error || !storefront) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fa" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚫</div>
        <h2 style={{ margin: "0 0 8px", color: "#333" }}>Toko Tidak Ditemukan</h2>
        <p style={{ color: "#888", fontSize: "14px" }}>{error || "Toko tidak aktif atau tidak ada."}</p>
      </div>
    </div>
  );

  // === SUCCESS SCREEN ===
  if (step === "success") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "white", borderRadius: "20px", padding: "40px", maxWidth: "440px", width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>✅</div>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#16a34a", marginBottom: "8px" }}>Pesanan Berhasil!</h2>
        <p style={{ color: "#555", fontSize: "14px", lineHeight: 1.6, marginBottom: "24px" }}>
          Pesanan Anda telah diterima. Silakan transfer ke rekening berikut:
        </p>
        {storefront.bankAccountNo && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px", marginBottom: "20px", textAlign: "left" }}>
            <div style={{ fontSize: "12px", color: "#16a34a", fontWeight: 700, marginBottom: "8px" }}>INFO PEMBAYARAN</div>
            <div style={{ fontWeight: 700, fontSize: "16px" }}>{storefront.bankAccountNo}</div>
            <div style={{ color: "#555", fontSize: "13px", marginTop: "2px" }}>{storefront.bankName} — a.n. {storefront.bankAccountName}</div>
            <div style={{ marginTop: "8px", fontWeight: 700, color: "#16a34a", fontSize: "18px" }}>
              {formatRupiahFull(totalAmount)}
            </div>
          </div>
        )}
        <p style={{ color: "#888", fontSize: "13px" }}>
          Setelah transfer, hubungi toko untuk konfirmasi pembayaran.
        </p>
        <button
          onClick={() => { setStep("browse"); setOrderId(null); }}
          style={{ marginTop: "20px", background: "#16a34a", color: "white", border: "none", borderRadius: "10px", padding: "12px 24px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
        >
          Belanja Lagi
        </button>
      </div>
    </div>
  );

  const accentColor = "#6366f1";

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fb", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* ── HEADER ── */}
      <header style={{ background: "white", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {storefront.tenant.logoUrl && (
              <img src={storefront.tenant.logoUrl} alt="logo" style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover" }} />
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: "16px", color: "#111" }}>{storefront.tenant.name}</div>
              {storefront.description && <div style={{ fontSize: "12px", color: "#888" }}>{storefront.description}</div>}
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setStep(step === "cart" ? "browse" : "cart")}
              style={{ background: accentColor, color: "white", border: "none", borderRadius: "10px", padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
            >
              🛒 {cartCount} item · {formatRupiahFull(subtotal)}
            </button>
          )}
        </div>
      </header>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px" }}>

        {/* ── CART VIEW ── */}
        {step === "cart" && (
          <div>
            <button onClick={() => setStep("browse")} style={{ background: "none", border: "none", cursor: "pointer", color: accentColor, fontWeight: 600, marginBottom: "16px", fontSize: "14px" }}>
              ← Lanjut Belanja
            </button>
            <div style={{ background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
              <div style={{ padding: "20px", borderBottom: "1px solid #f0f0f0" }}>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>Keranjang Belanja</h2>
              </div>
              <div style={{ padding: "20px", display: "grid", gap: "12px" }}>
                {cart.map((item) => (
                  <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "14px" }}>{item.product.name}</div>
                      <div style={{ fontSize: "13px", color: "#888" }}>{formatRupiahFull(Number(item.product.price))} / {item.product.unit}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button onClick={() => updateQty(item.product.id, item.quantity - 1)} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontWeight: 700 }}>−</button>
                      <span style={{ fontWeight: 700, minWidth: "20px", textAlign: "center" }}>{item.quantity}</span>
                      <button onClick={() => updateQty(item.product.id, item.quantity + 1)} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: accentColor, color: "white", cursor: "pointer", fontWeight: 700 }}>+</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "16px 20px", borderTop: "1px solid #f0f0f0", background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                  <span>Subtotal</span><span>{formatRupiahFull(subtotal)}</span>
                </div>
                {storefront.allowShipping && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                    <span>Ongkir</span><span>{formatRupiahFull(shippingCost)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "16px", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #e5e7eb" }}>
                  <span>Total</span><span style={{ color: accentColor }}>{formatRupiahFull(totalAmount)}</span>
                </div>
              </div>
              <div style={{ padding: "16px 20px" }}>
                <button
                  onClick={() => setStep("form")}
                  style={{ width: "100%", background: accentColor, color: "white", border: "none", borderRadius: "12px", padding: "14px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}
                >
                  Lanjut ke Pemesanan →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CHECKOUT FORM ── */}
        {step === "form" && (
          <div>
            <button onClick={() => setStep("cart")} style={{ background: "none", border: "none", cursor: "pointer", color: accentColor, fontWeight: 600, marginBottom: "16px", fontSize: "14px" }}>
              ← Kembali ke Keranjang
            </button>
            <div style={{ background: "white", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div style={{ padding: "20px", borderBottom: "1px solid #f0f0f0" }}>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>Detail Pengiriman</h2>
              </div>
              <form onSubmit={handleCheckout} style={{ padding: "20px", display: "grid", gap: "16px" }}>
                {[
                  { key: "customerName", label: "Nama Lengkap", placeholder: "Nama penerima", type: "text" },
                  { key: "customerPhone", label: "No. HP / WhatsApp", placeholder: "08xxxxxxxxxx", type: "tel" },
                  { key: "customerAddress", label: "Alamat Pengiriman", placeholder: "Jl. ..., Kelurahan, Kota", type: "textarea" },
                  { key: "notes", label: "Catatan (opsional)", placeholder: "Misal: tolong kirim pagi hari", type: "textarea" },
                ].map((field) => (
                  <div key={field.key}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "#374151" }}>{field.label}</label>
                    {field.type === "textarea" ? (
                      <textarea
                        placeholder={field.placeholder}
                        value={(form as any)[field.key]}
                        onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                        required={field.key !== "notes"}
                        rows={3}
                        style={{ width: "100%", padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", resize: "vertical", boxSizing: "border-box" }}
                      />
                    ) : (
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={(form as any)[field.key]}
                        onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                        required
                        style={{ width: "100%", padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box" }}
                      />
                    )}
                  </div>
                ))}

                {/* Ringkasan */}
                <div style={{ background: "#f8f9fb", borderRadius: "12px", padding: "16px", border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#888", marginBottom: "10px" }}>RINGKASAN PESANAN</div>
                  {cart.map((item) => (
                    <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                      <span>{item.product.name} ×{item.quantity}</span>
                      <span>{formatRupiahFull(Number(item.product.price) * item.quantity)}</span>
                    </div>
                  ))}
                  {storefront.allowShipping && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginTop: "6px", color: "#888" }}>
                    <span>Ongkir</span><span>{formatRupiahFull(shippingCost)}</span>
                  </div>}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "15px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #e5e7eb" }}>
                    <span>Total</span><span style={{ color: accentColor }}>{formatRupiahFull(totalAmount)}</span>
                  </div>
                </div>

                {storefront.bankAccountNo && (
                  <div style={{ background: "#eff6ff", borderRadius: "12px", padding: "14px", border: "1px solid #bfdbfe" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#1d4ed8", marginBottom: "6px" }}>💳 TRANSFER KE REKENING</div>
                    <div style={{ fontWeight: 700, fontSize: "15px" }}>{storefront.bankAccountNo}</div>
                    <div style={{ fontSize: "13px", color: "#555" }}>{storefront.bankName} — a.n. {storefront.bankAccountName}</div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ background: isSubmitting ? "#a5b4fc" : accentColor, color: "white", border: "none", borderRadius: "12px", padding: "14px", fontWeight: 700, fontSize: "15px", cursor: isSubmitting ? "not-allowed" : "pointer" }}
                >
                  {isSubmitting ? "Mengirim Pesanan..." : "Kirim Pesanan 🚀"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── BROWSE PRODUCTS ── */}
        {step === "browse" && (
          <div>
            {/* Search + Filter */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
              <input
                type="search"
                placeholder="🔍 Cari produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, minWidth: "200px", padding: "10px 16px", border: "1px solid #e5e7eb", borderRadius: "12px", fontSize: "14px", background: "white" }}
              />
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: "8px 14px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none",
                      background: selectedCategory === cat ? accentColor : "white",
                      color: selectedCategory === cat ? "white" : "#555",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#888" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📦</div>
                <div>Tidak ada produk ditemukan</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
                {filteredProducts.map((product) => {
                  const inCart = cart.find((i) => i.product.id === product.id);
                  return (
                    <div
                      key={product.id}
                      style={{ background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", transition: "transform 0.2s", cursor: "pointer" }}
                    >
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "160px", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "120px", background: "linear-gradient(135deg, #e0e7ff, #c7d2fe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px" }}>🛍️</div>
                      )}
                      <div style={{ padding: "14px" }}>
                        {product.category && <div style={{ fontSize: "11px", color: "#888", fontWeight: 600, marginBottom: "4px", textTransform: "uppercase" }}>{product.category}</div>}
                        <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "6px", lineHeight: 1.3 }}>{product.name}</div>
                        <div style={{ fontWeight: 800, color: accentColor, fontSize: "15px", marginBottom: "12px" }}>{formatRupiahFull(Number(product.price))}</div>
                        {inCart ? (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <button onClick={() => updateQty(product.id, inCart.quantity - 1)} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontWeight: 700 }}>−</button>
                            <span style={{ fontWeight: 700 }}>{inCart.quantity}</span>
                            <button onClick={() => addToCart(product)} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "none", background: accentColor, color: "white", cursor: "pointer", fontWeight: 700 }}>+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            style={{ width: "100%", background: accentColor, color: "white", border: "none", borderRadius: "10px", padding: "9px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
                          >
                            + Keranjang
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {step === "browse" && cart.length > 0 && (
        <div style={{ position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 100 }}>
          <button
            onClick={() => setStep("cart")}
            style={{ background: accentColor, color: "white", border: "none", borderRadius: "999px", padding: "14px 28px", fontWeight: 700, fontSize: "15px", cursor: "pointer", boxShadow: "0 8px 30px rgba(99,102,241,0.4)" }}
          >
            🛒 Lihat Keranjang ({cartCount}) · {formatRupiahFull(subtotal)}
          </button>
        </div>
      )}
    </div>
  );
}
