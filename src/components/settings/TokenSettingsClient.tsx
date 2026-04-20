"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { useToast } from "@/contexts/AppProviders";
import {
  type TokenConfigSnapshot,
  type TokenConversionSnapshot,
  formatTokenConversion,
} from "@/lib/token-settings-shared";
import { formatRupiahFull } from "@/lib/utils";

function createEmptyConversion(sortOrder: number): TokenConversionSnapshot {
  return {
    targetKey: `NEW_RULE_${sortOrder + 1}`,
    targetLabel: "Konversi Baru",
    moduleKey: "",
    tokenCost: 1,
    rewardQuantity: 1,
    rewardUnit: "unit",
    description: "",
    isActive: true,
    sortOrder,
  };
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function TokenSettingsClient({
  initialConfig,
}: {
  initialConfig: TokenConfigSnapshot;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [config, setConfig] = useState<TokenConfigSnapshot>(initialConfig);

  const activeConversions = config.conversions.filter((conversion) => conversion.isActive);

  function updateRootField<K extends keyof TokenConfigSnapshot>(
    key: K,
    value: TokenConfigSnapshot[K]
  ) {
    setConfig((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateConversion(
    index: number,
    patch: Partial<TokenConversionSnapshot>
  ) {
    setConfig((current) => ({
      ...current,
      conversions: current.conversions.map((conversion, conversionIndex) =>
        conversionIndex === index ? { ...conversion, ...patch } : conversion
      ),
    }));
  }

  function addConversion() {
    setConfig((current) => ({
      ...current,
      conversions: [
        ...current.conversions,
        createEmptyConversion(current.conversions.length),
      ],
    }));
  }

  function removeConversion(index: number) {
    setConfig((current) => ({
      ...current,
      conversions: current.conversions
        .filter((_, conversionIndex) => conversionIndex !== index)
        .map((conversion, conversionIndex) => ({
          ...conversion,
          sortOrder: conversionIndex,
        })),
    }));
  }

  async function saveSettings() {
    try {
      const payload = {
        ...config,
        tokenName: config.tokenName.trim(),
        tokenSymbol: config.tokenSymbol.trim().toUpperCase(),
        currencyCode: config.currencyCode.trim().toUpperCase(),
        notes: config.notes?.trim() || "",
        conversions: config.conversions.map((conversion, index) => ({
          ...conversion,
          targetKey: normalizeKey(conversion.targetKey),
          targetLabel: conversion.targetLabel.trim(),
          moduleKey: conversion.moduleKey?.trim() || "",
          rewardUnit: conversion.rewardUnit.trim(),
          description: conversion.description?.trim() || "",
          sortOrder: index,
        })),
      };

      const response = await fetch("/api/admin/token-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        toast(data.error || "Gagal menyimpan pengaturan token", "error");
        return;
      }

      setConfig(data.config);
      router.refresh(); // Invalidate NextJS Router Cache
      toast("Pengaturan token berhasil disimpan", "success");
    } catch {
      toast("Terjadi kesalahan jaringan saat menyimpan", "error");
    }
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
        }}
      >
        <div className="stat-card">
          <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
            Token Aktif
          </span>
          <span className="stat-value" style={{ fontSize: "24px" }}>
            {config.tokenSymbol || "TOKEN"}
          </span>
          <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
            {config.tokenName || "Nama token belum diisi"}
          </span>
        </div>

        <div className="stat-card">
          <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
            Harga per Token
          </span>
          <span className="stat-value" style={{ fontSize: "24px" }}>
            {formatRupiahFull(config.pricePerToken)}
          </span>
          <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
            {config.currencyCode}
          </span>
        </div>

        <div className="stat-card">
          <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
            Rule Aktif
          </span>
          <span className="stat-value" style={{ fontSize: "24px" }}>
            {activeConversions.length}
          </span>
          <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
            total {config.conversions.length} konversi
          </span>
        </div>
      </section>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "20px" }}>Master Token</h2>
            <p style={{ marginTop: "6px", color: "hsl(var(--text-secondary))", fontSize: "14px" }}>
              Atur identitas token, harga jual, dan catatan bisnis pusat.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            disabled={isPending}
            onClick={() => startTransition(() => void saveSettings())}
          >
            {isPending ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "18px",
            marginTop: "22px",
          }}
        >
          <div>
            <label className="input-label" htmlFor="token-name">
              Nama Token
            </label>
            <input
              id="token-name"
              className="input-field"
              value={config.tokenName}
              onChange={(event) => updateRootField("tokenName", event.target.value)}
              placeholder="Contoh: SuperToken"
            />
          </div>

          <div>
            <label className="input-label" htmlFor="token-symbol">
              Simbol
            </label>
            <input
              id="token-symbol"
              className="input-field"
              value={config.tokenSymbol}
              onChange={(event) => updateRootField("tokenSymbol", event.target.value.toUpperCase())}
              placeholder="ST"
              maxLength={12}
            />
          </div>

          <div>
            <label className="input-label" htmlFor="currency-code">
              Mata Uang
            </label>
            <input
              id="currency-code"
              className="input-field"
              value={config.currencyCode}
              onChange={(event) => updateRootField("currencyCode", event.target.value.toUpperCase())}
              placeholder="IDR"
              maxLength={6}
            />
          </div>

          <CurrencyInput
            id="price-per-token"
            label="Harga per Token"
            value={config.pricePerToken}
            onChange={(value) => updateRootField("pricePerToken", value)}
            placeholder="6250"
          />
        </div>

        {/* HPP Ratio Slider */}
        <div style={{ marginTop: "18px", padding: "18px", borderRadius: "14px", background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
            <label className="input-label" style={{ margin: 0 }}>Asumsi Biaya Operasional (HPP Ratio)</label>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "22px", fontWeight: 800, color: (config.hppRatio ?? 40) > 60 ? "hsl(0 72% 51%)" : "hsl(var(--primary))" }}>
                {config.hppRatio ?? 40}%
              </span>
              <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>operasional</span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={config.hppRatio ?? 40}
            onChange={(e) => updateRootField("hppRatio", Number(e.target.value))}
            style={{ width: "100%", accentColor: "hsl(var(--primary))", cursor: "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
            <span style={{ fontSize: "11px", color: "hsl(142 70% 45%)", fontWeight: 600 }}>🟢 Profit {100 - (config.hppRatio ?? 40)}%</span>
            <span style={{ fontSize: "11px", color: "hsl(var(--text-muted))" }}>Digunakan di kalkulasi Burn Rate Analytics</span>
            <span style={{ fontSize: "11px", color: "hsl(0 72% 51%)", fontWeight: 600 }}>🔴 Ops {config.hppRatio ?? 40}%</span>
          </div>
        </div>

        <div style={{ marginTop: "18px" }}>
          <label className="input-label" htmlFor="token-notes">
            Catatan Internal
          </label>
          <textarea
            id="token-notes"
            className="input-field"
            value={config.notes || ""}
            onChange={(event) => updateRootField("notes", event.target.value)}
            rows={3}
            placeholder="Contoh: Token dapat digunakan untuk lisensi toko, aktivasi modul, atau kredit layanan."
            style={{ resize: "vertical", minHeight: "96px" }}
          />
        </div>
      </section>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "20px" }}>Aturan Konversi Token</h2>
            <p style={{ marginTop: "6px", color: "hsl(var(--text-secondary))", fontSize: "14px" }}>
              Definisikan token bisa ditukar menjadi apa, termasuk lisensi bulan, modul premium, kredit fitur, atau layanan lain.
            </p>
          </div>

          <button type="button" className="btn btn-ghost" onClick={addConversion}>
            Tambah Rule
          </button>
        </div>

        <div style={{ display: "grid", gap: "18px", marginTop: "22px" }}>
          {config.conversions.map((conversion, index) => (
            <article
              key={conversion.id || `${conversion.targetKey}-${index}`}
              className="card"
              style={{ padding: "18px", background: "hsl(var(--bg-surface))" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: "17px" }}>{conversion.targetLabel || `Rule ${index + 1}`}</h3>
                    <span className={`badge ${conversion.isActive ? "badge-success" : "badge-warning"}`}>
                      {conversion.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <p style={{ marginTop: "6px", fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
                    Preview: {formatTokenConversion(conversion)}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => removeConversion(index)}
                  disabled={config.conversions.length === 1}
                >
                  Hapus
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: "14px",
                  marginTop: "18px",
                }}
              >
                <div>
                  <label className="input-label">Kode Rule</label>
                  <input
                    className="input-field"
                    value={conversion.targetKey}
                    onChange={(event) =>
                      updateConversion(index, { targetKey: normalizeKey(event.target.value) })
                    }
                    placeholder="LICENSE_MONTH"
                  />
                </div>

                <div>
                  <label className="input-label">Nama Konversi</label>
                  <input
                    className="input-field"
                    value={conversion.targetLabel}
                    onChange={(event) =>
                      updateConversion(index, { targetLabel: event.target.value })
                    }
                    placeholder="Bulan Lisensi Toko"
                  />
                </div>

                <div>
                  <label className="input-label">Module Key</label>
                  <input
                    className="input-field"
                    value={conversion.moduleKey || ""}
                    onChange={(event) =>
                      updateConversion(index, { moduleKey: event.target.value.toUpperCase() })
                    }
                    placeholder="CORE_POS"
                  />
                </div>

                <div>
                  <label className="input-label">Token per Bundle</label>
                  <input
                    type="number"
                    min={1}
                    className="input-field"
                    value={conversion.tokenCost}
                    onChange={(event) =>
                      updateConversion(index, {
                        tokenCost: Math.max(1, Number(event.target.value) || 1),
                      })
                    }
                  />
                </div>

                <div>
                  <label className="input-label">Jumlah Reward</label>
                  <input
                    type="number"
                    min={1}
                    className="input-field"
                    value={conversion.rewardQuantity}
                    onChange={(event) =>
                      updateConversion(index, {
                        rewardQuantity: Math.max(1, Number(event.target.value) || 1),
                      })
                    }
                  />
                </div>

                <div>
                  <label className="input-label">Satuan Reward</label>
                  <input
                    className="input-field"
                    value={conversion.rewardUnit}
                    onChange={(event) =>
                      updateConversion(index, { rewardUnit: event.target.value })
                    }
                    placeholder="bulan"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gap: "14px", marginTop: "14px" }}>
                <div>
                  <label className="input-label">Deskripsi</label>
                  <textarea
                    className="input-field"
                    value={conversion.description || ""}
                    onChange={(event) =>
                      updateConversion(index, { description: event.target.value })
                    }
                    rows={2}
                    placeholder="Jelaskan fungsi konversi ini untuk tim operasional."
                    style={{ resize: "vertical", minHeight: "84px" }}
                  />
                </div>

                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "14px",
                    color: "hsl(var(--text-secondary))",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={conversion.isActive}
                    onChange={(event) =>
                      updateConversion(index, { isActive: event.target.checked })
                    }
                  />
                  Rule ini aktif dan boleh dipakai modul/aplikasi
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 style={{ fontSize: "18px" }}>Preview Operasional</h2>
        <p style={{ marginTop: "6px", color: "hsl(var(--text-secondary))", fontSize: "14px" }}>
          Ringkasan ini membantu memastikan setiap rule terbaca jelas sebelum dipakai agent atau modul lain.
        </p>

        <div style={{ display: "grid", gap: "12px", marginTop: "18px" }}>
          {config.conversions.map((conversion, index) => (
            <div
              key={`preview-${conversion.id || index}`}
              style={{
                padding: "14px 16px",
                borderRadius: "12px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--bg-surface))",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{conversion.targetLabel || conversion.targetKey}</div>
                  <div style={{ marginTop: "4px", fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
                    {conversion.moduleKey || "GLOBAL"} • {conversion.targetKey}
                  </div>
                </div>
                <span className={`badge ${conversion.isActive ? "badge-success" : "badge-warning"}`}>
                  {conversion.isActive ? "Aktif" : "Nonaktif"}
                </span>
              </div>

              <div style={{ marginTop: "10px", fontSize: "14px", color: "hsl(var(--text-primary))" }}>
                {conversion.tokenCost} token bisa ditukar menjadi {conversion.rewardQuantity}{" "}
                {conversion.rewardUnit}.
              </div>

              <div style={{ marginTop: "6px", fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                Nilai jual per token saat ini: {formatRupiahFull(config.pricePerToken)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
