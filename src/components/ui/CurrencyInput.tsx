"use client";

import { useRef, useEffect, forwardRef } from "react";
import { formatWhileTyping, parseRupiah } from "@/lib/utils";

// ============================================================
// CURRENCY INPUT COMPONENT
// Lead UI/UX: Real-time thousand separator (titik) saat diketik
// Contoh: user ketik "150000" → tampil "150.000"
// ============================================================

interface CurrencyInputProps {
  id?: string;
  label?: string;
  value: number; // nilai aktual dalam Rupiah (integer)
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string;
  prefix?: string; // default: "Rp"
  className?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput(
    {
      id,
      label,
      value,
      onChange,
      placeholder = "0",
      disabled = false,
      readOnly = false,
      error,
      prefix = "Rp",
      className = "",
      autoFocus = false,
      onEnter,
    },
    ref
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const resolvedRef = (ref as React.RefObject<HTMLInputElement>) || inputRef;

    // Sync display saat value berubah dari luar (misal: reset form)
    useEffect(() => {
      const el = resolvedRef.current;
      if (!el) return;
      const displayVal = value === 0 ? "" : formatWhileTyping(String(value));
      // Hanya update jika berbeda untuk menghindari cursor jump
      if (el.value !== displayVal) {
        el.value = displayVal;
      }
    }, [value, resolvedRef]);

    function handleInput(e: React.FormEvent<HTMLInputElement>) {
      const raw = e.currentTarget.value;
      const numericOnly = raw.replace(/\D/g, "");

      if (!numericOnly) {
        e.currentTarget.value = "";
        onChange(0);
        return;
      }

      const parsed = parseInt(numericOnly, 10);
      const formatted = parsed.toLocaleString("id-ID");

      // Simpan posisi cursor untuk dipertahankan
      const selStart = e.currentTarget.selectionStart ?? formatted.length;
      const oldLen = e.currentTarget.value.length;
      const newLen = formatted.length;
      const diff = newLen - oldLen;

      e.currentTarget.value = formatted;

      // Pindahkan cursor ke posisi yang tepat
      const newCursor = Math.max(0, selStart + diff);
      e.currentTarget.setSelectionRange(newCursor, newCursor);

      onChange(parsed);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Enter" && onEnter) {
        e.preventDefault();
        onEnter();
      }
    }

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
      // Pilih semua teks saat focus untuk kemudahan edit
      e.currentTarget.select();
    }

    const hasError = Boolean(error);

    return (
      <div className={`currency-input-wrapper ${className}`}>
        {label && (
          <label htmlFor={id} className="input-label">
            {label}
          </label>
        )}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* Prefix "Rp" */}
          <span
            style={{
              position: "absolute",
              left: "14px",
              fontSize: "14px",
              fontWeight: 600,
              color: "hsl(var(--text-muted))",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {prefix}
          </span>

          <input
            ref={resolvedRef}
            id={id}
            type="text"
            inputMode="numeric"
            pattern="[0-9.]*"
            defaultValue={value === 0 ? "" : formatWhileTyping(String(value))}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            autoComplete="off"
            className={`input-field${hasError ? " input-error" : ""}`}
            style={{
              paddingLeft: prefix ? "42px" : "14px",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 600,
              fontSize: "16px",
              letterSpacing: "0.02em",
            }}
            aria-label={label ?? "Nominal Rupiah"}
            aria-invalid={hasError}
          />
        </div>

        {error && (
          <p
            style={{
              marginTop: "4px",
              fontSize: "12px",
              color: "hsl(var(--error))",
              fontWeight: 500,
            }}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

export { CurrencyInput, parseRupiah };
