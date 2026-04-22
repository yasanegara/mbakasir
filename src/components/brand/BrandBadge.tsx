import type { CSSProperties } from "react";

type BrandBadgeProps = {
  logoUrl?: string | null;
  alt: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  imageStyle?: CSSProperties;
};

const DEFAULT_LOGO_URL = "/brand/mbakasir-logo.svg";

export default function BrandBadge({
  logoUrl,
  alt,
  size = 48,
  className,
  style,
  imageStyle,
}: BrandBadgeProps) {
  const radius = Math.max(12, Math.round(size * 0.28));

  return (
    <div
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${radius}px`,
        background: "linear-gradient(180deg, #ffffff 0%, #f4efe8 100%)",
        border: "1px solid rgba(17, 17, 17, 0.08)",
        boxShadow: "0 14px 30px rgba(17, 17, 17, 0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
        ...style,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl || DEFAULT_LOGO_URL}
        alt={alt}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          ...imageStyle,
        }}
      />
    </div>
  );
}
