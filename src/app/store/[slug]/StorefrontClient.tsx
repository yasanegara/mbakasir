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
  _count?: { saleItems: number; orderItems: number };
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
  themeColor?: string | null;
  bannerUrl?: string | null;
  tenant: {
    id: string;
    name: string;
    logoUrl?: string | null;
    phone?: string | null;
    products: Product[];
  };
}

interface CartItem {
  product: Product;
  quantity: number;
}

type CheckoutStep = "browse" | "cart" | "form" | "success";

export default function StorefrontClient({ slug, domain }: { slug?: string; domain?: string }) {
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

  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  useEffect(() => {
    const query = domain ? `domain=${domain}` : `slug=${slug}`;
    fetch(`/api/public/storefront?${query}`)
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

  const winningProducts = useMemo(() => {
    if (!storefront) return [];
    
    // Helper function to calculate total sold
    const getTotalSold = (p: Product) => (p._count?.saleItems || 0) + (p._count?.orderItems || 0);

    // Sort all products by total sales (offline + online) descending
    return [...storefront.tenant.products]
      .sort((a, b) => getTotalSold(b) - getTotalSold(a))
      .slice(0, 5); // Take top 5
  }, [storefront]);

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
  if (step === "success") {
    const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !orderId) return;

      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      try {
        // 1. Upload file
        const uploadRes = await fetch("/api/upload/proof", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error);

        // 2. Update Order
        const updateRes = await fetch("/api/public/storefront", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            paymentProofUrl: uploadData.url,
            slug
          }),
        });
        if (!updateRes.ok) throw new Error("Gagal mengupdate pesanan");

        setUploadedUrl(uploadData.url);
      } catch (err: any) {
        alert(err.message || "Gagal upload bukti");
      } finally {
        setIsUploading(false);
      }
    };

    return (
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
          
          <div style={{ marginBottom: "24px", padding: "20px", background: "#fafafa", borderRadius: "16px", border: "1px dashed #ddd" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>SUDAH TRANSFER?</div>
            {uploadedUrl ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#16a34a", fontSize: "13px", fontWeight: 600 }}>✅ Bukti transfer terkirim!</span>
                <img src={uploadedUrl} alt="Bukti" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px" }} />
              </div>
            ) : (
              <label style={{ display: "block", cursor: "pointer" }}>
                <div style={{ padding: "10px", background: "white", border: "1px solid #ddd", borderRadius: "10px", fontSize: "13px", fontWeight: 600 }}>
                  {isUploading ? "⏳ Mengunggah..." : "📸 Upload Bukti Transfer"}
                </div>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleProofUpload} disabled={isUploading} />
              </label>
            )}
          </div>

          <p style={{ color: "#888", fontSize: "13px" }}>
            Setelah transfer, hubungi toko untuk konfirmasi pembayaran.
          </p>

          {storefront.tenant.phone && (
            <button
              onClick={() => {
                const waNumber = storefront.tenant.phone!.replace(/\D/g, "").replace(/^0/, "62");
                const msg = `Halo ${storefront.tenant.name}, saya baru saja membuat pesanan dengan rincian berikut:\n\nTotal: ${formatRupiahFull(totalAmount)}\n\nSaya telah mentransfer pembayaran. Tolong segera diproses ya!`;
                window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, "_blank");
              }}
              style={{ marginTop: "16px", display: "block", width: "100%", background: "#25D366", color: "white", border: "none", borderRadius: "10px", padding: "12px 24px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
            >
              💬 Konfirmasi via WhatsApp
            </button>
          )}

          <button
            onClick={() => { setStep("browse"); setOrderId(null); }}
            style={{ marginTop: "12px", width: "100%", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "10px", padding: "12px 24px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
          >
            Belanja Lagi
          </button>
        </div>
      </div>
    );
  }

  const accentColor = storefront.themeColor || "#6366f1";

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        .sf-header {
          background: white;
          position: sticky; top: 0; zIndex: 50;
          border-bottom: 1px solid #f0f0f0;
        }
        .sf-card {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #f0f0f0;
          transition: transform 0.2s;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .sf-card:hover {
          border-color: ${accentColor}50;
        }
        .sf-img-wrapper {
          position: relative;
          width: 100%;
          padding-top: 100%; /* 1:1 Aspect Ratio */
          background: #f8f9fa;
        }
        .sf-img-wrapper img, .sf-img-wrapper .placeholder {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          width: 100%; height: 100%;
          object-fit: cover;
        }
        .sf-title {
          font-size: 13px;
          line-height: 1.4;
          color: #222;
          margin-bottom: 4px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          height: 36px;
        }
        .sf-price {
          font-size: 16px;
          font-weight: 700;
          color: ${accentColor};
        }
        .sf-cat-scroll {
          display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px;
          scrollbar-width: none;
        }
        .sf-cat-scroll::-webkit-scrollbar { display: none; }
        .sf-cat-btn {
          padding: 6px 14px; border-radius: 4px; font-size: 13px; font-weight: 500; 
          cursor: pointer; border: 1px solid transparent; white-space: nowrap;
          background: #f5f5f5; color: #555;
        }
        .sf-search {
          width: 100%; padding: 10px 16px; 
          border: 1px solid ${accentColor}; border-radius: 4px; 
          font-size: 14px; background: #fff;
        }
        .sf-search:focus { outline: none; box-shadow: 0 0 0 2px ${accentColor}20; }
        .sf-add-btn {
          width: 28px; height: 28px; border-radius: 50%;
          background: ${accentColor}; color: white; border: none;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 300; cursor: pointer;
          position: absolute; right: 12px; bottom: 12px;
        }
        .sf-floating-cart {
          position: fixed; bottom: 24px; left: 0; width: 100%; z-index: 100;
          display: flex; justify-content: center; pointer-events: none;
        }
        .sf-floating-cart button {
          pointer-events: auto;
        }
        .sf-qty-control {
          position: absolute; right: 12px; bottom: 12px;
          display: flex; alignItems: center; gap: 8px; background: white;
          border: 1px solid #eee; border-radius: 4px; padding: 2px;
        }
        .sf-qty-btn {
          width: 24px; height: 24px; background: transparent; border: none;
          cursor: pointer; font-weight: bold; color: #555;
        }
        .sf-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px) {
          .sf-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; }
        }
        @media (min-width: 900px) {
          .sf-grid { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>
      
      {/* ── HEADER ── */}
      <header className="sf-header">
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
            {/* Store Banner */}
            {storefront.bannerUrl ? (
              <div style={{ width: "100%", height: "140px", borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
                <img src={storefront.bannerUrl} alt="banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ) : null}

            {/* Search + Categories */}
            <div style={{ background: "white", padding: "16px", borderRadius: "8px", marginBottom: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <input
                type="search"
                placeholder="🔍 Cari di toko ini..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sf-search"
                style={{ marginBottom: "12px" }}
              />
              <div className="sf-cat-scroll">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className="sf-cat-btn"
                    style={{
                      background: selectedCategory === cat ? accentColor : "#f5f5f5",
                      color: selectedCategory === cat ? "white" : "#555",
                      borderColor: selectedCategory === cat ? accentColor : "transparent",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Winning Products (80/20) - Hanya Muncul Jika Tidak Sedang Mencari */}
            {searchQuery === "" && winningProducts.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "20px" }}>🔥</span>
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#111" }}>Produk Paling Laris (80/20)</h2>
                </div>
                <div className="sf-cat-scroll" style={{ paddingBottom: "12px" }}>
                  {winningProducts.map((product) => {
                    const inCart = cart.find((i) => i.product.id === product.id);
                    return (
                      <div key={`win-${product.id}`} className="sf-card" style={{ minWidth: "160px", width: "160px", flexShrink: 0 }}>
                        <div className="sf-img-wrapper">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} loading="lazy" />
                          ) : (
                            <div className="placeholder" style={{ background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>🛍️</div>
                          )}
                          <div style={{ position: "absolute", top: "8px", left: "8px", background: "rgba(239, 68, 68, 0.9)", color: "white", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 800 }}>
                            {(product._count?.saleItems || 0) + (product._count?.orderItems || 0)} Terjual
                          </div>
                        </div>
                        <div style={{ padding: "8px", display: "flex", flexDirection: "column", flex: 1 }}>
                          <div className="sf-title" style={{ fontSize: "12px", height: "34px" }}>{product.name}</div>
                          <div className="sf-price" style={{ fontSize: "14px", marginTop: "4px" }}>{formatRupiahFull(Number(product.price))}</div>
                        </div>
                        {inCart ? (
                          <div className="sf-qty-control" style={{ right: "8px", bottom: "8px" }}>
                            <button onClick={() => updateQty(product.id, inCart.quantity - 1)} className="sf-qty-btn" style={{ width: "20px", height: "20px" }}>−</button>
                            <span style={{ fontSize: "12px", fontWeight: 600 }}>{inCart.quantity}</span>
                            <button onClick={() => addToCart(product)} className="sf-qty-btn" style={{ width: "20px", height: "20px", color: accentColor }}>+</button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(product)} className="sf-add-btn" style={{ right: "8px", bottom: "8px", width: "24px", height: "24px", fontSize: "16px" }}>
                            +
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#888" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📦</div>
                <div>Tidak ada produk ditemukan</div>
              </div>
            ) : (
              <div className="sf-grid">
                {filteredProducts.map((product) => {
                  const inCart = cart.find((i) => i.product.id === product.id);
                  return (
                    <div key={product.id} className="sf-card">
                      <div className="sf-img-wrapper">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} loading="lazy" />
                        ) : (
                          <div className="placeholder" style={{ background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px" }}>🛒</div>
                        )}
                        {product.category && (
                          <div style={{ position: "absolute", bottom: "4px", left: "4px", background: "rgba(0,0,0,0.5)", color: "white", padding: "2px 6px", borderRadius: "2px", fontSize: "10px", fontWeight: 600 }}>
                            {product.category}
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "8px", flex: 1, display: "flex", flexDirection: "column" }}>
                        <div className="sf-title">{product.name}</div>
                        <div style={{ marginTop: "auto" }}>
                          <div className="sf-price">{formatRupiahFull(Number(product.price))}</div>
                        </div>
                      </div>
                      
                      {/* Cart Controls overlay on the bottom right */}
                      {inCart ? (
                        <div className="sf-qty-control">
                          <button onClick={() => updateQty(product.id, inCart.quantity - 1)} className="sf-qty-btn">−</button>
                          <span style={{ fontSize: "13px", fontWeight: 600, minWidth: "16px", textAlign: "center" }}>{inCart.quantity}</span>
                          <button onClick={() => addToCart(product)} className="sf-qty-btn" style={{ color: accentColor }}>+</button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(product)} className="sf-add-btn">
                          +
                        </button>
                      )}
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
        <div className="sf-floating-cart">
          <button
            onClick={() => setStep("cart")}
            className="sf-btn"
            style={{ display: "flex", alignItems: "center", gap: "12px", background: accentColor, color: "white", border: "none", borderRadius: "999px", padding: "16px 32px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: `0 12px 30px ${accentColor}60`, backdropFilter: "blur(8px)" }}
          >
            <span style={{ fontSize: "20px" }}>🛍️</span> 
            <span>Lihat Keranjang ({cartCount})</span>
            <span style={{ opacity: 0.8 }}>·</span>
            <span>{formatRupiahFull(subtotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
